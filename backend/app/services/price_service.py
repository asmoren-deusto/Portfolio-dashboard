"""Price service — fetches NAV/prices from Yahoo Finance, FT, Azvalor, Indexa Capital and Morningstar."""
import asyncio
import re
import csv
import httpx
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)

import sys
from pathlib import Path

# Ensure backend root is in sys.path if invoked from parent directory
_backend_dir = str(Path(__file__).resolve().parent.parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

try:
    from app.models import PriceCache, Transaction
    from app.database import SessionLocal
except ImportError:
    PriceCache, Transaction, SessionLocal = None, None, None

# Simple in-memory cache: {isin: {"price": float, "date": Optional[str], "ts": datetime}}
_price_cache: dict = {}
CACHE_TTL_MINUTES = 15


def _is_cache_valid(isin: str) -> bool:
    if isin not in _price_cache:
        return False
    age = datetime.now() - _price_cache[isin]["ts"]
    return age.total_seconds() < CACHE_TTL_MINUTES * 60


KNOWN_TICKERS: dict[str, str] = {
    "IE00BYX5NX33": "0P0001CLDK.F",  # Fidelity MSCI World Index Fund EUR P Acc
    "LU1598719752": "0P0001A94B.F",  # Cobas Lux SICAV - Cobas International Fund P EUR Acc
    "LU0996182563": "0P00012PP6.F",  # Amundi Index MSCI World AE-C
    "IE00BYX5M476": "0P0001CJGK.F",  # Fidelity MSCI Emerging Markets Index Fund EUR P Acc
    "IE00BYX5NH74": "0P0001CJGR.F",  # Fidelity MSCI Japan Index Fund EUR P Acc
    "IE000ZYRH0Q7": "0P0001XF40.F",  # iShares Developed World Index (IE) S Acc EUR
    "IE00BM95B621": "0P0001LT4H.F",  # Polar Capital Global Technology Fund R Acc
    "LU1623762843": "0P0001FE3K.F",  # Carmignac Portfolio Credit A EUR Acc
    "LU2145461757": "0P0001XYYU.F",  # Robeco Capital Growth - Robeco Smart Energy D EUR
    "LU0302296495": "0P00009PQ4.F",  # DNB Fund - Technology A EUR Acc
}


async def get_price_with_date(
    isin: str,
    ticker: str | None = None,
    db = None,
    force: bool = False,
) -> tuple[Optional[float], Optional[str]]:
    """
    Get current NAV and date for an asset dynamically.
    Order of precedence:
      1. In-memory cache (if valid within 15 min TTL and not forced)
      2. Indexa Capital official website (for EPSV 0192#0011 / 0192...)
      3. Direct Official Gestora Website (e.g. Azvalor official website for ES011261...)
      4. Financial Times Markets (official European institutional fund tearsheet feed)
      5. Live fetch from Quefondos (Spanish distributor fund page)
      6. Live fetch from Yahoo Finance (using ticker)
      7. Database PriceCache fallback (cached historical NAV)
      8. Morningstar public search
    """
    ticker = KNOWN_TICKERS.get(isin) or ticker
    if not force and _is_cache_valid(isin):
        return _price_cache[isin]["price"], _price_cache[isin].get("date")

    price = None
    price_date = None

    # Check if this is an Indexa EPSV (e.g. 0192#0011)
    if isin.startswith("0192") or isin == "0192#0011":
        price, price_date = await _fetch_indexa_epsv_official(isin, db=db)

    # For other non-standard ISINs (e.g. Kutxabank 0201G), look up DB PriceCache
    is_standard_isin = len(isin) == 12 and isin.isalnum()
    if price is None and not is_standard_isin and db is not None and PriceCache is not None:
        try:
            entry = db.query(PriceCache).filter(PriceCache.isin == isin).order_by(PriceCache.date.desc()).first()
            if entry and entry.price > 0:
                _price_cache[isin] = {"price": entry.price, "date": entry.date, "ts": datetime.now()}
                return entry.price, entry.date
        except Exception as e:
            logger.warning(f"Error querying PriceCache for non-standard ISIN {isin}: {e}")

    # 1. Try Direct Official Gestora (Azvalor website)
    if price is None and isin.startswith("ES011261"):
        price, price_date = await _fetch_azvalor_official(isin)

    # 2. Try European fund providers (Financial Times, Quefondos, Yahoo Finance) in parallel
    if price is None and is_standard_isin:
        tasks = [_fetch_ft_official(isin), _fetch_quefondos_price(isin)]
        if ticker:
            tasks.append(_fetch_yahoo_price(ticker))

        results = await asyncio.gather(*tasks, return_exceptions=True)
        ft_res = results[0] if len(results) > 0 and not isinstance(results[0], Exception) else (None, None)
        qf_res = results[1] if len(results) > 1 and not isinstance(results[1], Exception) else (None, None)
        yf_res = results[2] if len(results) > 2 and not isinstance(results[2], Exception) else (None, None)

        ft_price, ft_date = ft_res
        qf_price, qf_date = qf_res
        yf_price, yf_date = yf_res

        # Candidates with (date, decimal_precision_priority, price, source)
        # Date is strictly priority #1: freshest/most recent liquidation date always wins immediately!
        candidates = []
        if yf_price is not None and yf_date:
            candidates.append((yf_date, 4, yf_price, "yahoo"))
        if qf_price is not None and qf_date:
            candidates.append((qf_date, 4, qf_price, "quefondos"))
        if ft_price is not None and ft_date:
            candidates.append((ft_date, 2, ft_price, "ft"))

        if candidates:
            # Sort by: 1. Date descending (most recent date wins first, ensuring earliest NAV)
            #          2. Precision descending (tie-breaker for same date)
            candidates.sort(key=lambda c: (c[0], c[1]), reverse=True)
            best_date, _, best_price, _ = candidates[0]
            price, price_date = best_price, best_date

    # If successfully fetched from live provider, persist to DB PriceCache & in-memory cache
    if price is not None and db is not None and PriceCache is not None:
        try:
            target_date = price_date or datetime.now().strftime("%Y-%m-%d")
            existing = db.query(PriceCache).filter(PriceCache.isin == isin, PriceCache.date == target_date).first()
            if existing:
                # Do not downgrade high-precision NAV (4 decimals) with a rounded quote (2 decimals)
                existing_str = f"{existing.price:.6f}".rstrip("0")
                new_str = f"{price:.6f}".rstrip("0")
                existing_decs = len(existing_str.split(".")[1]) if "." in existing_str else 0
                new_decs = len(new_str.split(".")[1]) if "." in new_str else 0
                is_same_quote = (abs(existing.price - price) / price < 0.005) if price > 0 else True
                if is_same_quote and existing_decs > new_decs:
                    price = existing.price
                else:
                    existing.price = price
            else:
                db.add(PriceCache(isin=isin, date=target_date, price=price, currency="EUR", source="live"))
            db.commit()
        except Exception as e:
            logger.warning(f"Error persisting live price for {isin}: {e}")

    # 5. Fallback to DB PriceCache if live fetch failed
    if price is None and db is not None and PriceCache is not None:
        try:
            entry = db.query(PriceCache).filter(PriceCache.isin == isin).order_by(PriceCache.date.desc()).first()
            if entry and entry.price > 0:
                price = entry.price
                price_date = entry.date
        except Exception as e:
            logger.warning(f"Error querying PriceCache fallback for {isin}: {e}")

    # 6. Fallback: Morningstar by ISIN
    if price is None:
        price = await _fetch_morningstar_price(isin)
        if price:
            price_date = datetime.now().strftime("%Y-%m-%d")

    if price is not None:
        _price_cache[isin] = {"price": price, "date": price_date, "ts": datetime.now()}

    return price, price_date



async def get_current_price(isin: str, ticker: str | None = None, db = None, force: bool = False) -> Optional[float]:
    """Get current price for an asset (float only)."""
    price, _ = await get_price_with_date(isin, ticker, db=db, force=force)
    return price


async def _fetch_indexa_epsv_official(isin: str, db=None) -> tuple[Optional[float], Optional[str]]:
    """
    Fetch official NAV and date directly from Indexa Capital website:
    https://indexacapital.com/es/esp/stats/download?stat=epsv

    Indexa provides daily official indexes for EPSV portfolios (1 to 10).
    For 'Indexa Más Rentabilidad Acciones EPSV' (ISIN 0192#0011 / 01920011),
    it tracks 100% Cartera 10 (Acciones). With inception index 100.00 = 10.00 EUR NAV,
    NAV = Cartera 10 index / 10.0.
    """
    try:
        url = "https://indexacapital.com/es/esp/stats/download?stat=epsv"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                logger.warning(f"Indexa EPSV request returned status {resp.status_code}")
                return None, None

            text = resp.text.lstrip('\ufeff')
            lines = text.splitlines()
            reader = csv.reader(lines, delimiter=';')
            header = next(reader, None)

            # Determine column index: Cartera 10 for Acciones, Cartera 1 for Bonos
            col_idx = 10
            if header:
                for idx, h in enumerate(header):
                    if "10" in h:
                        col_idx = idx
                        break

            rows = list(reader)
            for r in reversed(rows):
                if r and len(r) > col_idx and r[0].strip() and r[col_idx].strip():
                    date_str = r[0].strip()
                    val_str = r[col_idx].strip().replace(',', '.')
                    try:
                        raw_val = float(val_str)
                        if raw_val > 0:
                            nav = round(raw_val / 10.0, 4)
                            # Persist recent history to DB PriceCache if db available
                            if db is not None:
                                try:
                                    from app.models import PriceCache
                                    for sub_r in rows[-30:]:
                                        if sub_r and len(sub_r) > col_idx and sub_r[0].strip() and sub_r[col_idx].strip():
                                            s_dt = sub_r[0].strip()
                                            s_val = float(sub_r[col_idx].strip().replace(',', '.')) / 10.0
                                            existing = db.query(PriceCache).filter(PriceCache.isin == isin, PriceCache.date == s_dt).first()
                                            if not existing:
                                                db.add(PriceCache(isin=isin, date=s_dt, price=round(s_val, 4), currency="EUR", source="live_indexa"))
                                    db.commit()
                                except Exception as e:
                                    logger.warning(f"Error persisting Indexa recent points to PriceCache: {e}")
                            return nav, date_str
                    except ValueError:
                        continue
    except Exception as e:
        logger.warning(f"Error fetching official EPSV price from Indexa Capital: {e}")
    return None, None


async def _fetch_indexa_epsv_history(isin: str, period: str = "1y", db=None) -> list[dict]:
    """
    Fetch historical NAVs directly from Indexa Capital official EPSV dataset.
    """
    try:
        url = "https://indexacapital.com/es/esp/stats/download?stat=epsv"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                return []

            text = resp.text.lstrip('\ufeff')
            lines = text.splitlines()
            reader = csv.reader(lines, delimiter=';')
            header = next(reader, None)

            col_idx = 10
            if header:
                for idx, h in enumerate(header):
                    if "10" in h:
                        col_idx = idx
                        break

            cutoff_date = None
            now = datetime.now()
            if period in ["1m", "1mo"]:
                cutoff_date = (now - timedelta(days=30)).strftime("%Y-%m-%d")
            elif period in ["3m", "3mo"]:
                cutoff_date = (now - timedelta(days=90)).strftime("%Y-%m-%d")
            elif period in ["6m", "6mo"]:
                cutoff_date = (now - timedelta(days=180)).strftime("%Y-%m-%d")
            elif period in ["1y", "12mo"]:
                cutoff_date = (now - timedelta(days=365)).strftime("%Y-%m-%d")
            elif period in ["2y"]:
                cutoff_date = (now - timedelta(days=730)).strftime("%Y-%m-%d")
            elif period in ["3y"]:
                cutoff_date = (now - timedelta(days=365*3)).strftime("%Y-%m-%d")
            elif period in ["5y"]:
                cutoff_date = (now - timedelta(days=365*5)).strftime("%Y-%m-%d")
            elif period == "ytd":
                cutoff_date = f"{now.year}-01-01"

            history = []
            for r in reader:
                if r and len(r) > col_idx and r[0].strip() and r[col_idx].strip():
                    d_str = r[0].strip()
                    if cutoff_date and d_str < cutoff_date:
                        continue
                    val_str = r[col_idx].strip().replace(',', '.')
                    try:
                        raw_val = float(val_str)
                        if raw_val > 0:
                            history.append({"date": d_str, "price": round(raw_val / 10.0, 4)})
                    except ValueError:
                        continue
            return history
    except Exception as e:
        logger.warning(f"Error fetching Indexa EPSV history: {e}")
        return []


async def _fetch_azvalor_official(isin: str) -> tuple[Optional[float], Optional[str]]:
    """Fetch official NAV and date directly from Azvalor website (azvalor.com/valores-liquidativos/)."""
    fund_keywords = {
        "ES0112611001": "internacional",
        "ES0112609005": "iberia",
        "ES0112612009": "capital",
        "ES0112613007": "blue chips",
        "ES0112614005": "managers",
    }
    kw = fund_keywords.get(isin)
    if not kw and not isin.startswith("ES011261"):
        return None, None
    kw = kw or "internacional"

    try:
        url = "https://www.azvalor.com/valores-liquidativos/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                rows = re.findall(
                    r'<td[^>]*class=[\'"]nombre[\'"][^>]*>\s*([^<]+?)\s*</td>\s*<td[^>]*>\s*(\d{2}/\d{2}/\d{4})\s*</td>\s*<td[^>]*>\s*([\d\.,]+)',
                    resp.text,
                )
                for name, d_str, p_str in rows:
                    if kw in name.lower():
                        dt = datetime.strptime(d_str, "%d/%m/%Y").strftime("%Y-%m-%d")
                        clean_p = p_str.replace(".", "").replace(",", ".") if ("," in p_str and "." in p_str) else p_str.replace(",", ".")
                        return float(clean_p), dt
    except Exception as e:
        logger.warning(f"Azvalor official scraping error for {isin}: {e}")
    return None, None


async def _fetch_ft_official(isin: str) -> tuple[Optional[float], Optional[str]]:
    """
    Fetch latest official NAV and date from Financial Times Markets fund tearsheets.
    FT receives direct daily NAV feeds reported by European fund managers (Fidelity, Blackrock, DNB, etc.).
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    for url in [
        f"https://markets.ft.com/data/funds/tearsheet/summary?s={isin}:EUR",
        f"https://markets.ft.com/data/funds/tearsheet/summary?s={isin}",
    ]:
        try:
            async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200 and "mod-ui-data-list__value" in resp.text:
                    p_match = re.search(r'class="mod-ui-data-list__value">([0-9\.,]+)</span>', resp.text)
                    d_match = re.search(r'as of ([A-Za-z]+ \d{1,2} \d{4})', resp.text)
                    if p_match:
                        price = float(p_match.group(1).replace(",", ""))
                        date_str = None
                        if d_match:
                            try:
                                date_str = datetime.strptime(d_match.group(1), "%b %d %Y").strftime("%Y-%m-%d")
                            except Exception:
                                date_str = None
                        return price, date_str
        except Exception as e:
            logger.warning(f"Financial Times tearsheet error for {isin} ({url}): {e}")
    return None, None


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


_history_cache: dict[str, tuple[datetime, list[dict]]] = {}


async def get_price_history(
    isin: str,
    ticker: str | None = None,
    period: str = "1y",
) -> list[dict]:
    """
    Get historical prices for charting.
    Returns list of {"date": "YYYY-MM-DD", "price": float}
    """
    ticker = KNOWN_TICKERS.get(isin) or ticker
    cache_key = f"{isin}:{ticker}:{period}"
    if cache_key in _history_cache:
        ts, cached_data = _history_cache[cache_key]
        if (datetime.now() - ts).total_seconds() < 1800:
            return cached_data

    # 0. If it's an Indexa EPSV, fetch official daily history directly from Indexa Capital
    if isin.startswith("0192") or isin == "0192#0011":
        indexa_hist = await _fetch_indexa_epsv_history(isin, period=period)
        if indexa_hist:
            _history_cache[cache_key] = (datetime.now(), indexa_hist)
            return indexa_hist

    # 1. Try Yahoo Finance (works for stocks, ETFs and European funds)
    if ticker:
        try:
            yf_period = "max" if period == "all" else period
            t = yf.Ticker(ticker)
            hist = t.history(period=yf_period)
            if not hist.empty and len(hist) > 1:
                res = [
                    {"date": str(idx.date()), "price": round(float(row["Close"]), 4)}
                    for idx, row in hist.iterrows()
                    if float(row["Close"]) > 0
                ]
                if res:
                    _history_cache[cache_key] = (datetime.now(), res)
                    return res
        except Exception as e:
            logger.debug(f"Yahoo history error for {ticker}: {e}")

    # 2. Check PriceCache & Transactions in DB for authentic historical records
    try:
        from app.database import SessionLocal
        from app.models import PriceCache, Transaction
        db = SessionLocal()
        try:
            points_dict = {}
            # Real execution prices from transactions (excluding traspasos which carry historical fiscal base costs)
            txs = db.query(Transaction).filter(Transaction.isin == isin).order_by(Transaction.date.asc()).all()
            for tx in txs:
                is_traspaso = "traspaso" in (tx.notes or "").lower() or "coste fiscal" in (tx.notes or "").lower()
                if is_traspaso:
                    continue
                p = tx.price or (tx.amount / tx.shares if tx.shares > 0 else 0)
                if p > 0:
                    d_str = str(tx.date)[:10]
                    points_dict[d_str] = round(float(p), 4)

            # Real historical NAVs stored in PriceCache
            cached_rows = db.query(PriceCache).filter(PriceCache.isin == isin).order_by(PriceCache.date.asc()).all()
            for row in cached_rows:
                if row.price and row.price > 0:
                    points_dict[row.date] = round(float(row.price), 4)

            # Latest live price
            current, current_date = await get_price_with_date(isin, ticker, db=db)
            if current and current > 0:
                t_date = current_date or datetime.now().strftime("%Y-%m-%d")
                points_dict[t_date] = round(float(current), 4)

            if points_dict:
                sorted_pts = [{"date": d, "price": p} for d, p in sorted(points_dict.items())]
                _history_cache[cache_key] = (datetime.now(), sorted_pts)
                return sorted_pts
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Error querying historical records for {isin}: {e}")

    # Fallback to single latest known price without synthetic random generation
    current = await get_current_price(isin, ticker)
    if current and current > 0:
        return [{"date": datetime.now().strftime("%Y-%m-%d"), "price": round(float(current), 4)}]

    return []
