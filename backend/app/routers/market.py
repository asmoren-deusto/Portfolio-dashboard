"""
Market data router — real-time stock quotes via Yahoo Finance.
Includes pre/post market prices, market state, and data freshness timestamps.
"""
from fastapi import APIRouter
from typing import Optional
import asyncio
import logging
import time
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/market", tags=["market"])

# ── Curated stock universe with metadata ───────────────────────────────────────
STOCK_UNIVERSE = [
    # ── Tecnología ─────────────────────────────────────────────
    {"ticker": "AAPL",   "name": "Apple",              "domain": "apple.com",          "sector": "Tecnología",    "index": ["SP500","NASDAQ100"], "default_market_cap": 3450000000000},
    {"ticker": "MSFT",   "name": "Microsoft",          "domain": "microsoft.com",      "sector": "Tecnología",    "index": ["SP500","NASDAQ100"], "default_market_cap": 3120000000000},
    {"ticker": "NVDA",   "name": "Nvidia",             "domain": "nvidia.com",         "sector": "Tecnología",    "index": ["SP500","NASDAQ100"], "default_market_cap": 3100000000000},
    {"ticker": "GOOGL",  "name": "Alphabet",           "domain": "google.com",         "sector": "Tecnología",    "index": ["SP500","NASDAQ100"], "default_market_cap": 2050000000000},
    {"ticker": "META",   "name": "Meta",               "domain": "meta.com",           "sector": "Tecnología",    "index": ["SP500","NASDAQ100"], "default_market_cap": 1480000000000},
    {"ticker": "AVGO",   "name": "Broadcom",           "domain": "broadcom.com",       "sector": "Tecnología",    "index": ["SP500","NASDAQ100"], "default_market_cap": 780000000000},
    {"ticker": "ORCL",   "name": "Oracle",             "domain": "oracle.com",         "sector": "Tecnología",    "index": ["SP500"],             "default_market_cap": 380000000000},
    {"ticker": "ASML.AS","name": "ASML",               "domain": "asml.com",           "sector": "Tecnología",    "index": ["DAX","NASDAQ100"],   "default_market_cap": 320000000000},
    {"ticker": "CRM",    "name": "Salesforce",         "domain": "salesforce.com",     "sector": "Tecnología",    "index": ["SP500"],             "default_market_cap": 280000000000},
    {"ticker": "AMD",    "name": "AMD",                "domain": "amd.com",            "sector": "Tecnología",    "index": ["SP500","NASDAQ100"], "default_market_cap": 240000000000},
    {"ticker": "SAP.DE", "name": "SAP",                "domain": "sap.com",            "sector": "Tecnología",    "index": ["DAX"],               "default_market_cap": 240000000000},
    {"ticker": "ADBE",   "name": "Adobe",              "domain": "adobe.com",          "sector": "Tecnología",    "index": ["SP500","NASDAQ100"], "default_market_cap": 220000000000},
    {"ticker": "IBM",    "name": "IBM",                "domain": "ibm.com",            "sector": "Tecnología",    "index": ["SP500"],             "default_market_cap": 210000000000},
    {"ticker": "CSCO",   "name": "Cisco",              "domain": "cisco.com",          "sector": "Tecnología",    "index": ["SP500","NASDAQ100"], "default_market_cap": 200000000000},
    {"ticker": "QCOM",   "name": "Qualcomm",           "domain": "qualcomm.com",       "sector": "Tecnología",    "index": ["SP500","NASDAQ100"], "default_market_cap": 190000000000},
    {"ticker": "AMAT",   "name": "Applied Materials",  "domain": "appliedmaterials.com","sector": "Tecnología",   "index": ["SP500","NASDAQ100"], "default_market_cap": 160000000000},
    {"ticker": "PLTR",   "name": "Palantir",           "domain": "palantir.com",       "sector": "Tecnología",    "index": ["SP500"],             "default_market_cap": 140000000000},
    {"ticker": "MU",     "name": "Micron",             "domain": "micron.com",         "sector": "Tecnología",    "index": ["SP500","NASDAQ100"], "default_market_cap": 120000000000},
    {"ticker": "INTC",   "name": "Intel",              "domain": "intel.com",          "sector": "Tecnología",    "index": ["SP500","NASDAQ100"], "default_market_cap": 110000000000},
    {"ticker": "AMS.MC", "name": "Amadeus IT",         "domain": "amadeus.com",        "sector": "Tecnología",    "index": ["IBEX35"],            "default_market_cap": 30000000000},

    # ── Consumo Cíclico y Defensivo ───────────────────────────
    {"ticker": "AMZN",   "name": "Amazon",             "domain": "amazon.com",         "sector": "Consumo",       "index": ["SP500","NASDAQ100"], "default_market_cap": 1950000000000},
    {"ticker": "TSLA",   "name": "Tesla",              "domain": "tesla.com",          "sector": "Consumo",       "index": ["SP500","NASDAQ100"], "default_market_cap": 760000000000},
    {"ticker": "WMT",    "name": "Walmart",            "domain": "walmart.com",        "sector": "Consumo",       "index": ["SP500"],             "default_market_cap": 680000000000},
    {"ticker": "COST",   "name": "Costco",             "domain": "costco.com",         "sector": "Consumo",       "index": ["SP500","NASDAQ100"], "default_market_cap": 410000000000},
    {"ticker": "HD",     "name": "Home Depot",         "domain": "homedepot.com",      "sector": "Consumo",       "index": ["SP500"],             "default_market_cap": 390000000000},
    {"ticker": "PG",     "name": "Procter & Gamble",   "domain": "pg.com",             "sector": "Consumo",       "index": ["SP500"],             "default_market_cap": 380000000000},
    {"ticker": "LVMH.PA","name": "LVMH",              "domain": "lvmh.com",           "sector": "Consumo",       "index": ["CAC40"],             "default_market_cap": 350000000000},
    {"ticker": "KO",     "name": "Coca-Cola",          "domain": "coca-colacompany.com","sector": "Consumo",      "index": ["SP500"],             "default_market_cap": 280000000000},
    {"ticker": "PEP",    "name": "PepsiCo",            "domain": "pepsico.com",        "sector": "Consumo",       "index": ["SP500","NASDAQ100"], "default_market_cap": 210000000000},
    {"ticker": "MCD",    "name": "McDonald's",         "domain": "mcdonalds.com",      "sector": "Consumo",       "index": ["SP500"],             "default_market_cap": 210000000000},
    {"ticker": "PM",     "name": "Philip Morris",      "domain": "pmi.com",            "sector": "Consumo",       "index": ["SP500"],             "default_market_cap": 190000000000},
    {"ticker": "ITX.MC", "name": "Inditex",            "domain": "inditex.com",        "sector": "Consumo",       "index": ["IBEX35"],            "default_market_cap": 160000000000},

    # ── Financiero ─────────────────────────────────────────────
    {"ticker": "BRK-B",  "name": "Berkshire Hathaway", "domain": "berkshirehathaway.com","sector": "Financiero",  "index": ["SP500"],             "default_market_cap": 980000000000},
    {"ticker": "JPM",    "name": "JPMorgan Chase",     "domain": "jpmorganchase.com",  "sector": "Financiero",    "index": ["SP500"],             "default_market_cap": 640000000000},
    {"ticker": "V",      "name": "Visa",               "domain": "visa.com",           "sector": "Financiero",    "index": ["SP500"],             "default_market_cap": 570000000000},
    {"ticker": "MA",     "name": "Mastercard",         "domain": "mastercard.com",     "sector": "Financiero",    "index": ["SP500"],             "default_market_cap": 460000000000},
    {"ticker": "BAC",    "name": "Bank of America",    "domain": "bankofamerica.com",  "sector": "Financiero",    "index": ["SP500"],             "default_market_cap": 320000000000},
    {"ticker": "WFC",    "name": "Wells Fargo",        "domain": "wellsfargo.com",     "sector": "Financiero",    "index": ["SP500"],             "default_market_cap": 240000000000},
    {"ticker": "AXP",    "name": "American Express",   "domain": "americanexpress.com","sector": "Financiero",    "index": ["SP500"],             "default_market_cap": 190000000000},
    {"ticker": "GS",     "name": "Goldman Sachs",      "domain": "goldmansachs.com",   "sector": "Financiero",    "index": ["SP500"],             "default_market_cap": 180000000000},
    {"ticker": "MS",     "name": "Morgan Stanley",     "domain": "morganstanley.com",  "sector": "Financiero",    "index": ["SP500"],             "default_market_cap": 170000000000},
    {"ticker": "BLK",    "name": "BlackRock",          "domain": "blackrock.com",      "sector": "Financiero",    "index": ["SP500"],             "default_market_cap": 150000000000},
    {"ticker": "ALV.DE", "name": "Allianz",            "domain": "allianz.com",        "sector": "Financiero",    "index": ["DAX"],               "default_market_cap": 120000000000},
    {"ticker": "SAN.MC", "name": "Santander",          "domain": "santander.com",      "sector": "Financiero",    "index": ["IBEX35"],            "default_market_cap": 80000000000},
    {"ticker": "BBVA.MC","name": "BBVA",               "domain": "bbva.com",           "sector": "Financiero",    "index": ["IBEX35"],            "default_market_cap": 65000000000},

    # ── Salud ──────────────────────────────────────────────────
    {"ticker": "LLY",    "name": "Eli Lilly",          "domain": "lilly.com",          "sector": "Salud",         "index": ["SP500"],             "default_market_cap": 820000000000},
    {"ticker": "UNH",    "name": "UnitedHealth",       "domain": "unitedhealthgroup.com","sector": "Salud",       "index": ["SP500"],             "default_market_cap": 520000000000},
    {"ticker": "JNJ",    "name": "Johnson & Johnson",  "domain": "jnj.com",            "sector": "Salud",         "index": ["SP500"],             "default_market_cap": 390000000000},
    {"ticker": "ABBV",   "name": "AbbVie",             "domain": "abbvie.com",         "sector": "Salud",         "index": ["SP500"],             "default_market_cap": 340000000000},
    {"ticker": "MRK",    "name": "Merck",              "domain": "merck.com",          "sector": "Salud",         "index": ["SP500"],             "default_market_cap": 260000000000},
    {"ticker": "AZN",    "name": "AstraZeneca",        "domain": "astrazeneca.com",    "sector": "Salud",         "index": ["SP500","NASDAQ100"], "default_market_cap": 240000000000},
    {"ticker": "AMGN",   "name": "Amgen",              "domain": "amgen.com",          "sector": "Salud",         "index": ["SP500","NASDAQ100"], "default_market_cap": 170000000000},
    {"ticker": "PFE",    "name": "Pfizer",             "domain": "pfizer.com",         "sector": "Salud",         "index": ["SP500"],             "default_market_cap": 150000000000},
    {"ticker": "GILD",   "name": "Gilead",             "domain": "gilead.com",         "sector": "Salud",         "index": ["SP500","NASDAQ100"], "default_market_cap": 120000000000},

    # ── Industrial ─────────────────────────────────────────────
    {"ticker": "GE",     "name": "GE Aerospace",       "domain": "ge.com",             "sector": "Industrial",    "index": ["SP500"],             "default_market_cap": 210000000000},
    {"ticker": "CAT",    "name": "Caterpillar",        "domain": "caterpillar.com",    "sector": "Industrial",    "index": ["SP500"],             "default_market_cap": 190000000000},
    {"ticker": "RTX",    "name": "RTX Corp",           "domain": "rtx.com",            "sector": "Industrial",    "index": ["SP500"],             "default_market_cap": 170000000000},
    {"ticker": "SIE.DE", "name": "Siemens",            "domain": "siemens.com",        "sector": "Industrial",    "index": ["DAX"],               "default_market_cap": 160000000000},
    {"ticker": "UNP",    "name": "Union Pacific",      "domain": "up.com",             "sector": "Industrial",    "index": ["SP500"],             "default_market_cap": 150000000000},
    {"ticker": "HON",    "name": "Honeywell",          "domain": "honeywell.com",      "sector": "Industrial",    "index": ["SP500","NASDAQ100"], "default_market_cap": 140000000000},
    {"ticker": "BA",     "name": "Boeing",             "domain": "boeing.com",         "sector": "Industrial",    "index": ["SP500"],             "default_market_cap": 130000000000},

    # ── Comunicación ───────────────────────────────────────────
    {"ticker": "NFLX",   "name": "Netflix",            "domain": "netflix.com",        "sector": "Comunicación",  "index": ["SP500","NASDAQ100"], "default_market_cap": 310000000000},
    {"ticker": "DIS",    "name": "Disney",             "domain": "thewaltdisneycompany.com","sector": "Comunicación","index": ["SP500"],         "default_market_cap": 210000000000},
    {"ticker": "VZ",     "name": "Verizon",            "domain": "verizon.com",        "sector": "Comunicación",  "index": ["SP500"],             "default_market_cap": 170000000000},
    {"ticker": "T",      "name": "AT&T",               "domain": "att.com",            "sector": "Comunicación",  "index": ["SP500"],             "default_market_cap": 140000000000},
    {"ticker": "TEF.MC", "name": "Telefónica",         "domain": "telefonica.com",     "sector": "Comunicación",  "index": ["IBEX35"],            "default_market_cap": 25000000000},

    # ── Energía & Utilidades ───────────────────────────────────
    {"ticker": "XOM",    "name": "ExxonMobil",         "domain": "exxonmobil.com",     "sector": "Energía",       "index": ["SP500"],             "default_market_cap": 490000000000},
    {"ticker": "CVX",    "name": "Chevron",            "domain": "chevron.com",        "sector": "Energía",       "index": ["SP500"],             "default_market_cap": 280000000000},
    {"ticker": "SHEL",   "name": "Shell",              "domain": "shell.com",          "sector": "Energía",       "index": ["SP500"],             "default_market_cap": 220000000000},
    {"ticker": "COP",    "name": "ConocoPhillips",     "domain": "conocophillips.com", "sector": "Energía",       "index": ["SP500"],             "default_market_cap": 130000000000},
    {"ticker": "NEE",    "name": "NextEra Energy",     "domain": "nexteraenergy.com",  "sector": "Energía",       "index": ["SP500"],             "default_market_cap": 160000000000},
    {"ticker": "IBE.MC", "name": "Iberdrola",          "domain": "iberdrola.com",      "sector": "Energía",       "index": ["IBEX35"],            "default_market_cap": 90000000000},
    {"ticker": "REP.MC", "name": "Repsol",             "domain": "repsol.com",         "sector": "Energía",       "index": ["IBEX35"],            "default_market_cap": 20000000000},
]

# Index quotes for ticker bar
INDEX_TICKERS = {
    "S&P 500":         "^GSPC",
    "NASDAQ":          "^IXIC",
    "MSCI World":      "URTH",
    "MSCI Emergentes": "EEM",
    "IBEX 35":         "^IBEX",
    "Euro Stoxx 50":   "^STOXX50E",
    "Nikkei 225":      "^N225",
    "Oro":             "GC=F",
    "Petróleo Brent":  "BZ=F",
    "BTC/EUR":         "BTC-EUR",
    "EUR/USD":         "EURUSD=X",
    "EUR/JPY":         "EURJPY=X",
}

# Proxy futures for indices that don't publish extended-hours quotes directly on cash index
INDEX_PROXY_MAP = {
    "^GSPC": "ES=F",  # S&P 500 E-mini futures
    "^IXIC": "NQ=F",  # Nasdaq 100 E-mini futures
}

# In-memory cache (shorter TTL for real-time feel)
_quote_cache: dict = {}
CACHE_TTL = 60  # 1 minute — refresh more aggressively


def _is_fresh(key: str) -> bool:
    if key not in _quote_cache:
        return False
    return time.time() - _quote_cache[key]["ts"] < CACHE_TTL


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


from concurrent.futures import ThreadPoolExecutor, as_completed


def _fetch_ticker_extended(ticker: str) -> dict:
    """Fetch a single ticker with pre/post market and market state via yfinance."""
    import yfinance as yf
    try:
        t = yf.Ticker(ticker)
        fi = t.fast_info

        regular_price = getattr(fi, "last_price", None)
        prev_close    = getattr(fi, "previous_close", None)
        day_high      = getattr(fi, "day_high", None)
        day_low       = getattr(fi, "day_low", None)
        volume        = getattr(fi, "last_volume", None)
        market_cap    = getattr(fi, "market_cap", None)
        currency      = getattr(fi, "currency", "USD")

        # Extended hours prices from .info (slower but richer)
        pre_price  = None
        post_price = None
        market_state = "REGULAR"
        try:
            info = t.info
            pre_price    = info.get("preMarketPrice")
            post_price   = info.get("postMarketPrice")
            market_state = info.get("marketState", "REGULAR")
            # Official previous close and price from quote
            inf_prev = info.get("regularMarketPreviousClose") or info.get("previousClose")
            if inf_prev:
                prev_close = inf_prev
            inf_reg = info.get("regularMarketPrice") or info.get("currentPrice")
            if inf_reg:
                regular_price = inf_reg

            if not regular_price:
                regular_price = getattr(fi, "last_price", None)
            if not prev_close:
                prev_close = getattr(fi, "previous_close", None)
            if not day_high:
                day_high = info.get("dayHigh") or info.get("regularMarketDayHigh")
            if not day_low:
                day_low = info.get("dayLow") or info.get("regularMarketDayLow")
            if not volume:
                volume = info.get("volume") or info.get("regularMarketVolume")
            if not market_cap:
                market_cap = info.get("marketCap")
            if not currency:
                currency = info.get("currency", "USD")
        except Exception:
            pass

        # Pre/post change figures from Yahoo (already returned as percentages, e.g. 0.22 = +0.22%)
        pre_chg_pct  = None
        post_chg_pct = None
        try:
            raw_pre  = info.get("preMarketChangePercent")
            raw_post = info.get("postMarketChangePercent")
            if raw_pre is not None:
                pre_chg_pct = round(raw_pre, 2)
            if raw_post is not None:
                post_chg_pct = round(raw_post, 2)
        except Exception:
            pass

        # Compute pre/post change percent if price is available but percent wasn't returned
        if pre_price and regular_price and regular_price > 0 and pre_chg_pct is None:
            pre_chg_pct = round((pre_price - regular_price) / regular_price * 100, 2)
        if post_price and regular_price and regular_price > 0 and post_chg_pct is None:
            post_chg_pct = round((post_price - regular_price) / regular_price * 100, 2)

        # Choose the most current price based on market state
        if market_state == "PRE" and pre_price:
            display_price = pre_price
        elif market_state in ("POST", "POSTPOST") and post_price:
            display_price = post_price
        else:
            display_price = regular_price

        if display_price is None:
            return {"ticker": ticker, "error": "no_price"}

        # ── Change calculation ──────────────────────────────────────────────────
        # For regular/closed: compare regular_price vs prev_close (yesterday)
        # For pre/post market: compare extended price vs regular_price (today's/yesterday's close)
        if market_state == "PRE" and pre_price and regular_price:
            ref = regular_price
            chg = round(display_price - ref, 4)
            chg_pct = pre_chg_pct if pre_chg_pct is not None else round((display_price - ref) / ref * 100, 2)
        elif market_state in ("POST", "POSTPOST") and post_price and regular_price:
            ref = regular_price
            chg = round(display_price - ref, 4)
            chg_pct = post_chg_pct if post_chg_pct is not None else round((display_price - ref) / ref * 100, 2)
        else:
            # REGULAR or CLOSED: change vs previous close
            ref = prev_close or regular_price or display_price
            chg = round(display_price - ref, 4) if ref else 0
            chg_pct = round((display_price - ref) / ref * 100, 2) if ref and ref > 0 else 0.0

        def _r(v, precision=None):
            if v is None:
                return None
            if precision is not None:
                return round(v, precision)
            decimals = 2 if abs(v) >= 1 else 6
            return round(v, decimals)

        return {
            "ticker":              ticker,
            "price":               _r(display_price),
            "regular_price":       _r(regular_price),
            "pre_market_price":    _r(pre_price),
            "post_market_price":   _r(post_price),
            "pre_market_change_pct":  pre_chg_pct,
            "post_market_change_pct": post_chg_pct,
            "market_state":        market_state,
            "prev_close":          _r(prev_close),
            "change":              round(chg, 4),
            "change_pct":          chg_pct,
            "day_high":            _r(day_high),
            "day_low":             _r(day_low),
            "volume":              int(volume) if volume else None,
            "market_cap":          market_cap,
            "currency":            currency or "USD",
            "last_updated":        _now_iso(),
        }
    except Exception as e:
        logger.debug(f"Error fetching {ticker}: {e}")
        return {"ticker": ticker, "error": str(e)}


def _fetch_quotes_extended(tickers: list[str]) -> dict:
    """Fetch all tickers in parallel using extended info (pre/post market)."""
    result = {}
    max_workers = min(20, len(tickers))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(_fetch_ticker_extended, t): t for t in tickers}
        for future in as_completed(futures, timeout=25):
            try:
                data = future.result()
                if "error" not in data:
                    result[data["ticker"]] = data
            except Exception as e:
                logger.debug(f"Future error: {e}")
    return result


@router.get("/quotes")
async def get_quotes(index: Optional[str] = None):
    """Return quotes for the full stock universe, optionally filtered by index."""
    universe = STOCK_UNIVERSE
    if index and index != "Todos":
        universe = [s for s in STOCK_UNIVERSE if index in s["index"]]

    tickers = [s["ticker"] for s in universe]

    # Check cache
    cache_key = ",".join(sorted(tickers))
    if _is_fresh(cache_key):
        cached_data = _quote_cache[cache_key]
        quotes = cached_data["data"]
        cache_ts = cached_data["ts"]
    else:
        quotes = await asyncio.to_thread(_fetch_quotes_extended, tickers)
        cache_ts = time.time()
        _quote_cache[cache_key] = {"data": quotes, "ts": cache_ts}

    result = []
    for stock in universe:
        q = quotes.get(stock["ticker"], {})
        result.append({
            **stock,
            "price":               q.get("price"),
            "regular_price":       q.get("regular_price"),
            "pre_market_price":    q.get("pre_market_price"),
            "post_market_price":   q.get("post_market_price"),
            "market_state":        q.get("market_state", "REGULAR"),
            "change":              q.get("change"),
            "change_pct":          q.get("change_pct"),
            "prev_close":          q.get("prev_close"),
            "market_cap":          q.get("market_cap") or stock.get("default_market_cap", 100_000_000_000),
            "volume":              q.get("volume"),
            "currency":            q.get("currency", "USD"),
            "day_high":            q.get("day_high"),
            "day_low":             q.get("day_low"),
            "last_updated":        q.get("last_updated", _now_iso()),
            "logo_url":            f"https://www.google.com/s2/favicons?domain={stock['domain']}&sz=128",
        })

    return {
        "stocks":          result,
        "count":           len(result),
        "cached":          _is_fresh(cache_key),
        "cache_timestamp": datetime.fromtimestamp(cache_ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


@router.get("/indices")
async def get_indices():
    """Return live index quotes for the ticker bar — with extended hours and futures proxies."""
    cache_key = "indices"
    if _is_fresh(cache_key):
        return _quote_cache[cache_key]["data"]

    tickers = list(INDEX_TICKERS.values())
    proxy_tickers = [p for p in INDEX_PROXY_MAP.values() if p not in tickers]
    all_tickers = tickers + proxy_tickers

    quotes = await asyncio.to_thread(_fetch_quotes_extended, all_tickers)

    domain_map = {
        "S&P 500":         "spglobal.com",
        "NASDAQ":          "nasdaq.com",
        "MSCI World":      "msci.com",
        "MSCI Emergentes": "msci.com",
        "IBEX 35":         "bolsasymercados.es",
        "Euro Stoxx 50":   "stoxx.com",
        "Nikkei 225":      "nikkei.com",
        "Oro":             "gold.org",
        "Petróleo Brent":  "theice.com",
        "BTC/EUR":         "bitcoin.org",
        "EUR/USD":         "ecb.europa.eu",
        "EUR/JPY":         "boj.or.jp",
    }
    sector_map = {
        "S&P 500":         "Índice Bursátil USA",
        "NASDAQ":          "Índice Tecnológico",
        "MSCI World":      "Índice Global Desarrollado",
        "MSCI Emergentes": "Índice Mercados Emergentes",
        "IBEX 35":         "Índice Bursátil España",
        "Euro Stoxx 50":   "Índice Bursátil Europeo",
        "Nikkei 225":      "Índice Bursátil Japón",
        "Oro":             "Materia Prima (Metales)",
        "Petróleo Brent":  "Materia Prima (Energía)",
        "BTC/EUR":         "Criptoactivo",
        "EUR/USD":         "Mercado de Divisas (Forex)",
        "EUR/JPY":         "Mercado de Divisas (Forex)",
    }

    result = []
    for name, ticker in INDEX_TICKERS.items():
        q = dict(quotes.get(ticker, {}))

        # Check if cash index needs futures proxy for pre-market or post-market
        if ticker in INDEX_PROXY_MAP:
            proxy_sym = INDEX_PROXY_MAP[ticker]
            proxy_q = quotes.get(proxy_sym, {})
            proxy_p = proxy_q.get("price") or proxy_q.get("regular_price")
            proxy_prev = proxy_q.get("prev_close")

            if proxy_p and proxy_prev and proxy_prev > 0:
                proxy_pct = round((proxy_p - proxy_prev) / proxy_prev * 100, 2)
                base_p = q.get("regular_price") or q.get("price") or q.get("prev_close")

                # If market is PRE or not in regular session with no direct pre_market_price
                if q.get("market_state") == "PRE" or (q.get("market_state") != "REGULAR" and not q.get("pre_market_price")):
                    if base_p:
                        implied_pre = round(base_p * (1 + proxy_pct / 100), 2)
                        q["pre_market_price"] = implied_pre
                        q["pre_market_change_pct"] = proxy_pct
                        q["price"] = implied_pre
                        q["change"] = round(implied_pre - base_p, 2)
                        q["change_pct"] = proxy_pct
                        q["market_state"] = "PRE"
                elif q.get("market_state") in ("POST", "POSTPOST") and not q.get("post_market_price"):
                    if base_p:
                        implied_post = round(base_p * (1 + proxy_pct / 100), 2)
                        q["post_market_price"] = implied_post
                        q["post_market_change_pct"] = proxy_pct
                        q["price"] = implied_post
                        q["change"] = round(implied_post - base_p, 2)
                        q["change_pct"] = proxy_pct

        cur = "EUR" if ticker in ("^IBEX", "^GDAXI", "^STOXX50E", "BTC-EUR") else "JPY" if ticker in ("^N225", "EURJPY=X") else "USD"
        result.append({
            "name":              name,
            "ticker":            ticker,
            "domain":            domain_map.get(name, "finance.yahoo.com"),
            "sector":            sector_map.get(name, "Índice de Mercado"),
            "index":             [name],
            "price":             q.get("price"),
            "regular_price":     q.get("regular_price"),
            "pre_market_price":  q.get("pre_market_price"),
            "post_market_price": q.get("post_market_price"),
            "pre_market_change_pct":  q.get("pre_market_change_pct"),
            "post_market_change_pct": q.get("post_market_change_pct"),
            "market_state":      q.get("market_state", "REGULAR"),
            "change":            q.get("change"),
            "change_pct":        q.get("change_pct"),
            "prev_close":        q.get("prev_close"),
            "day_high":          q.get("day_high"),
            "day_low":           q.get("day_low"),
            "volume":            q.get("volume"),
            "currency":          cur,
            "market_cap":        q.get("market_cap"),
            "last_updated":      q.get("last_updated", _now_iso()),
            "logo_url":          "",
        })

    data = {
        "indices":         result,
        "cache_timestamp": _now_iso(),
    }
    _quote_cache[cache_key] = {"data": data, "ts": time.time()}
    return data


_history_cache: dict = {}
HISTORY_CACHE_TTL = 120  # 2 minutes


def _fetch_history_sync(ticker: str, period: str) -> dict:
    import yfinance as yf
    valid_periods = {"1d", "5d", "1mo", "6mo", "1y", "5y", "max"}
    if period not in valid_periods:
        period = "1mo"

    # For 1mo, use 1h interval for rich, recurrent data points (~150-250 points instead of 20)
    interval = (
        "5m" if period == "1d"
        else "15m" if period == "5d"
        else "1h" if period == "1mo"
        else "1d" if period in ("6mo", "1y")
        else "1wk"
    )

    target_ticker = ticker
    try:
        t = yf.Ticker(target_ticker)
        h = t.history(period=period, interval=interval)
        if h.empty and target_ticker in INDEX_PROXY_MAP and period in ("1d", "5d"):
            t = yf.Ticker(INDEX_PROXY_MAP[target_ticker])
            h = t.history(period=period, interval=interval)
        if h.empty and period == "1mo":
            # Fallback to daily if 1h not available
            h = t.history(period="1mo", interval="1d")
        elif h.empty and period in ("1d", "5d"):
            h = t.history(period="1mo", interval="1d")

        points = []
        for idx, row in h.iterrows():
            close_val = row.get("Close")
            if close_val is None or (isinstance(close_val, float) and (close_val != close_val)):
                continue
            p = round(float(close_val), 4)
            if period == "1d":
                lbl = idx.strftime("%H:%M")
                d_str = idx.strftime("%d %b, %H:%M")
            elif period in ("5d", "1mo"):
                lbl = idx.strftime("%d %b")
                d_str = idx.strftime("%d %b, %H:%M")
            else:
                lbl = idx.strftime("%b %y")
                d_str = idx.strftime("%d %b %Y")
            points.append({
                "date": d_str,
                "time": lbl,
                "price": p
            })

        if not points:
            fi = t.fast_info
            curr = getattr(fi, "last_price", 100.0) or 100.0
            prev = getattr(fi, "previous_close", curr) or curr
            points = [
                {"date": "Inicio", "time": "Inicio", "price": round(float(prev), 4)},
                {"date": "Actual", "time": "Actual", "price": round(float(curr), 4)},
            ]

        first_p = points[0]["price"] if points else 0
        last_p = points[-1]["price"] if points else 0
        chg = round(last_p - first_p, 4)
        chg_pct = round((last_p - first_p) / first_p * 100, 2) if first_p else 0
        prices = [pt["price"] for pt in points]

        return {
            "ticker": ticker,
            "period": period,
            "count": len(points),
            "period_change": chg,
            "period_change_pct": chg_pct,
            "min_price": min(prices) if prices else 0,
            "max_price": max(prices) if prices else 0,
            "points": points,
        }
    except Exception as e:
        logger.warning(f"Error fetching history for {ticker} ({period}): {e}")
        return {
            "ticker": ticker,
            "period": period,
            "count": 0,
            "period_change": 0,
            "period_change_pct": 0,
            "min_price": 0,
            "max_price": 0,
            "points": [],
            "error": str(e),
        }


@router.get("/history")
async def get_market_history(ticker: str, period: str = "1mo"):
    """Return historical prices for a market ticker with period change and min/max."""
    cache_key = f"{ticker}_{period}"
    now = time.time()
    if cache_key in _history_cache:
        cached = _history_cache[cache_key]
        if now - cached["ts"] < HISTORY_CACHE_TTL:
            return cached["data"]

    data = await asyncio.to_thread(_fetch_history_sync, ticker, period)
    _history_cache[cache_key] = {"data": data, "ts": now}
    return data



# ── Curated stock universe with metadata ───────────────────────────────────────