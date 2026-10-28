"""Price service — fetches NAV/prices from Yahoo Finance, FT, Azvalor, Indexa Capital and Morningstar."""
import asyncio
import re
import csv
import httpx
import urllib.request
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
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

try:
    from app.models import PriceCache, Transaction
    from app.database import SessionLocal
except ImportError:
    PriceCache, Transaction, SessionLocal = None, None, None

# Simple in-memory cache: {isin: {"price": float, "date": Optional[str], "ts": datetime}}
_price_cache: dict = {}
CACHE_TTL_MINUTES = 15
# Per-source timeout (seconds) so one slow/blocked website never stalls a refresh
SOURCE_TIMEOUT_SEC = 12
# Minimum gap between two forced external scrapes of the same fund
SCRAPE_THROTTLE_SEC = 300
# Max plausible daily move for a mutual fund NAV vs last known NAV (rejects bad scrapes)
MAX_NAV_JUMP = 0.15
_last_scrape: dict[str, datetime] = {}


def _is_cache_valid(isin: str, ttl_minutes: int = CACHE_TTL_MINUTES) -> bool:
    if isin not in _price_cache:
        return False
    age = datetime.now() - _price_cache[isin]["ts"]
    return age.total_seconds() < ttl_minutes * 60


def is_nav_current(latest_date: Optional[str]) -> bool:
    """
    True when `latest_date` is already the newest NAV that can possibly be published right now,
    so scraping external sources again would be pointless.
      - NAV dated today            -> current.
      - NAV older than T-1          -> stale (must scrape).
      - NAV == T-1 (expected date)  -> current until 17:00 on business days, when same-day NAVs
                                       (dated T) may start being published.
    """
    if not latest_date:
        return False
    from datetime import date as _date
    from app.services.market_calendar import get_expected_nav_date, is_market_business_day
    today = _date.today()
    if latest_date >= today.strftime("%Y-%m-%d"):
        return True
    if latest_date < get_expected_nav_date(today):
        return False
    if not is_market_business_day(today):
        return True
    return datetime.now().hour < 17


def _recently_scraped(isin: str) -> bool:
    ts = _last_scrape.get(isin)
    return bool(ts and (datetime.now() - ts).total_seconds() < SCRAPE_THROTTLE_SEC)


async def _with_timeout(coro, seconds: int = SOURCE_TIMEOUT_SEC):
    try:
        return await asyncio.wait_for(coro, timeout=seconds)
    except Exception as e:
        return e


def preload_price_cache_from_db():
    """
    Pre-populate the in-memory _price_cache with the latest prices already stored in PriceCache.
    This guarantees that on server startup, initial price retrieval is instantaneous (<5ms)
    without needing to execute synchronous/asynchronous web scrapes against external sites.
    """
    try:
        from app.database import SessionLocal
        from app.models import PriceCache
        db = SessionLocal()
        rows = db.query(PriceCache).order_by(PriceCache.date.desc()).all()
        loaded = 0
        for r in rows:
            if r.isin and (r.isin == "TR_TRANSFER" or r.isin.startswith("TR_")):
                continue
            if r.isin and r.price is not None and r.price > 0 and r.isin not in _price_cache:
                _price_cache[r.isin] = {
                    "price": float(r.price),
                    "date": r.date,
                    "ts": datetime.now()
                }
                loaded += 1
        db.close()
        logger.info(f"Preloaded {loaded} assets from SQLite PriceCache table into memory cache.")
    except Exception as e:
        logger.warning(f"Error preloading price cache from DB: {e}")


KNOWN_TICKERS: dict[str, str] = {
    "0192#0011": "0P0001FTQ7.F",  # Indexa Más Rentabilidad Acciones EPSV (Morningstar: 0P0001FTQ7)
    "01920011": "0P0001FTQ7.F",
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
    "IE000QAZP7L2": "0P0001XF3Z.F",  # iShares Emerging Markets Index (IE) S Acc EUR
    "LU0261952682": "0P00006DA4.F",  # Fidelity Euro 50 Index Fund A-ACC-EUR
    "IE00B4ND3602": "PPFB.DE",  # iShares Physical Gold ETC (Lang & Schwarz / Xetra)
    "IE0032126645": "0P00000SUJ.F",  # Vanguard U.S. 500 Stock Index Fund EUR Acc
}


def get_previous_business_date() -> str:
    """Return the most recent completed market business date (skipping weekends and TARGET2 holidays)."""
    from app.services.market_calendar import get_expected_nav_date
    return get_expected_nav_date()


def _normalize_business_date(d_str: str) -> str:
    """Normalize any weekend date to the preceding Friday (funds do not liquidate on weekends)."""
    try:
        dt = datetime.strptime(d_str, "%Y-%m-%d").date()
        if dt.weekday() == 5:  # Saturday -> Friday
            return (dt - timedelta(days=1)).strftime("%Y-%m-%d")
        elif dt.weekday() == 6:  # Sunday -> Friday
            return (dt - timedelta(days=2)).strftime("%Y-%m-%d")
    except Exception:
        pass
    return d_str


def _map_morningstar_to_indexa_date(ms_date_str: str) -> str:
    """
    Morningstar publishes EPSV valuations under market trade date T (e.g. Monday 26-10),
    whereas Indexa Capital settles and dates them on the next business day T+1 (e.g. Tuesday 27-10).
    Maps Morningstar date T to Indexa's official business date T+1 (skipping weekends and TARGET2 holidays).
    """
    try:
        from app.services.market_calendar import is_market_business_day
        dt = datetime.strptime(ms_date_str, "%Y-%m-%d").date()
        cand = dt + timedelta(days=1)
        while not is_market_business_day(cand):
            cand += timedelta(days=1)
        return cand.strftime("%Y-%m-%d")
    except Exception:
        return ms_date_str


async def _fetch_boerse_frankfurt_price(isin: str) -> tuple[Optional[float], Optional[str], Optional[str]]:
    """
    Fetch real-time trade price, date, and local quote time from Börse Frankfurt JSON API.
    Börse Frankfurt is the primary European exchange for German Xetra listings (including Gold ETC IE00B4ND3602).
    """
    url = f"https://api.boerse-frankfurt.de/v1/data/quote_box/single?isin={isin}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=4, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                raw_price = data.get("lastPrice") or data.get("retailBid") or data.get("bidLimit")
                if raw_price is not None and float(raw_price) > 0:
                    price = round(float(raw_price), 4)
                    ts_str = data.get("timestampLastPrice") or data.get("timestamp")
                    quote_time = None
                    price_date = datetime.now().strftime("%Y-%m-%d")
                    if ts_str:
                        try:
                            dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                            import zoneinfo
                            local_dt = dt.astimezone(zoneinfo.ZoneInfo("Europe/Madrid"))
                            price_date = local_dt.strftime("%Y-%m-%d")
                            quote_time = local_dt.strftime("%H:%M")
                        except Exception:
                            quote_time = datetime.now().strftime("%H:%M")
                    else:
                        quote_time = datetime.now().strftime("%H:%M")
                    return price, price_date, quote_time
    except Exception as e:
        logger.debug(f"Börse Frankfurt quote failed for {isin}: {e}")
    return None, None, None


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
      2. Database PriceCache (instant local lookup in <5ms without blocking web requests)
      3. Live external sources (when force=True or not yet in database)
    """
    if isin == "TR_TRANSFER" or isin.startswith("TR_"):
        _price_cache[isin] = {"price": 0.0, "date": datetime.now().strftime("%Y-%m-%d"), "ts": datetime.now()}
        return 0.0, datetime.now().strftime("%Y-%m-%d")

    if isin == "ES0000012411":
        # Spanish Government Bond 5.75% 2032 (Trade Republic): fixed purchase value (4000.99 EUR) with current date
        today_str = datetime.now().strftime("%Y-%m-%d")
        fixed_price = 1.12806
        _price_cache[isin] = {"price": fixed_price, "date": today_str, "ts": datetime.now()}
        if db is not None and PriceCache is not None:
            try:
                row = db.query(PriceCache).filter(PriceCache.isin == isin, PriceCache.date == today_str).first()
                if not row:
                    db.add(PriceCache(isin=isin, date=today_str, price=fixed_price, currency="EUR", source="purchase_fixed"))
                    db.commit()
            except Exception:
                db.rollback()
        return fixed_price, today_str

    ticker = KNOWN_TICKERS.get(isin) or ticker

    # For live exchange-traded assets (ETCs, ETFs, equities, e.g. PPFB.DE), quotes fluctuate in real time
    # during market sessions. They must be fetched from live market data (Börse Frankfurt / Yahoo Finance) with a short 30s
    # in-memory cache, rather than being locked to a static historical/purchase PriceCache in the DB.
    is_live_traded = bool(
        ticker
        and not ticker.startswith("0P000")
        and not isin.startswith("0192")
        and not isin.startswith("ES011261")
        and isin != "ES0000012411"
    )
    if is_live_traded:
        # Live exchange-traded assets (e.g. PPFB.DE / Gold ETC): short 30-second cache TTL for responsive intraday ticks
        if not force and _is_cache_valid(isin, ttl_minutes=0.5):
            return _price_cache[isin]["price"], _price_cache[isin].get("date")

        live_p, live_d, live_time = None, None, None
        # Try primary exchange: Börse Frankfurt for European ETCs/ETFs (IE00B4ND3602, etc.)
        if isin == "IE00B4ND3602" or (ticker and ticker.endswith(".DE")):
            live_p, live_d, live_time = await _fetch_boerse_frankfurt_price(isin)

        # Fallback to Yahoo Finance live quote if Börse Frankfurt didn't return
        if live_p is None and ticker:
            y_price, y_date = await _fetch_yahoo_price(ticker)
            if y_price and y_price > 0:
                live_p = round(y_price, 4)
                live_d = y_date or datetime.now().strftime("%Y-%m-%d")
                live_time = datetime.now().strftime("%H:%M")

        if live_p and live_p > 0:
            price = live_p
            price_date = live_d or datetime.now().strftime("%Y-%m-%d")
            _price_cache[isin] = {
                "price": price,
                "date": price_date,
                "quote_time": live_time or datetime.now().strftime("%H:%M"),
                "ts": datetime.now(),
            }
            if db is not None and PriceCache is not None:
                try:
                    entry = db.query(PriceCache).filter(PriceCache.isin == isin, PriceCache.date == price_date).first()
                    if entry:
                        entry.price = price
                        entry.source = "live_exchange"
                    else:
                        db.add(PriceCache(isin=isin, date=price_date, price=price, currency="EUR", source="live_exchange"))
                    db.commit()
                except Exception as e:
                    logger.debug(f"Failed to update PriceCache for live traded asset {isin}: {e}")
                    db.rollback()
            return price, price_date

    # Smart force: if the DB already holds the newest NAV that can exist right now (or we scraped
    # this fund a few minutes ago), skip the slow multi-site scrape and serve the DB value.
    if force and db is not None and PriceCache is not None:
        try:
            latest = db.query(PriceCache).filter(PriceCache.isin == isin, PriceCache.price > 0).order_by(PriceCache.date.desc()).first()
            if latest and (is_nav_current(latest.date) or _recently_scraped(isin)):
                _price_cache[isin] = {"price": float(latest.price), "date": latest.date, "ts": datetime.now()}
                return float(latest.price), latest.date
        except Exception as e:
            logger.debug(f"NAV freshness check failed for {isin}: {e}")
    if force:
        _last_scrape[isin] = datetime.now()

    if not force and _is_cache_valid(isin):
        return _price_cache[isin]["price"], _price_cache[isin].get("date")

    # Fast DB cache lookup: avoid slow external scrapers on initial load if we already have a valid price
    if not force and not is_live_traded and db is not None and PriceCache is not None:
        try:
            entry = db.query(PriceCache).filter(PriceCache.isin == isin).order_by(PriceCache.date.desc()).first()
            if entry and entry.price is not None and entry.price > 0:
                _price_cache[isin] = {"price": float(entry.price), "date": entry.date, "ts": datetime.now()}
                return float(entry.price), entry.date
        except Exception as e:
            logger.debug(f"DB price check failed for {isin}: {e}")


    price = None
    price_date = None

    # Check if this is an Indexa EPSV (e.g. 0192#0011)
    if isin.startswith("0192") or isin == "0192#0011":
        # Indexa EPSV dual-source strategy:
        # Morningstar (0P0001FTQ7.F) publishes the NAV early in the morning under market trade date T.
        # Indexa Capital publishes the official CSV later (around midday) under settlement date T+1.
        # By mapping Morningstar's date T -> T+1 (skipping weekends/holidays), we can anticipate
        # the official Indexa valuation hours before Indexa uploads its CSV, with 100% correct dating!
        y_ticker = KNOWN_TICKERS.get(isin) or "0P0001FTQ7.F"

        # Query Indexa CSV and Morningstar concurrently
        idx_res, ms_res = await asyncio.gather(
            _with_timeout(_fetch_indexa_epsv_official(isin, db=db)),
            _with_timeout(_fetch_yahoo_price(y_ticker)),
            return_exceptions=True,
        )

        idx_price, idx_date = (idx_res if isinstance(idx_res, tuple) and len(idx_res) == 2 else (None, None))
        ms_price, ms_date = (ms_res if isinstance(ms_res, tuple) and len(ms_res) == 2 else (None, None))

        # If Yahoo price didn't return a date, try recent history points
        if (ms_price is None or ms_date is None) and y_ticker:
            try:
                hist = await _with_timeout(asyncio.to_thread(_sync_fetch_yahoo_history, y_ticker, "5d"))
                if isinstance(hist, list) and hist:
                    valid_h = [h for h in hist if h.get("price") and h["price"] > 0]
                    if valid_h:
                        ms_price, ms_date = round(valid_h[-1]["price"], 4), valid_h[-1]["date"]
            except Exception:
                pass

        # Map Morningstar date T -> T+1 business day (Indexa settlement date)
        ms_mapped_date = _map_morningstar_to_indexa_date(ms_date) if ms_date else None

        # Compare dates:
        # If Morningstar has published a new session that Indexa CSV hasn't uploaded yet:
        if ms_price and ms_price > 0 and ms_mapped_date and (not idx_date or ms_mapped_date > idx_date):
            price = round(ms_price, 4)
            price_date = ms_mapped_date
            logger.info(f"Indexa EPSV: Anticipating NAV via Morningstar: {price} on {price_date} (ahead of Indexa CSV {idx_date})")
            if db is not None and PriceCache is not None:
                try:
                    row = db.query(PriceCache).filter(PriceCache.isin == isin, PriceCache.date == price_date).first()
                    if row:
                        row.price = price
                        row.source = "morningstar_early"
                    else:
                        db.add(PriceCache(isin=isin, date=price_date, price=price, currency="EUR", source="morningstar_early"))
                    db.commit()
                except Exception as e:
                    logger.warning(f"Error persisting early Morningstar quote for Indexa: {e}")
                    db.rollback()
        elif idx_price and idx_price > 0:
            price = idx_price
            price_date = idx_date
        elif ms_price and ms_price > 0:
            price = round(ms_price, 4)
            price_date = ms_mapped_date or ms_date

        # Check if database PriceCache has a newer confirmed NAV
        if db is not None and PriceCache is not None:
            try:
                db_entry = db.query(PriceCache).filter(PriceCache.isin == isin).order_by(PriceCache.date.desc()).first()
                if db_entry and db_entry.price > 0:
                    if not price_date or db_entry.date > price_date:
                        price = db_entry.price
                        price_date = db_entry.date
            except Exception:
                pass


    # For other non-standard ISINs (e.g. Kutxabank 0201G), look up DB PriceCache
    is_standard_isin = len(isin) == 12 and isin.isalnum()
    if price is None and not is_standard_isin and db is not None and PriceCache is not None:
        try:
            entry = db.query(PriceCache).filter(PriceCache.isin == isin).order_by(PriceCache.date.desc()).first()
            if entry and entry.price is not None and entry.price >= 0:
                _price_cache[isin] = {"price": entry.price, "date": entry.date, "ts": datetime.now()}
                return entry.price, entry.date
        except Exception as e:
            logger.warning(f"Error querying PriceCache for non-standard ISIN {isin}: {e}")

    # 1. Try European & Spanish fund providers (Financial Times, Investing.com, Quefondos, Azvalor, Finect, Yahoo) in parallel
    if price is None and is_standard_isin and not is_live_traded and isin != "IE00B4ND3602":
        tasks = [
            _fetch_ft_official(isin),
            _fetch_investing_price(isin),
            _fetch_quefondos_price(isin),
            _fetch_finect_price(isin),
        ]
        task_names = ["ft", "investing", "quefondos", "finect"]

        # For Azvalor funds, query direct official gestora endpoint
        if isin.startswith("ES011261"):
            tasks.append(_fetch_azvalor_official(isin))
            task_names.append("azvalor")

        # For Cobas funds, query direct official Cobas AM gestora endpoint
        if isin in COBAS_PRODUCT_SLUGS or isin.startswith("ES011919") or isin == "LU1598719752":
            tasks.append(_fetch_cobas_official(isin))
            task_names.append("cobas")

        # For BlackRock funds, query direct official BlackRock gestora endpoint
        if isin in BLACKROCK_PRODUCT_URLS or isin == "LU0171307068":
            tasks.append(_fetch_blackrock_official(isin))
            task_names.append("blackrock")

        if ticker and not ticker.startswith("0P000"):
            tasks.append(_fetch_yahoo_price(ticker))
            task_names.append("yahoo")

        results = await asyncio.gather(*[_with_timeout(t) for t in tasks], return_exceptions=True)

        # Reference NAV for sanity validation of scraped values
        ref_price = None
        if db is not None and PriceCache is not None:
            try:
                ref_row = db.query(PriceCache).filter(PriceCache.isin == isin, PriceCache.price > 0).order_by(PriceCache.date.desc()).first()
                ref_price = float(ref_row.price) if ref_row else None
            except Exception:
                ref_price = None
        today_str = datetime.now().strftime("%Y-%m-%d")

        # Candidates with (date, decimal_precision_priority, price, source)
        # Date is strictly priority #1: freshest/most recent liquidation date always wins immediately!
        candidates = []
        for i, res in enumerate(results):
            if isinstance(res, tuple) and len(res) == 2:
                r_price, r_date = res
                if r_price is not None and r_date:
                    # Validation: no future dates, no absurd jumps vs last known NAV
                    if r_date > today_str or r_price <= 0:
                        continue
                    if ref_price and abs(r_price - ref_price) / ref_price > MAX_NAV_JUMP:
                        logger.warning(f"Rejected implausible NAV {r_price} ({r_date}) for {isin} from {task_names[i]} (ref {ref_price})")
                        continue
                    name = task_names[i]
                    prec = 7 if name in ("azvalor", "cobas", "blackrock", "ft") else (6 if name == "quefondos" else (5 if name == "finect" else (4 if name == "yahoo" else (3 if name == "investing" else 2))))
                    candidates.append((r_date, prec, r_price, name))

        if candidates:
            # Sort by: 1. Date descending (most recent date wins first, ensuring earliest NAV)
            #          2. Precision descending (tie-breaker for same date)
            candidates.sort(key=lambda c: (c[0], c[1]), reverse=True)
            best_date, _, best_price, best_source = candidates[0]

            # If the database already has a confirmed newer NAV than the scraped date, do not downgrade
            if db is not None and PriceCache is not None:
                try:
                    db_latest = db.query(PriceCache).filter(PriceCache.isin == isin, PriceCache.price > 0).order_by(PriceCache.date.desc()).first()
                    if db_latest and db_latest.date and db_latest.date > best_date:
                        price, price_date = float(db_latest.price), db_latest.date
                        logger.info(f"Kept existing newer DB NAV {price} ({price_date}) for {isin} over older scraped {best_date}")
                    else:
                        price, price_date = best_price, best_date
                        logger.info(f"Selected {isin} NAV {price} ({best_date}) from source: {best_source}")
                except Exception:
                    price, price_date = best_price, best_date
                    logger.info(f"Selected {isin} NAV {price} ({best_date}) from source: {best_source}")
            else:
                price, price_date = best_price, best_date
                logger.info(f"Selected {isin} NAV {price} ({best_date}) from source: {best_source}")

    # If successfully fetched from live provider, persist to DB PriceCache & in-memory cache
    if price is not None and db is not None and PriceCache is not None:
        try:
            fallback_dt = get_previous_business_date() if is_standard_isin else datetime.now().strftime("%Y-%m-%d")
            eff_dt = price_date or fallback_dt
            target_date = _normalize_business_date(eff_dt)
            price_date = target_date
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
            if entry and entry.price is not None and entry.price >= 0:
                price = entry.price
                price_date = entry.date
        except Exception as e:
            logger.warning(f"Error querying PriceCache fallback for {isin}: {e}")

    # 6. Fallback: Morningstar by ISIN
    if price is None:
        price = await _fetch_morningstar_price(isin)
        if price:
            price_date = get_previous_business_date()

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
                    try:
                        if datetime.strptime(date_str, "%Y-%m-%d").date().weekday() >= 5:
                            continue
                    except ValueError:
                        pass
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
                                            try:
                                                if datetime.strptime(s_dt, "%Y-%m-%d").date().weekday() >= 5:
                                                    continue
                                            except ValueError:
                                                pass
                                            s_val = float(sub_r[col_idx].strip().replace(',', '.')) / 10.0
                                            existing = db.query(PriceCache).filter(PriceCache.isin == isin, PriceCache.date == s_dt).first()
                                            if not existing:
                                                db.add(PriceCache(isin=isin, date=s_dt, price=round(s_val, 4), currency="EUR", source="live_indexa"))
                                    db.commit()
                                except Exception as e:
                                    logger.warning(f"Error persisting Indexa recent points to PriceCache: {e}")

                            # Return newer or confirmed DB PriceCache entry if available
                            if db is not None:
                                try:
                                    from app.models import PriceCache
                                    latest_entry = db.query(PriceCache).filter(PriceCache.isin == isin).order_by(PriceCache.date.desc()).first()
                                    if latest_entry and latest_entry.price > 0 and latest_entry.date > date_str:
                                        return latest_entry.price, latest_entry.date
                                except Exception:
                                    pass

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

            by_date: dict[str, float] = {}
            for r in reader:
                if r and len(r) > col_idx and r[0].strip() and r[col_idx].strip():
                    d_str = _normalize_business_date(r[0].strip())  # weekend rows hold the real Friday NAV
                    if cutoff_date and d_str < cutoff_date:
                        continue
                    val_str = r[col_idx].strip().replace(',', '.')
                    try:
                        raw_val = float(val_str)
                        if raw_val > 0:
                            by_date[d_str] = round(raw_val / 10.0, 4)  # later rows override
                    except ValueError:
                        continue
            history = [{"date": d, "price": p} for d, p in sorted(by_date.items())]
            today_str = datetime.now().strftime("%Y-%m-%d")
            history = [h for h in history if h["date"] <= today_str]
            return history
    except Exception as e:
        logger.warning(f"Error fetching Indexa EPSV history: {e}")
        return []


AZVALOR_PRODUCT_SLUGS: dict[str, str] = {
    "ES0112611001": "international",
    "ES0112609005": "iberia",
    "ES0112612009": "capital",
    "ES0112613007": "blue-chips",
    "ES0112614005": "managers",
    "ES0112615002": "value-selection",
}


async def _fetch_azvalor_official(isin: str) -> tuple[Optional[float], Optional[str]]:
    """
    Fetch official NAV and date directly from Azvalor.
    Uses the official client area API (6 decimal precision), with fallback to public web table.
    """
    slug = AZVALOR_PRODUCT_SLUGS.get(isin)
    if not slug and isin.startswith("ES011261"):
        slug = "international"
    if not slug:
        return None, None

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    # 1. Try high-precision client area API
    try:
        url = f"https://areacliente.azvalor.com/api/product/{slug}/prices?filename={slug}"
        async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                rows = re.findall(
                    r'<ss:Data ss:Type=[\'"]String[\'"]>(\d{2}/\d{2}/\d{4})</ss:Data></ss:Cell>\s*<ss:Cell><ss:Data ss:Type=[\'"]Number[\'"]>([\d\.]+)</ss:Data>',
                    resp.text,
                )
                if rows:
                    last_d, last_p = rows[-1]
                    dt = datetime.strptime(last_d, "%d/%m/%Y").strftime("%Y-%m-%d")
                    return float(last_p), dt
    except Exception as e:
        logger.debug(f"Azvalor client API fetch for {isin}: {e}")

    # 2. Fallback to public website table
    try:
        url = "https://www.azvalor.com/valores-liquidativos/"
        async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                rows = re.findall(
                    r'<td[^>]*class=[\'"]nombre[\'"][^>]*>\s*([^<]+?)\s*</td>\s*<td[^>]*>\s*(\d{2}/\d{2}/\d{4})\s*</td>\s*<td[^>]*>\s*([\d\.,]+)',
                    resp.text,
                )
                kw = slug.replace("-", " ")
                for name, d_str, p_str in rows:
                    if kw in name.lower() or slug in name.lower():
                        dt = datetime.strptime(d_str, "%d/%m/%Y").strftime("%Y-%m-%d")
                        clean_p = p_str.replace(".", "").replace(",", ".") if ("," in p_str and "." in p_str) else p_str.replace(",", ".")
                        return float(clean_p), dt
    except Exception as e:
        logger.warning(f"Azvalor public web scraping error for {isin}: {e}")
    return None, None


async def _fetch_azvalor_history(isin: str, period: str = "1y", db=None) -> list[dict]:
    """
    Fetch full historical NAV series directly from Azvalor Client Area official dataset.
    """
    slug = AZVALOR_PRODUCT_SLUGS.get(isin)
    if not slug and isin.startswith("ES011261"):
        slug = "international"
    if not slug:
        return []

    try:
        url = f"https://areacliente.azvalor.com/api/product/{slug}/prices?filename={slug}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(timeout=12, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                return []

            rows = re.findall(
                r'<ss:Data ss:Type=[\'"]String[\'"]>(\d{2}/\d{2}/\d{4})</ss:Data></ss:Cell>\s*<ss:Cell><ss:Data ss:Type=[\'"]Number[\'"]>([\d\.]+)</ss:Data>',
                resp.text,
            )
            if not rows:
                return []

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
                cutoff_date = (now - timedelta(days=365 * 3)).strftime("%Y-%m-%d")
            elif period in ["5y"]:
                cutoff_date = (now - timedelta(days=365 * 5)).strftime("%Y-%m-%d")
            elif period == "ytd":
                cutoff_date = f"{now.year}-01-01"

            history = []
            for d_str, p_str in rows:
                try:
                    dt = datetime.strptime(d_str, "%d/%m/%Y").strftime("%Y-%m-%d")
                    if cutoff_date and dt < cutoff_date:
                        continue
                    p_val = float(p_str)
                    if p_val > 0:
                        history.append({"date": dt, "price": round(p_val, 4)})
                except ValueError:
                    continue

            # Persist recent points to PriceCache if db is supplied
            if db is not None and PriceCache is not None and history:
                try:
                    for pt in history[-30:]:
                        s_dt = pt["date"]
                        s_val = pt["price"]
                        existing = db.query(PriceCache).filter(PriceCache.isin == isin, PriceCache.date == s_dt).first()
                        if not existing:
                            db.add(PriceCache(isin=isin, date=s_dt, price=s_val, currency="EUR", source="live_azvalor"))
                    db.commit()
                except Exception as e:
                    logger.debug(f"Error persisting Azvalor points to PriceCache: {e}")

            return history
    except Exception as e:
        logger.warning(f"Error fetching Azvalor history for {isin}: {e}")
        return []


COBAS_PRODUCT_SLUGS: dict[str, str] = {
    "LU1598719752": "https://www.cobasam.com/productos/cobas-lux-sicav/lux_international_eur/",
    "LU1598720172": "https://www.cobasam.com/productos/cobas-lux-sicav/lux_selection_eur/",
    "LU1598720503": "https://www.cobasam.com/productos/cobas-lux-sicav/lux_large_cap_eur/",
    "LU1598720925": "https://www.cobasam.com/productos/cobas-lux-sicav/lux_concentrated_eur/",
    "ES0119199000": "https://www.cobasam.com/productos/inversion-libre/cobas_internacional/",
    "ES0119198002": "https://www.cobasam.com/productos/inversion-libre/cobas_seleccion/",
    "ES0119197004": "https://www.cobasam.com/productos/inversion-libre/cobas_grandes_companias/",
    "ES0119196006": "https://www.cobasam.com/productos/inversion-libre/cobas_iberia/",
}


def _fetch_cobas_official_sync(isin: str) -> tuple[Optional[float], Optional[str]]:
    """
    Fetch official NAV and date directly from Cobas Asset Management (cobasam.com).
    Cobas publishes daily official NAVs on its product pages before external aggregators.
    """
    url = COBAS_PRODUCT_SLUGS.get(isin)
    if not url:
        return None, None
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    }
    try:
        with httpx.Client(timeout=10, follow_redirects=True, headers=headers) as client:
            resp = client.get(url)
            if resp.status_code == 200:
                price = None
                date_str = None

                # 1. Parse via BeautifulSoup if available
                if BeautifulSoup:
                    try:
                        soup = BeautifulSoup(resp.text, "html.parser")
                        num_el = soup.find(class_="number")
                        if num_el:
                            clean = num_el.get_text(strip=True).replace("€", "").strip()
                            clean = clean.replace(".", "").replace(",", ".")
                            price = float(clean)
                        date_el = soup.find(class_="date")
                        if date_el:
                            m_d = re.search(r'(\d{1,2})[-/](\d{1,2})[-/](\d{4})', date_el.get_text(strip=True))
                            if m_d:
                                d, m, y = int(m_d.group(1)), int(m_d.group(2)), int(m_d.group(3))
                                date_str = f"{y:04d}-{m:02d}-{d:02d}"
                    except Exception:
                        pass

                # 2. Regex fallbacks
                if price is None:
                    m = re.search(r'class=[\'"]number[\'"][^>]*>([0-9\.,]+)\s*€', resp.text)
                    if not m:
                        m = re.search(r'([0-9]{2,3}[,\.][0-9]{4,6})\s*€', resp.text)
                    if m:
                        clean = m.group(1).replace(".", "").replace(",", ".")
                        price = float(clean)

                if not date_str:
                    m_d = re.search(r'Fecha valor liquidativo:\s*(\d{1,2})[-/](\d{1,2})[-/](\d{4})', resp.text)
                    if m_d:
                        d, m, y = int(m_d.group(1)), int(m_d.group(2)), int(m_d.group(3))
                        date_str = f"{y:04d}-{m:02d}-{d:02d}"

                if price is not None:
                    return price, date_str
    except Exception as e:
        logger.warning(f"Error fetching official Cobas NAV for {isin}: {e}")
    return None, None


async def _fetch_cobas_official(isin: str) -> tuple[Optional[float], Optional[str]]:
    """Async wrapper for Cobas official NAV scraper."""
    return await asyncio.to_thread(_fetch_cobas_official_sync, isin)


BLACKROCK_PRODUCT_URLS: dict[str, str] = {
    "LU0171307068": "https://www.blackrock.com/es/profesionales/productos/229337/blackrock-world-healthscience-a2-eur-fund",
}


def _fetch_blackrock_official_sync(isin: str) -> tuple[Optional[float], Optional[str]]:
    """
    Fetch official NAV and date directly from BlackRock España official product page.
    """
    url = BLACKROCK_PRODUCT_URLS.get(isin)
    if not url:
        return None, None

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    }
    spanish_months = {
        "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6,
        "jul": 7, "ago": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dic": 12
    }

    # 1. Scrape main product page header
    try:
        with httpx.Client(timeout=10, follow_redirects=True, headers=headers) as client:
            resp = client.get(url)
            if resp.status_code == 200:
                html = resp.text
                m_date = re.search(r'Valor liquidativo a\s+(\d{1,2})\s+([a-zA-ZáéíóúÁÉÍÓÚ]+)\s+(\d{4})', html, re.IGNORECASE)
                nav_block = re.search(r'data-col="fundHeader\.fundNav\.navAmount"[^>]*>.*?<span class="header-nav-data">([^<]+)</span>', html, re.DOTALL)
                if m_date and nav_block:
                    day, month_str, year = m_date.groups()
                    m_clean = month_str.lower()[:3]
                    m_num = spanish_months.get(m_clean, 10)
                    iso_date = f"{year}-{m_num:02d}-{int(day):02d}"
                    raw_val = nav_block.group(1).replace("EUR", "").replace("USD", "").replace(".", "").replace(",", ".").strip()
                    price = float(raw_val)
                    if price > 0:
                        return price, iso_date
    except Exception as e:
        logger.debug(f"BlackRock main page scrape error for {isin}: {e}")

    # 2. Scrape official chart AJAX endpoint as fallback
    try:
        ajax_url = f"{url.rstrip('/')}/1497267045692.ajax?tab=chart"
        with httpx.Client(timeout=10, follow_redirects=True, headers=headers) as client:
            resp = client.get(ajax_url)
            if resp.status_code == 200:
                pattern = r'\{x:Date\.UTC\((\d{4}),(\d{1,2}),(\d{1,2})\),y:Number\(\(([0-9.]+)\)\.toFixed\(2\)\)'
                matches = re.findall(pattern, resp.text)
                if matches:
                    y, m, d, p_str = matches[-1]
                    iso_date = f"{y}-{int(m)+1:02d}-{int(d):02d}"
                    return float(p_str), iso_date
    except Exception as e:
        logger.warning(f"BlackRock chart AJAX scrape error for {isin}: {e}")

    return None, None


async def _fetch_blackrock_official(isin: str) -> tuple[Optional[float], Optional[str]]:
    """Async wrapper for BlackRock official NAV scraper."""
    return await asyncio.to_thread(_fetch_blackrock_official_sync, isin)


def _fetch_blackrock_history_sync(isin: str, period: str = "1y") -> list[dict]:
    """
    Fetch full historical NAV series directly from BlackRock official chart data endpoint.
    """
    url = BLACKROCK_PRODUCT_URLS.get(isin)
    if not url:
        return []

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    }
    ajax_url = f"{url.rstrip('/')}/1497267045692.ajax?tab=chart"
    try:
        with httpx.Client(timeout=12, follow_redirects=True, headers=headers) as client:
            resp = client.get(ajax_url)
            if resp.status_code == 200:
                pattern = r'\{x:Date\.UTC\((\d{4}),(\d{1,2}),(\d{1,2})\),y:Number\(\(([0-9.]+)\)\.toFixed\(2\)\)'
                matches = re.findall(pattern, resp.text)
                if matches:
                    history = []
                    for y, m, d, p_str in matches:
                        iso_date = f"{y}-{int(m)+1:02d}-{int(d):02d}"
                        history.append({"date": iso_date, "price": float(p_str)})

                    cutoff = _get_period_cutoff(period)
                    if cutoff:
                        history = [p for p in history if p["date"] >= cutoff]
                    return history
    except Exception as e:
        logger.warning(f"Error fetching BlackRock history for {isin}: {e}")
    return []


async def _fetch_blackrock_history(isin: str, period: str = "1y", db=None) -> list[dict]:
    """Async wrapper for BlackRock official history fetcher."""
    return await asyncio.to_thread(_fetch_blackrock_history_sync, isin, period)


FINECT_SLUGS: dict[str, str] = {
    "ES0112611001": "ES0112611001-Azvalor_internacional_fi",
    "ES0112609005": "ES0112609005-Azvalor_iberia_fi",
    "ES0112612009": "ES0112612009-Azvalor_capital_fi",
    "ES0112613007": "ES0112613007-Azvalor_blue_chips_fi",
    "LU1598719752": "LU1598719752-Cobas_international_fund_p_eur_acc",
    "LU0302296495": "LU0302296495-Dnb_fund_technology_a_eur",
    "LU1623762843": "LU1623762843-Carmignac_portfolio_credit_a_eur_acc",
    "LU2145461757": "LU2145461757-Robeco_smart_energy_d_eur",
    "IE00BM95B621": "IE00BM95B621-Polar_capital_funds_plc_polar_capital_global_technology_fund_r_eur_acc",
    "LU0996182563": "LU0996182563-Amundi_index_msci_world_ae_c",
    "IE000QAZP7L2": "IE000QAZP7L2-Ishares_emerging_markets_index_ie_s_acc_eur",
    "IE000ZYRH0Q7": "IE000ZYRH0Q7-Ishares_developed_world_index_ie_s_acc_eur",
    "IE00BYX5NX33": "IE00BYX5NX33-Fidelity_msci_world_index_p_acc_eur",
    "IE00BYX5M476": "IE00BYX5M476-Fidelity_msci_emerging_markets_index_p_acc_eur",
    "IE00BYX5NH74": "IE00BYX5NH74-Fidelity_msci_japan_index_p_acc_eur",
    "LU0261952682": "LU0261952682-Fidelity_funds__euro_stoxx_50_tm_aacc_eur",
}


async def _fetch_finect_price(isin: str) -> tuple[Optional[float], Optional[str]]:
    """Fetch NAV and date from Finect Spanish fund portal."""
    slug = FINECT_SLUGS.get(isin, isin)
    try:
        url = f"https://www.finect.com/fondos-inversion/{slug}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                m_quote = re.search(r'lastQuote.*?(?:datetime|date).*?(\d{4}-\d{2}-\d{2}).*?price.*?([\d\.]+)', resp.text)
                if m_quote:
                    d_str, p_str = m_quote.group(1), m_quote.group(2)
                    return float(p_str), d_str
                # Fallback to schema Offer price
                m_price = re.search(r'["\']@type["\']:\s*["\']Offer["\'].*?["\']price["\']:\s*["\']([\d\.]+)["\']', resp.text)
                if m_price:
                    return float(m_price.group(1)), None
    except Exception as e:
        logger.debug(f"Finect fetch error for {isin}: {e}")
    return None, None


INVESTING_FUND_SLUGS: dict[str, str] = {
    "ES0112611001": "azvalor-internacional-fi",
    "ES0112609005": "azvalor-iberia-fi",
    "ES0112612009": "azvalor-capital-fi",
    "ES0112613007": "azvalor-blue-chips-fi",
    "ES0112614005": "azvalor-managers-fi",
    "LU0302296495": "dnb-fund-technology-retail-a-eure",
    "LU0996182563": "amundi-msci-wrld-ae-c",
    "LU2145461757": "robeco-smart-energy-equities-d-eur",
    "IE00BM95B621": "polar-capital-funds-plc---polar-c",
    "LU1623762843": "carmignac-portfolio-credit-a-eur",
    "LU1598719752": "cobas-lux-sicav---cobas-internati",
    "IE00BYX5NX33": "fidelity-msci-world-index-eur-p-a",
    "IE00BYX5M476": "fidelity-msci-emerging-markets-in",
    "IE00BYX5NH74": "fidelity-msci-japan-index-eur-p-a",
    "LU0261952682": "fidelity-funds---euro-stoxx-50-fu",
    "IE000ZYRH0Q7": "ishares-developed-world-index-d-a",
    "IE000QAZP7L2": "ishares-emerging-market-index-s-e",
}


def _fetch_investing_sync(isin: str) -> tuple[Optional[float], Optional[str]]:
    """
    Synchronous fetch for Investing.com using standard urllib.request with mobile Safari headers.
    This seamlessly passes Cloudflare's bot heuristics where HTTP/2 / async clients get blocked.
    """
    slug = INVESTING_FUND_SLUGS.get(isin, isin.lower())
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    }
    for domain in ["m.es.investing.com", "es.investing.com"]:
        url = f"https://{domain}/funds/{slug}"
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=6) as resp:
                if resp.status == 200:
                    html = resp.read().decode("utf-8", "ignore")
                    m_p = re.search(r'class=[\'"]lastInst pid-\d+-last[\'"]>\s*([\d\.,]+)', html)
                    m_d = re.search(r'class=[\'"]pid-\d+-time[\'"]>([^<]+)<', html)
                    if m_p:
                        raw_p = m_p.group(1).strip()
                        if "." in raw_p and "," in raw_p:
                            clean_p = raw_p.replace(".", "").replace(",", ".")
                        elif "," in raw_p:
                            clean_p = raw_p.replace(",", ".")
                        else:
                            clean_p = raw_p
                        price = float(clean_p)

                        date_str = None
                        if m_d:
                            t_str = m_d.group(1).strip()
                            if "/" in t_str:
                                parts = t_str.split("/")
                                if len(parts) == 2:
                                    day, month = int(parts[0]), int(parts[1])
                                    now = datetime.now()
                                    year = now.year
                                    if month == 12 and now.month == 1:
                                        year -= 1
                                    date_str = f"{year:04d}-{month:02d}-{day:02d}"
                                elif len(parts) == 3:
                                    date_str = f"{parts[2]}-{int(parts[1]):02d}-{int(parts[0]):02d}"
                            elif ":" in t_str:
                                date_str = get_previous_business_date()
                        return price, date_str
        except Exception:
            pass
    return None, None


async def _fetch_investing_price(isin: str) -> tuple[Optional[float], Optional[str]]:
    """Fetch latest NAV and date from Investing.com (es.investing.com)."""
    return await asyncio.to_thread(_fetch_investing_sync, isin)


async def _fetch_ft_official(isin: str) -> tuple[Optional[float], Optional[str]]:
    """
    Fetch latest official NAV and date from Financial Times Markets fund tearsheets.
    FT receives direct daily NAV feeds reported by European fund managers (Fidelity, Blackrock, DNB, etc.).
    """
    if isin == "IE00B4ND3602":
        return None, None

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


def _sync_fetch_yahoo_price(ticker: str) -> tuple[Optional[float], Optional[str]]:
    """Synchronous worker for Yahoo Finance price fetch with fast chart quote priority for live assets."""
    is_live_asset = bool(ticker and (ticker.endswith(".DE") or ticker.endswith(".L") or ("." not in ticker and not ticker.startswith("0P000"))))

    # 1. Try fast Yahoo chart quote first (<50ms, accurate regular price) ONLY for live-traded assets
    if is_live_asset:
        try:
            from app.routers.market import _fetch_yahoo_chart_quote
            cq = _fetch_yahoo_chart_quote(ticker)
            if cq and cq.get("price") and float(cq["price"]) > 0:
                price = float(cq["price"])
                dt_str = datetime.now().strftime("%Y-%m-%d")
                return price, dt_str
        except Exception as e:
            logger.debug(f"Fast chart quote fallback for {ticker}: {e}")

    # 2. Try yfinance fast_info and history (yields true historical trade date from bar index)
    try:
        t = yf.Ticker(ticker)
        info = getattr(t, "fast_info", None)
        live_price = getattr(info, "last_price", None) or getattr(info, "regular_market_price", None) if info else None

        hist = t.history(period="5d")
        if len(hist) > 0:
            last_date = str(hist.index[-1].date())
            price = float(live_price) if (live_price is not None and live_price > 0) else float(hist["Close"].iloc[-1])
            return price, last_date
        elif live_price and live_price > 0:
            return float(live_price), datetime.now().strftime("%Y-%m-%d") if is_live_asset else get_previous_business_date()
    except Exception as e:
        logger.warning(f"Yahoo Finance error for {ticker}: {e}")

    # 3. If ticker is PPFB.DE, try EGLN.L (same iShares Physical Gold ETC in EUR on London)
    if ticker == "PPFB.DE":
        try:
            from app.routers.market import _fetch_yahoo_chart_quote
            cq = _fetch_yahoo_chart_quote("EGLN.L")
            if cq and cq.get("price") and float(cq["price"]) > 0:
                price = float(cq["price"])
                dt_str = datetime.now().strftime("%Y-%m-%d")
                return price, dt_str
        except Exception:
            pass

    return None, None


async def _fetch_yahoo_price(ticker: str) -> tuple[Optional[float], Optional[str]]:
    """Fetch latest price and date from Yahoo Finance offloaded to a worker thread."""
    return await asyncio.to_thread(_sync_fetch_yahoo_price, ticker)


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
    if not (len(isin) == 12 and isin.isalnum()):
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/json, text/html, */*",
            }
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


def _sync_fetch_yahoo_history(ticker: str, yf_period: str) -> list[dict]:
    """Fetch history from yfinance in a synchronous worker thread to avoid event loop blocking."""
    try:
        t = yf.Ticker(ticker)
        hist = t.history(period=yf_period)
        if not hist.empty and len(hist) > 1:
            return [
                {"date": str(idx.date()), "price": round(float(row["Close"]), 4)}
                for idx, row in hist.iterrows()
                if float(row["Close"]) > 0
            ]
    except Exception as e:
        logger.debug(f"Yahoo history error for {ticker}: {e}")
    return []


def _get_period_cutoff(period: str) -> str | None:
    now = datetime.now()
    if period in ["1m", "1mo"]:
        return (now - timedelta(days=30)).strftime("%Y-%m-%d")
    elif period in ["3m", "3mo"]:
        return (now - timedelta(days=90)).strftime("%Y-%m-%d")
    elif period in ["6m", "6mo"]:
        return (now - timedelta(days=180)).strftime("%Y-%m-%d")
    elif period == "ytd":
        return f"{now.year}-01-01"
    elif period in ["1y", "12mo"]:
        return (now - timedelta(days=365)).strftime("%Y-%m-%d")
    elif period in ["2y"]:
        return (now - timedelta(days=730)).strftime("%Y-%m-%d")
    elif period in ["3y"]:
        return (now - timedelta(days=365 * 3)).strftime("%Y-%m-%d")
    elif period in ["5y"]:
        return (now - timedelta(days=365 * 5)).strftime("%Y-%m-%d")
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

    # 1. Direct hit in history cache
    if cache_key in _history_cache:
        ts, cached_data = _history_cache[cache_key]
        if (datetime.now() - ts).total_seconds() < 3600:
            return cached_data

    # 2. Check if a longer historical horizon is already cached for this asset.
    # If so, slice it instantly in memory without external web requests!
    cutoff = _get_period_cutoff(period)
    for candidate_period in ["max", "all", "5y", "2y", "1y"]:
        longer_key = f"{isin}:{ticker}:{candidate_period}"
        if longer_key in _history_cache:
            ts, parent_data = _history_cache[longer_key]
            if (datetime.now() - ts).total_seconds() < 3600 and parent_data:
                if cutoff is None:
                    _history_cache[cache_key] = (ts, parent_data)
                    return parent_data
                elif parent_data[0]["date"] <= cutoff:
                    sliced = [p for p in parent_data if p["date"] >= cutoff]
                    _history_cache[cache_key] = (ts, sliced)
                    return sliced

    if isin == "TR_TRANSFER":
        res = [
            {"date": "2025-08-01", "price": 1.0},
            {"date": "2025-10-29", "price": 1.0},
            {"date": "2026-01-01", "price": 0.0},
            {"date": "2026-01-15", "price": 0.0},
            {"date": datetime.now().strftime("%Y-%m-%d"), "price": 0.0},
        ]
        _history_cache[cache_key] = (datetime.now(), res)
        return res

    if isin == "ES0000012411":
        fixed_price = 1.12806
        today_str = datetime.now().strftime("%Y-%m-%d")
        res = [
            {"date": "2026-10-26", "price": fixed_price},
            {"date": today_str, "price": fixed_price},
        ]
        _history_cache[cache_key] = (datetime.now(), res)
        return res

    # 0. If it's an Indexa EPSV, query Indexa official CSV first, with fallback to Morningstar mapped to D+1
    if isin.startswith("0192") or isin == "0192#0011":
        # 1. Primary: Indexa Capital official EPSV dataset (true ledger since 2018)
        indexa_hist = await _fetch_indexa_epsv_history(isin, period=period)
        if indexa_hist:
            try:
                from app.database import SessionLocal
                from app.models import PriceCache
                db_s = SessionLocal()
                recent_prices = db_s.query(PriceCache).filter(PriceCache.isin == isin).all()
                existing_dates = {h["date"]: idx for idx, h in enumerate(indexa_hist)}
                for rp in recent_prices:
                    if rp.price is not None and rp.price > 0:
                        if rp.date in existing_dates:
                            indexa_hist[existing_dates[rp.date]]["price"] = round(rp.price, 4)
                        else:
                            indexa_hist.append({"date": rp.date, "price": round(rp.price, 4)})
                indexa_hist.sort(key=lambda x: x["date"])
                db_s.close()
            except Exception:
                pass
            _history_cache[cache_key] = (datetime.now(), indexa_hist)
            return indexa_hist

        # 2. Fallback: Morningstar series via Yahoo, mapping trade date T -> settlement date T+1
        y_ticker = ticker or KNOWN_TICKERS.get(isin) or "0P0001FTQ7.F"
        try:
            yf_period = "max" if period in ["max", "all", "5y"] else "2y"
            raw_hist = await asyncio.to_thread(_sync_fetch_yahoo_history, y_ticker, yf_period)
            if raw_hist:
                res = []
                for h in raw_hist:
                    if h.get("price") and h["price"] > 0:
                        mapped_d = _map_morningstar_to_indexa_date(h["date"])
                        res.append({"date": mapped_d, "price": round(h["price"], 4)})
                # Merge any newer points from DB PriceCache
                try:
                    from app.database import SessionLocal
                    from app.models import PriceCache
                    db_s = SessionLocal()
                    recent_prices = db_s.query(PriceCache).filter(PriceCache.isin == isin).all()
                    existing_dates = {h["date"]: idx for idx, h in enumerate(res)}
                    for rp in recent_prices:
                        if rp.price is not None and rp.price > 0:
                            if rp.date in existing_dates:
                                res[existing_dates[rp.date]]["price"] = round(rp.price, 4)
                            else:
                                res.append({"date": rp.date, "price": round(rp.price, 4)})
                    res.sort(key=lambda x: x["date"])
                    db_s.close()
                except Exception:
                    pass
                _history_cache[f"{isin}:{ticker}:{yf_period}"] = (datetime.now(), res)
                if cutoff:
                    sliced = [p for p in res if p["date"] >= cutoff]
                    _history_cache[cache_key] = (datetime.now(), sliced)
                    return sliced
                _history_cache[cache_key] = (datetime.now(), res)
                return res
        except Exception as e:
            logger.debug(f"Yahoo history error for Indexa {y_ticker}: {e}")

    # 0b. If it's Azvalor, fetch official daily history directly from Azvalor official client portal
    if isin.startswith("ES011261"):
        az_hist = await _fetch_azvalor_history(isin, period=period)
        if az_hist:
            try:
                from app.database import SessionLocal
                from app.models import PriceCache
                db_s = SessionLocal()
                recent_prices = db_s.query(PriceCache).filter(PriceCache.isin == isin).all()
                existing_dates = {h["date"]: idx for idx, h in enumerate(az_hist)}
                for rp in recent_prices:
                    if rp.price is not None and rp.price > 0:
                        if rp.date in existing_dates:
                            az_hist[existing_dates[rp.date]]["price"] = round(rp.price, 4)
                        else:
                            az_hist.append({"date": rp.date, "price": round(rp.price, 4)})
                az_hist.sort(key=lambda x: x["date"])
                db_s.close()
            except Exception:
                pass
            _history_cache[cache_key] = (datetime.now(), az_hist)
            return az_hist

    # 0c. If it's a BlackRock fund, fetch official daily history directly from BlackRock portal
    if isin in BLACKROCK_PRODUCT_URLS or isin == "LU0171307068":
        blk_hist = await _fetch_blackrock_history(isin, period=period)
        if blk_hist:
            try:
                from app.database import SessionLocal
                from app.models import PriceCache
                db_s = SessionLocal()
                recent_prices = db_s.query(PriceCache).filter(PriceCache.isin == isin).all()
                existing_dates = {h["date"]: idx for idx, h in enumerate(blk_hist)}
                for rp in recent_prices:
                    if rp.price is not None and rp.price > 0:
                        if rp.date in existing_dates:
                            blk_hist[existing_dates[rp.date]]["price"] = round(rp.price, 4)
                        else:
                            blk_hist.append({"date": rp.date, "price": round(rp.price, 4)})
                blk_hist.sort(key=lambda x: x["date"])
                db_s.close()
            except Exception:
                pass
            _history_cache[cache_key] = (datetime.now(), blk_hist)
            return blk_hist

    # 1. Try Yahoo Finance (works for stocks, ETFs and European funds) offloaded to thread
    if ticker:
        try:
            yf_period = "max" if period in ["max", "all", "5y"] else "2y"
            res = await asyncio.to_thread(_sync_fetch_yahoo_history, ticker, yf_period)
            if res:
                # Merge any newer or authoritative points from DB PriceCache
                try:
                    from app.database import SessionLocal
                    from app.models import PriceCache
                    db_s = SessionLocal()
                    recent_prices = db_s.query(PriceCache).filter(PriceCache.isin == isin).all()
                    existing_dates = {h["date"]: idx for idx, h in enumerate(res)}
                    is_live_traded = bool(ticker and not ticker.startswith("0P000") and not isin.startswith("0192"))
                    for rp in recent_prices:
                        if rp.price is not None and rp.price > 0:
                            if is_live_traded and rp.source not in ("live_yahoo", "history_sync"):
                                continue
                            if rp.date in existing_dates:
                                res[existing_dates[rp.date]]["price"] = round(rp.price, 4)
                            else:
                                res.append({"date": rp.date, "price": round(rp.price, 4)})
                    res.sort(key=lambda x: x["date"])
                    db_s.close()
                except Exception:
                    pass
                _history_cache[f"{isin}:{ticker}:{yf_period}"] = (datetime.now(), res)
                if cutoff:
                    sliced = [p for p in res if p["date"] >= cutoff]
                    _history_cache[cache_key] = (datetime.now(), sliced)
                    return sliced
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
                if row.price is not None and row.price >= 0:
                    points_dict[row.date] = round(float(row.price), 4)

            # Latest live price from cache/db
            current, current_date = await get_price_with_date(isin, ticker, db=db)
            if current is not None and current >= 0:
                t_date = current_date or datetime.now().strftime("%Y-%m-%d")
                points_dict[t_date] = round(float(current), 4)

            if points_dict:
                sorted_pts = [{"date": d, "price": p} for d, p in sorted(points_dict.items())]
                if cutoff:
                    sorted_pts = [p for p in sorted_pts if p["date"] >= cutoff]
                _history_cache[cache_key] = (datetime.now(), sorted_pts)
                return sorted_pts
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Error querying historical records for {isin}: {e}")

    # Fallback to single latest known price without synthetic random generation
    current = await get_current_price(isin, ticker)
    if current is not None and current >= 0:
        return [{"date": datetime.now().strftime("%Y-%m-%d"), "price": round(float(current), 4)}]

    return []
