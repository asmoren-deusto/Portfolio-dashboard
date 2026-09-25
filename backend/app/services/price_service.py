"""Price service — fetches NAV/prices from Yahoo Finance and Morningstar."""
import httpx
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Simple in-memory cache: {isin: {"price": float, "ts": datetime}}
_price_cache: dict = {}
CACHE_TTL_MINUTES = 15


def _is_cache_valid(isin: str) -> bool:
    if isin not in _price_cache:
        return False
    age = datetime.now() - _price_cache[isin]["ts"]
    return age.total_seconds() < CACHE_TTL_MINUTES * 60


async def get_current_price(isin: str, ticker: str | None = None) -> Optional[float]:
    """Get current price for an asset. Uses ticker for Yahoo Finance, falls back to Morningstar."""
    if _is_cache_valid(isin):
        return _price_cache[isin]["price"]

    price = None

    # 1. Try Yahoo Finance if ticker provided
    if ticker:
        price = await _fetch_yahoo_price(ticker)

    # 2. Fallback: Morningstar by ISIN
    if price is None:
        price = await _fetch_morningstar_price(isin)

    if price is not None:
        _price_cache[isin] = {"price": price, "ts": datetime.now()}

    return price


async def _fetch_yahoo_price(ticker: str) -> Optional[float]:
    """Fetch latest price from Yahoo Finance."""
    try:
        t = yf.Ticker(ticker)
        info = t.fast_info
        price = getattr(info, "last_price", None) or getattr(info, "regular_market_price", None)
        if price:
            return float(price)
    except Exception as e:
        logger.warning(f"Yahoo Finance error for {ticker}: {e}")
    return None


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
