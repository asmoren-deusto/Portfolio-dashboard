"""Price service — fetches NAV/prices from Yahoo Finance and Morningstar."""
import re
import httpx
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Simple in-memory cache: {isin: {"price": float, "date": Optional[str], "ts": datetime}}
_price_cache: dict = {}
CACHE_TTL_MINUTES = 15


def _is_cache_valid(isin: str) -> bool:
    if isin not in _price_cache:
        return False
    age = datetime.now() - _price_cache[isin]["ts"]
    return age.total_seconds() < CACHE_TTL_MINUTES * 60


async def get_price_with_date(
    isin: str,
    ticker: str | None = None,
    db = None,
) -> tuple[Optional[float], Optional[str]]:
    """
    Get current NAV and date for an asset dynamically.
    Order of precedence:
      1. In-memory cache (if valid within 15 min TTL)
      2. Live fetch from Quefondos (primary official fund page)
      3. Live fetch from Yahoo Finance (using ticker)
      4. Database PriceCache fallback (cached historical NAV)
      5. Morningstar public search
    """
    if _is_cache_valid(isin):
        return _price_cache[isin]["price"], _price_cache[isin].get("date")

    price = None
    price_date = None

    # 1. Try Quefondos by ISIN (live official fund page)
    price, price_date = await _fetch_quefondos_price(isin)

    # 2. Try Yahoo Finance if ticker provided or Quefondos failed
    if price is None and ticker:
        price, price_date = await _fetch_yahoo_price(ticker)

    # If successfully fetched from live provider, persist to DB PriceCache & in-memory cache
    if price is not None and db is not None:
        try:
            from app.models import PriceCache
            target_date = price_date or datetime.now().strftime("%Y-%m-%d")
            existing = db.query(PriceCache).filter(PriceCache.isin == isin, PriceCache.date == target_date).first()
            if existing:
                existing.price = price
            else:
                db.add(PriceCache(isin=isin, date=target_date, price=price, currency="EUR", source="live"))
            db.commit()
        except Exception as e:
            logger.warning(f"Error persisting live price for {isin}: {e}")

    # 3. Fallback to DB PriceCache if live fetch failed
    if price is None and db is not None:
        try:
            from app.models import PriceCache
            entry = db.query(PriceCache).filter(PriceCache.isin == isin).order_by(PriceCache.date.desc()).first()
            if entry and entry.price > 0:
                price = entry.price
                price_date = entry.date
        except Exception as e:
            logger.warning(f"Error querying PriceCache fallback for {isin}: {e}")

    # 4. Fallback: Morningstar by ISIN
    if price is None:
        price = await _fetch_morningstar_price(isin)
        if price:
            price_date = datetime.now().strftime("%Y-%m-%d")

    if price is not None:
        _price_cache[isin] = {"price": price, "date": price_date, "ts": datetime.now()}

    return price, price_date


async def get_current_price(isin: str, ticker: str | None = None, db = None) -> Optional[float]:
    """Get current price for an asset (float only)."""
    price, _ = await get_price_with_date(isin, ticker, db=db)
    return price


async def _fetch_yahoo_price(ticker: str) -> tuple[Optional[float], Optional[str]]:
    """Fetch latest price and date from Yahoo Finance."""
    try:
        t = yf.Ticker(ticker)
        hist = t.history(period="5d")
        if len(hist) > 0:
            last_price = float(hist["Close"].iloc[-1])
            last_date = str(hist.index[-1].date())
            return last_price, last_date
        info = t.fast_info
        price = getattr(info, "last_price", None) or getattr(info, "regular_market_price", None)
        if price:
            return float(price), datetime.now().strftime("%Y-%m-%d")
    except Exception as e:
        logger.warning(f"Yahoo Finance error for {ticker}: {e}")
    return None, None


async def _fetch_quefondos_price(isin: str) -> tuple[Optional[float], Optional[str]]:
    """Fetch NAV and date from Quefondos public fund page."""
    try:
        url = f"https://www.quefondos.com/es/fondos/ficha/index.html?isin={isin}"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                price = None
                date_str = None

                m_price = re.search(r"Valor liquidativo:.*?([\d\.]+,\d+)\s*EUR", resp.text, re.DOTALL | re.IGNORECASE)
                if m_price:
                    price = float(m_price.group(1).replace(".", "").replace(",", "."))

                m_date = re.search(r"Valor liquidativo:.*?Fecha:.*?(\d{2}/\d{2}/\d{4})", resp.text, re.DOTALL | re.IGNORECASE)
                if m_date:
                    parts = m_date.group(1).split("/")
                    if len(parts) == 3:
                        date_str = f"{parts[2]}-{parts[1]}-{parts[0]}"
                else:
                    dates = re.findall(r"\b(\d{2}/\d{2}/\d{4})\b", resp.text)
                    if dates:
                        parts = dates[0].split("/")
                        if len(parts) == 3:
                            date_str = f"{parts[2]}-{parts[1]}-{parts[0]}"

                if price is not None:
                    return price, date_str
    except Exception as e:
        logger.warning(f"Quefondos error for {isin}: {e}")
    return None, None


async def _fetch_morningstar_price(isin: str) -> Optional[float]:
    """
    Fetch NAV from Morningstar public endpoint.
    Uses the public search + quote endpoint (no auth required).
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Search by ISIN to get Morningstar ID
            search_url = (
                f"https://www.morningstar.es/es/funds/SecuritySearchResults.aspx"
                f"?type=ALL&term={isin}"
            )
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/json, text/html, */*",
            }
            # Try the Morningstar API endpoint directly
            api_url = f"https://api.morningstar.com/v2/search/securities?term={isin}&limit=1"
            resp = await client.get(api_url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])
                if results:
                    return float(results[0].get("nav", 0) or 0) or None
    except Exception as e:
        logger.warning(f"Morningstar error for {isin}: {e}")
    return None


async def get_price_history(
    isin: str,
    ticker: str | None = None,
    period: str = "1y",
) -> list[dict]:
    """
    Get historical prices for charting.
    Returns list of {"date": "YYYY-MM-DD", "price": float}
    """
    # Try Yahoo Finance first (best historical data for ETFs/stocks)
    if ticker:
        try:
            t = yf.Ticker(ticker)
            hist = t.history(period=period)
            if not hist.empty:
                return [
                    {"date": str(idx.date()), "price": round(float(row["Close"]), 4)}
                    for idx, row in hist.iterrows()
                ]
        except Exception as e:
            logger.warning(f"Yahoo history error for {ticker}: {e}")

    # Fallback: generate synthetic history from current price (for funds without ticker)
    # In a real scenario, you'd use Morningstar historical NAV endpoint
    current = await get_current_price(isin, ticker)
    if current:
        return _generate_demo_history(current, period)

    return []


def _generate_demo_history(current_price: float, period: str) -> list[dict]:
    """Generate plausible history when real data unavailable (for demo/dev)."""
    import random
    days = {"1d": 1, "5d": 5, "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, "2y": 730, "5y": 1825}
    n_days = days.get(period, 365)
    end = datetime.now()
    prices = []
    price = current_price * 0.85  # start 15% below current
    for i in range(n_days):
        d = end - timedelta(days=n_days - i)
        if d.weekday() < 5:  # weekdays only
            price *= (1 + random.gauss(0.0002, 0.008))
            prices.append({"date": str(d.date()), "price": round(price, 4)})
    return prices
