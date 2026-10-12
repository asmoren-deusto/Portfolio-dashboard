"""
Market data router — real-time stock quotes via Yahoo Finance.
Includes pre/post market prices, market state, and data freshness timestamps.
"""
from fastapi import APIRouter, Depends
from typing import Optional
import asyncio
import logging
import time
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PriceCache
from app.routers.portfolio import _get_all_transactions, _get_asset
from app.services.finance_engine import calculate_positions

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
    {"ticker": "MC.PA",  "name": "LVMH",              "domain": "lvmh.com",           "sector": "Consumo",       "index": ["CAC40"],             "default_market_cap": 350000000000},
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

    # ── ETFs Cartera (Réplicas de Fondos) ──────────────────────
    {"ticker": "URTH",   "name": "iShares MSCI World ETF",            "domain": "ishares.com",   "sector": "ETF Cartera", "index": ["ETFs", "MSCI World"], "default_market_cap": 4500000000},
    {"ticker": "ACWI",   "name": "iShares MSCI ACWI ETF",             "domain": "ishares.com",   "sector": "ETF Cartera", "index": ["ETFs", "MSCI World"], "default_market_cap": 22000000000},
    {"ticker": "XLK",    "name": "Technology Select Sector SPDR",     "domain": "ssga.com",      "sector": "ETF Cartera", "index": ["ETFs", "SP500"],      "default_market_cap": 72000000000},
    {"ticker": "COWZ",   "name": "Pacer US Cash Cows 100 ETF",        "domain": "paceretfs.com", "sector": "ETF Cartera", "index": ["ETFs"],               "default_market_cap": 24000000000},
    {"ticker": "EEM",    "name": "iShares MSCI Emerging Markets ETF", "domain": "ishares.com",   "sector": "ETF Cartera", "index": ["ETFs", "Emergentes"], "default_market_cap": 20000000000},
    {"ticker": "EWJ",    "name": "iShares MSCI Japan ETF",            "domain": "ishares.com",   "sector": "ETF Cartera", "index": ["ETFs"],               "default_market_cap": 14000000000},
    {"ticker": "FEZ",    "name": "SPDR EURO STOXX 50 ETF",            "domain": "ssga.com",      "sector": "ETF Cartera", "index": ["ETFs", "Euro 50"],    "default_market_cap": 4000000000},
    {"ticker": "EFV",    "name": "iShares MSCI EAFE Value ETF",       "domain": "ishares.com",   "sector": "ETF Cartera", "index": ["ETFs"],               "default_market_cap": 17000000000},
]

# Index quotes for ticker bar
INDEX_TICKERS = {
    "S&P 500":         "^GSPC",
    "NASDAQ":          "^IXIC",
    "MSCI World":      "URTH",
    "Emergentes":      "EEM",
    "IBEX 35":         "^IBEX",
    "Euro 50":         "^STOXX50E",
    "Nikkei 225":      "^N225",
    "Oro":             "GC=F",
    "Petróleo":        "BZ=F",
    "BTC/EUR":         "BTC-EUR",
    "EUR/USD":         "EURUSD=X",
    "EUR/JPY":         "EURJPY=X",
}

# Proxy futures for indices that don't publish extended-hours quotes directly on cash index
INDEX_PROXY_MAP = {
    "^GSPC": "ES=F",   # S&P 500 E-mini futures (CME Globex)
    "^IXIC": "NQ=F",   # Nasdaq 100 E-mini futures (CME Globex)
    "^N225": "NIY=F",  # Nikkei 225 Yen Futures (CME Globex)
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


from zoneinfo import ZoneInfo
from concurrent.futures import ThreadPoolExecutor, as_completed


def get_market_session_for_ticker(ticker: str, dt_utc: datetime | None = None) -> str:
    """
    Returns the exact active trading session state for a given asset:
    - Crypto ('BTC-EUR', 'BTC'): always 'REGULAR' (24/7).
    - Forex ('=X'): 'REGULAR' (24/5 from Sunday 21:00 UTC to Friday 22:00 UTC), 'CLOSED' on weekends.
    - Commodity futures ('GC=F', 'BZ=F', etc.): 'REGULAR' when continuous trading is active
      (Sun 18:00 ET to Fri 17:00 ET, excluding daily 17:00-18:00 ET halt), else 'CLOSED'.
    - European stocks & indices ('.MC', '.PA', '.DE', '.AS', '^IBEX', '^STOXX50E'): 'REGULAR' (09:00-17:30 CET) or 'CLOSED'.
    - Asian stocks & indices ('^N225', '.T'): 'REGULAR' during Tokyo hours (09:00-15:30 JST).
      Outside Tokyo hours, if CME Nikkei futures are trading, returns 'FUTURES'.
    - US cash indices with futures proxy ('^GSPC', '^IXIC'):
      - 'REGULAR': 09:30-16:00 ET weekdays.
      - 'POST': 16:00-20:00 ET weekdays (after-hours).
      - 'PRE': 04:00-09:30 ET weekdays (official US pre-market).
      - 'FUTURES': overnight CME Globex trading (20:00-04:00 ET weekdays, Sunday 18:00-24:00 ET).
      - 'CLOSED': weekends (Friday 17:00 ET to Sunday 18:00 ET) and daily halt (17:00-18:00 ET).
    - US index futures ('ES=F', 'NQ=F', 'NIY=F'): 'REGULAR' whenever Globex is trading, else 'CLOSED'.
    - US stocks & ETFs (AAPL, MSFT, URTH, EEM):
      - 'REGULAR': 09:30-16:00 ET weekdays.
      - 'PRE': 04:00-09:30 ET weekdays.
      - 'POST': 16:00-20:00 ET weekdays.
      - 'CLOSED': weekends & overnight.
    """
    if "BTC" in ticker or ticker.endswith("-USD") or ticker.endswith("-EUR"):
        return "REGULAR"

    if dt_utc is None:
        dt_utc = datetime.now(timezone.utc)

    # Forex pairs (24/5 from Sunday 21:00 UTC to Friday 22:00 UTC)
    if ticker.endswith("=X"):
        weekday = dt_utc.weekday()
        if weekday == 5:  # Saturday
            return "CLOSED"
        if weekday == 6 and dt_utc.hour < 21:  # Sunday before 21:00 UTC
            return "CLOSED"
        if weekday == 4 and dt_utc.hour >= 22:  # Friday after 22:00 UTC
            return "CLOSED"
        return "REGULAR"

    dt_ny = dt_utc.astimezone(ZoneInfo("America/New_York"))
    weekday_ny = dt_ny.weekday()  # 0=Mon..4=Fri, 5=Sat, 6=Sun
    mins_ny = dt_ny.hour * 60 + dt_ny.minute

    # Direct index futures (ES=F, NQ=F, NIY=F)
    if ticker in ("ES=F", "NQ=F", "NIY=F", "YM=F", "RTY=F"):
        if weekday_ny == 5 or (weekday_ny == 6 and dt_ny.hour < 18) or (weekday_ny == 4 and mins_ny >= 17 * 60):
            return "CLOSED"
        if 0 <= weekday_ny <= 3 and 17 * 60 <= mins_ny < 18 * 60:
            return "CLOSED"
        return "REGULAR"

    # Commodity futures (GC=F, BZ=F, CL=F, etc.)
    if ticker.endswith("=F"):
        if weekday_ny == 5 or (weekday_ny == 6 and dt_ny.hour < 18) or (weekday_ny == 4 and mins_ny >= 17 * 60):
            return "CLOSED"
        if 0 <= weekday_ny <= 3 and 17 * 60 <= mins_ny < 18 * 60:
            return "CLOSED"
        return "REGULAR"

    # European assets (Stocks & Indices)
    if any(ticker.endswith(s) for s in (".MC", ".PA", ".DE", ".AS")) or ticker in ("^IBEX", "^STOXX50E", "^GDAXI"):
        dt_eu = dt_utc.astimezone(ZoneInfo("Europe/Madrid"))
        if dt_eu.weekday() >= 5:
            return "CLOSED"
        mins_eu = dt_eu.hour * 60 + dt_eu.minute
        if 9 * 60 <= mins_eu < 17 * 60 + 30:
            return "REGULAR"
        return "CLOSED"

    # Asian assets
    if ticker in ("^N225",) or ticker.endswith(".T"):
        dt_tokyo = dt_utc.astimezone(ZoneInfo("Asia/Tokyo"))
        weekday_tokyo = dt_tokyo.weekday()
        mins_tokyo = dt_tokyo.hour * 60 + dt_tokyo.minute
        if weekday_tokyo < 5 and 9 * 60 <= mins_tokyo < 15 * 60 + 30:
            return "REGULAR"
        # If outside Tokyo cash hours, check if proxy future is trading on Globex
        if ticker in INDEX_PROXY_MAP:
            if weekday_ny == 5 or (weekday_ny == 6 and dt_ny.hour < 18) or (weekday_ny == 4 and mins_ny >= 17 * 60):
                return "CLOSED"
            if 0 <= weekday_ny <= 3 and 17 * 60 <= mins_ny < 18 * 60:
                return "CLOSED"
            return "FUTURES"
        return "CLOSED"

    # Cash Indices with futures proxies (^GSPC, ^IXIC)
    if ticker in INDEX_PROXY_MAP:
        if weekday_ny == 5 or (weekday_ny == 4 and mins_ny >= 17 * 60):
            return "CLOSED"
        if weekday_ny == 6:
            return "FUTURES" if dt_ny.hour >= 18 else "CLOSED"

        if 9 * 60 + 30 <= mins_ny < 16 * 60:
            return "REGULAR"
        elif 4 * 60 <= mins_ny < 9 * 60 + 30:
            return "PRE"
        elif 16 * 60 <= mins_ny < 20 * 60:
            return "POST"
        else:
            return "FUTURES"

    # US stocks and ETFs (default)
    if weekday_ny >= 5:
        return "CLOSED"

    if 9 * 60 + 30 <= mins_ny < 16 * 60:
        return "REGULAR"
    elif 4 * 60 <= mins_ny < 9 * 60 + 30:
        return "PRE"
    elif 16 * 60 <= mins_ny < 20 * 60:
        return "POST"
    else:
        return "CLOSED"


def _fetch_yahoo_chart_quote(ticker: str) -> dict | None:
    """Fallback quote fetch through Yahoo's chart endpoint when yfinance is rate-limited."""
    import httpx
    from urllib.parse import quote

    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{quote(ticker, safe='')}"
        response = httpx.get(
            url,
            params={"range": "1d", "interval": "1m", "includePrePost": "true"},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=12,
        )
        response.raise_for_status()
        chart = response.json().get("chart", {})
        result = (chart.get("result") or [None])[0]
        if not result:
            return None

        meta = result.get("meta", {})
        quote_data = (result.get("indicators", {}).get("quote") or [{}])[0]
        timestamps = result.get("timestamp") or []
        closes = quote_data.get("close") or []
        valid_prices = [
            (timestamp, price)
            for timestamp, price in zip(timestamps, closes)
            if price is not None
        ]
        last_price = valid_prices[-1][1] if valid_prices else None
        regular_price = meta.get("regularMarketPrice") or last_price
        if regular_price is None:
            return None

        market_state = get_market_session_for_ticker(ticker)

        previous_close = meta.get("previousClose") or meta.get("chartPreviousClose")
        raw_pre = meta.get("preMarketPrice")
        raw_post = meta.get("postMarketPrice")

        # Fallback to actual pre/post trades from valid_prices if meta leaves them empty
        current_period = meta.get("currentTradingPeriod", {})
        pre_start = current_period.get("pre", {}).get("start", 0)
        post_start = current_period.get("post", {}).get("start", 0)

        if raw_pre is None and market_state == "PRE" and valid_prices and valid_prices[-1][0] >= pre_start:
            raw_pre = valid_prices[-1][1]

        if raw_post is None and market_state in ("POST", "POSTPOST") and valid_prices and valid_prices[-1][0] >= post_start:
            raw_post = valid_prices[-1][1]

        pre_price = raw_pre if market_state == "PRE" else None
        post_price = raw_post if market_state in ("POST", "POSTPOST") else None
        display_price = (
            pre_price if market_state == "PRE" and pre_price is not None
            else post_price if market_state in ("POST", "POSTPOST") and post_price is not None
            else regular_price
        )

        reference = previous_close or regular_price
        change = display_price - reference if reference else 0.0
        change_pct = change / reference * 100 if reference else 0.0

        def latest_value(key: str):
            values = quote_data.get(key) or []
            return next((value for value in reversed(values) if value is not None), None)

        price_precision = 4 if ticker == "EURUSD=X" else None

        def rounded(value):
            if value is None:
                return None
            decimals = price_precision if price_precision is not None else (2 if abs(value) >= 1 else 6)
            return round(value, decimals)

        return {
            "ticker": ticker,
            "price": rounded(display_price),
            "regular_price": rounded(regular_price),
            "pre_market_price": rounded(pre_price),
            "post_market_price": rounded(post_price),
            "pre_market_change_pct": round((pre_price - regular_price) / regular_price * 100, 2) if pre_price is not None and regular_price else None,
            "post_market_change_pct": round((post_price - regular_price) / regular_price * 100, 2) if post_price is not None and regular_price else None,
            "market_state": market_state,
            "prev_close": rounded(previous_close),
            "change": round(change, 4),
            "change_pct": round(change_pct, 2),
            "day_high": rounded(max((value for value in quote_data.get("high", []) if value is not None), default=meta.get("regularMarketDayHigh"))),
            "day_low": rounded(min((value for value in quote_data.get("low", []) if value is not None), default=meta.get("regularMarketDayLow"))),
            "volume": int(latest_value("volume") or meta.get("regularMarketVolume") or 0) or None,
            "market_cap": meta.get("marketCap"),
            "currency": meta.get("currency", "USD"),
            "last_updated": _now_iso(),
        }
    except Exception as e:
        logger.debug(f"Yahoo chart fallback failed for {ticker}: {e}")
        return None


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

        # Extended hours prices & fallback via fast chart quote
        pre_price  = None
        post_price = None
        pre_chg_pct  = None
        post_chg_pct = None
        market_state = get_market_session_for_ticker(ticker)

        # If regular price is missing or market is PRE/POST, use fast chart quote fallback
        if regular_price is None or market_state in ("PRE", "POST", "POSTPOST"):
            chart_q = _fetch_yahoo_chart_quote(ticker)
            if chart_q:
                if regular_price is None:
                    regular_price = chart_q.get("regular_price")
                if not prev_close:
                    prev_close = chart_q.get("prev_close")
                if not day_high:
                    day_high = chart_q.get("day_high")
                if not day_low:
                    day_low = chart_q.get("day_low")
                if not volume:
                    volume = chart_q.get("volume")
                if not market_cap:
                    market_cap = chart_q.get("market_cap")
                if not currency:
                    currency = chart_q.get("currency")
                if market_state == "PRE":
                    pre_price = chart_q.get("pre_market_price")
                    pre_chg_pct = chart_q.get("pre_market_change_pct")
                elif market_state in ("POST", "POSTPOST"):
                    post_price = chart_q.get("post_market_price")
                    post_chg_pct = chart_q.get("post_market_change_pct")

        # Choose the most current price based on the active physical market state
        if market_state == "PRE":
            post_price = None
            post_chg_pct = None
            display_price = pre_price if pre_price is not None else regular_price
        elif market_state in ("POST", "POSTPOST"):
            pre_price = None
            pre_chg_pct = None
            display_price = post_price if post_price is not None else regular_price
        else:
            pre_price = None
            post_price = None
            pre_chg_pct = None
            post_chg_pct = None
            display_price = regular_price

        if display_price is None:
            fallback = _fetch_yahoo_chart_quote(ticker)
            if fallback:
                return fallback
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

        price_precision = 4 if ticker == "EURUSD=X" else None

        return {
            "ticker":              ticker,
            "price":               _r(display_price, price_precision),
            "regular_price":       _r(regular_price, price_precision),
            "pre_market_price":    _r(pre_price, price_precision),
            "post_market_price":   _r(post_price, price_precision),
            "pre_market_change_pct":  pre_chg_pct,
            "post_market_change_pct": post_chg_pct,
            "market_state":        market_state,
            "prev_close":          _r(prev_close, price_precision),
            "change":              round(chg, 4),
            "change_pct":          chg_pct,
            "day_high":            _r(day_high, price_precision),
            "day_low":             _r(day_low, price_precision),
            "volume":              int(volume) if volume else None,
            "market_cap":          market_cap,
            "currency":            currency or "USD",
            "last_updated":        _now_iso(),
        }
    except Exception as e:
        logger.debug(f"Error fetching {ticker}: {e}")
        fallback = _fetch_yahoo_chart_quote(ticker)
        if fallback:
            return fallback
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
        "Emergentes":      "msci.com",
        "MSCI Emergentes": "msci.com",
        "IBEX 35":         "bolsasymercados.es",
        "Euro 50":         "stoxx.com",
        "Euro Stoxx 50":   "stoxx.com",
        "Nikkei 225":      "nikkei.com",
        "Oro":             "gold.org",
        "Petróleo":        "theice.com",
        "Petróleo Brent":  "theice.com",
        "BTC/EUR":         "bitcoin.org",
        "EUR/USD":         "ecb.europa.eu",
        "EUR/JPY":         "boj.or.jp",
    }
    sector_map = {
        "S&P 500":         "Índice Bursátil USA",
        "NASDAQ":          "Índice Tecnológico",
        "MSCI World":      "Índice Global Desarrollado",
        "Emergentes":      "Índice Mercados Emergentes",
        "MSCI Emergentes": "Índice Mercados Emergentes",
        "IBEX 35":         "Índice Bursátil España",
        "Euro 50":         "Índice Bursátil Europeo",
        "Euro Stoxx 50":   "Índice Bursátil Europeo",
        "Nikkei 225":      "Índice Bursátil Japón",
        "Oro":             "Materia Prima (Metales)",
        "Petróleo":        "Materia Prima (Energía)",
        "Petróleo Brent":  "Materia Prima (Energía)",
        "BTC/EUR":         "Criptoactivo",
        "EUR/USD":         "Mercado de Divisas (Forex)",
        "EUR/JPY":         "Mercado de Divisas (Forex)",
    }

    result = []
    for name, ticker in INDEX_TICKERS.items():
        q = dict(quotes.get(ticker, {}))

        idx_state = get_market_session_for_ticker(ticker)
        q["market_state"] = idx_state

        if idx_state == "REGULAR":
            q["pre_market_price"] = None
            q["post_market_price"] = None
            q["pre_market_change_pct"] = None
            q["post_market_change_pct"] = None
            base_p = q.get("regular_price") or q.get("price")
            prev_p = q.get("prev_close")
            if base_p:
                q["price"] = base_p
                if prev_p and prev_p > 0:
                    q["change"] = round(base_p - prev_p, 4)
                    q["change_pct"] = round((base_p - prev_p) / prev_p * 100, 2)

        elif ticker in INDEX_PROXY_MAP and idx_state in ("PRE", "POST", "FUTURES"):
            # Cash index projected via active futures proxy (ES=F, NQ=F, NIY=F)
            proxy_sym = INDEX_PROXY_MAP[ticker]
            proxy_q = quotes.get(proxy_sym, {})
            proxy_p = proxy_q.get("price") or proxy_q.get("regular_price")
            proxy_prev = proxy_q.get("prev_close")

            if proxy_p and proxy_prev and proxy_prev > 0:
                proxy_pct = round((proxy_p - proxy_prev) / proxy_prev * 100, 2)
                base_p = q.get("regular_price") or q.get("price") or q.get("prev_close")

                if base_p:
                    implied_ext = round(base_p * (1 + proxy_pct / 100), 2)
                    implied_change = round(implied_ext - base_p, 2)
                    if idx_state == "PRE":
                        q["pre_market_price"] = implied_ext
                        q["pre_market_change_pct"] = proxy_pct
                        q["post_market_price"] = None
                        q["post_market_change_pct"] = None
                    elif idx_state in ("POST", "POSTPOST"):
                        q["post_market_price"] = implied_ext
                        q["post_market_change_pct"] = proxy_pct
                        q["pre_market_price"] = None
                        q["pre_market_change_pct"] = None
                    else:  # FUTURES (overnight Globex session)
                        q["pre_market_price"] = implied_ext
                        q["pre_market_change_pct"] = proxy_pct
                        q["post_market_price"] = None
                        q["post_market_change_pct"] = None

                    q["price"] = implied_ext
                    q["change"] = implied_change
                    q["change_pct"] = proxy_pct
                    q["regular_price"] = base_p

        elif idx_state in ("PRE", "POST"):
            # Asset with direct pre/post data (e.g. ETFs like URTH, EEM)
            if idx_state == "PRE" and q.get("pre_market_price") is not None:
                q["price"] = q["pre_market_price"]
                if q.get("pre_market_change_pct") is not None:
                    q["change_pct"] = q["pre_market_change_pct"]
            elif idx_state in ("POST", "POSTPOST") and q.get("post_market_price") is not None:
                q["price"] = q["post_market_price"]
                if q.get("post_market_change_pct") is not None:
                    q["change_pct"] = q["post_market_change_pct"]
            else:
                base_p = q.get("regular_price") or q.get("price") or q.get("prev_close")
                if base_p:
                    q["price"] = base_p

        elif idx_state == "CLOSED":
            q["pre_market_price"] = None
            q["post_market_price"] = None
            q["pre_market_change_pct"] = None
            q["post_market_change_pct"] = None
            base_p = q.get("regular_price") or q.get("price") or q.get("prev_close")
            prev_p = q.get("prev_close")
            if base_p:
                q["price"] = base_p
                if prev_p and prev_p > 0:
                    q["change"] = round(base_p - prev_p, 4)
                    q["change_pct"] = round((base_p - prev_p) / prev_p * 100, 2)

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


# Fixed whitelist: public index data only, no user-supplied tickers.
BENCHMARK_TICKERS = {
    "sp500": "^GSPC",
    "msci_world": "URTH",
    "nasdaq100": "QQQ",
    "eurostoxx50": "^STOXX50E",
    "nikkei225": "^N225",
}
BENCHMARK_PERIODS = {"1mo", "3mo", "6mo", "1y", "2y", "5y"}
BENCHMARK_CACHE_TTL = 1800
_benchmark_cache: dict = {}


def _fetch_benchmarks_sync(period: str) -> dict:
    import yfinance as yf
    from app.routers.portfolio import _get_ecb_deposit_rate

    closes: dict[str, dict[str, float]] = {}
    for key, ticker in BENCHMARK_TICKERS.items():
        hist = yf.Ticker(ticker).history(period=period, interval="1d")
        closes[key] = {
            str(idx.date()): float(row["Close"])
            for idx, row in hist.iterrows()
            if row["Close"] == row["Close"] and row["Close"] > 0
        }

    dates = sorted({d for series in closes.values() for d in series})
    if not dates:
        return {"period": period, "points": []}

    last: dict[str, float] = {}
    base: dict[str, float] = {}
    bce_factor = 1.0
    prev_date = None
    points = []
    for d in dates:
        point: dict = {"date": d}
        for key, series in closes.items():
            if d in series:
                last[key] = series[d]
                base.setdefault(key, series[d])
            point[key] = round((last[key] / base[key] - 1.0) * 100.0, 2) if key in last else 0.0

        if prev_date is not None:
            days = (datetime.strptime(d, "%Y-%m-%d") - datetime.strptime(prev_date, "%Y-%m-%d")).days
            if days > 0:
                bce_factor *= (1.0 + _get_ecb_deposit_rate(d) / 100.0) ** (days / 365.25)
        prev_date = d
        point["bce_rate"] = round((bce_factor - 1.0) * 100.0, 2)
        points.append(point)

    return {"period": period, "points": points}


@router.get("/benchmarks")
async def get_benchmarks(period: str = "1y"):
    """Public index performance (% since start of period) for S&P 500, MSCI World, NASDAQ 100, Euro Stoxx 50, Nikkei 225 and the ECB deposit rate."""
    if period not in BENCHMARK_PERIODS:
        period = "1y"
    cached = _benchmark_cache.get(period)
    if cached and time.time() - cached["ts"] < BENCHMARK_CACHE_TTL:
        return cached["data"]

    data = await asyncio.to_thread(_fetch_benchmarks_sync, period)
    if data["points"]:
        _benchmark_cache[period] = {"data": data, "ts": time.time()}
    return data


# ── Simulated Fund Portfolio via Equivalent Proxy ETFs ──────────────────────────
PORTFOLIO_ETF_PROXIES = {
    "IE00BYX5NX33": {"ticker": "URTH", "name": "iShares MSCI World ETF", "desc": "MSCI World (Acciones Globales)"},
    "0192#0011":    {"ticker": "ACWI", "name": "iShares MSCI ACWI ETF", "desc": "MSCI ACWI (Indexa Acciones)"},
    "LU0302296495": {"ticker": "XLK",  "name": "Technology Select SPDR", "desc": "Tecnología Global"},
    "ES0112611001": {"ticker": "COWZ", "name": "Pacer US Cash Cows 100", "desc": "Value Internacional & Cash Flow"},
    "IE000QAZP7L2": {"ticker": "EEM",  "name": "iShares MSCI Emerging Markets", "desc": "Mercados Emergentes"},
    "IE00BYX5M476": {"ticker": "EEM",  "name": "iShares MSCI Emerging Markets", "desc": "Mercados Emergentes"},
    "IE00BYX5NH74": {"ticker": "EWJ",  "name": "iShares MSCI Japan ETF", "desc": "Renta Variable Japón"},
    "LU0261952682": {"ticker": "FEZ",  "name": "SPDR EURO STOXX 50 ETF", "desc": "Euro Stoxx 50 (Europa)"},
    "LU1598719752": {"ticker": "EFV",  "name": "iShares MSCI EAFE Value ETF", "desc": "Value Internacional EAFE"},
}

_sim_portfolio_cache: dict[str, dict] = {}
SIM_PORTFOLIO_CACHE_TTL = 45  # 45 seconds for responsive live feel


def _fetch_simulated_portfolio_sync(period: str, user_id: str, db: Session) -> dict:
    import yfinance as yf
    import pandas as pd

    target_user = user_id if user_id and user_id != "demo" else "asier"
    txs = _get_all_transactions(db, user_id=target_user)
    if not txs:
        txs = _get_all_transactions(db, user_id="asier")
    positions = calculate_positions(txs)
    active = {k: v for k, v in positions.items() if v.get("shares", 0) > 0.0001 and not k.startswith("TR_")}
    if not active:
        return {
            "summary": {
                "total_value": 0.0,
                "simulated_daily_pct": 0.0,
                "simulated_daily_amount": 0.0,
                "market_state": "CLOSED",
                "as_of": _now_iso(),
                "period": period,
            },
            "holdings": [],
            "etfs_summary": [],
            "chart_points": [],
        }

    # Latest NAVs for active positions
    navs = {}
    for isin in active.keys():
        cp = db.query(PriceCache).filter(PriceCache.isin == isin).order_by(PriceCache.date.desc()).first()
        navs[isin] = cp.price if cp and cp.price and cp.price > 0 else active[isin].get("avg_cost", 0)

    fund_values = {isin: active[isin]["shares"] * navs[isin] for isin in active.keys()}
    total_val = sum(fund_values.values())

    etf_weights = {}
    holdings = []
    unique_etfs = set()

    for isin, f_val in fund_values.items():
        proxy_info = PORTFOLIO_ETF_PROXIES.get(
            isin,
            {"ticker": "URTH", "name": "iShares MSCI World ETF", "desc": "Global Equities"}
        )
        etf_ticker = proxy_info["ticker"]
        unique_etfs.add(etf_ticker)
        w = (f_val / total_val) if total_val > 0 else 0
        etf_weights[etf_ticker] = etf_weights.get(etf_ticker, 0.0) + w

        asset = _get_asset(db, isin)
        pos_txs = [t for t in txs if t["isin"] == isin]
        broker = pos_txs[-1].get("broker", "myinvestor") if pos_txs else "myinvestor"

        holdings.append({
            "isin": isin,
            "fund_name": asset.name if asset else isin,
            "broker": broker,
            "shares": round(active[isin]["shares"], 4),
            "nav": round(navs[isin], 4),
            "fund_value": round(f_val, 2),
            "weight": round(w * 100, 2),
            "etf_ticker": etf_ticker,
            "etf_name": proxy_info["name"],
            "etf_desc": proxy_info["desc"],
        })

    etf_tickers_list = sorted(list(unique_etfs))

    # Extended quotes for all ETF proxies
    quotes = _fetch_quotes_extended(etf_tickers_list)

    # Attach live ETF quote info & simulated gain to each holding
    for h in holdings:
        q = quotes.get(h["etf_ticker"], {})
        chg_pct = q.get("change_pct", 0.0) or 0.0
        h["etf_price"] = q.get("price")
        h["etf_change_pct"] = chg_pct
        h["etf_change"] = q.get("change")
        h["simulated_gain_amount"] = round(h["fund_value"] * (chg_pct / 100.0), 2)

    # Aggregated simulated daily % & €
    simulated_daily_pct = round(
        sum(etf_weights.get(t, 0.0) * (quotes.get(t, {}).get("change_pct", 0.0) or 0.0) for t in etf_tickers_list),
        2
    )
    simulated_daily_amount = round(total_val * (simulated_daily_pct / 100.0), 2)

    urth_state = quotes.get("URTH", {}).get("market_state") or get_market_session_for_ticker("URTH")

    # Fetch history series for the chart with pre/post market support
    chart_points = []
    session_markers = []
    DIAS_ES = {0: "Lunes", 1: "Martes", 2: "Miércoles", 3: "Jueves", 4: "Viernes", 5: "Sábado", 6: "Domingo"}
    MESES_ES = {1: "ene", 2: "feb", 3: "mar", 4: "abr", 5: "may", 6: "jun", 7: "jul", 8: "ago", 9: "sep", 10: "oct", 11: "nov", 12: "dic"}

    try:
        valid_periods = {"1d", "5d", "1mo"}
        fetch_period = period if period in valid_periods else "1d"
        interval = "5m" if fetch_period == "1d" else "15m" if fetch_period == "5d" else "1d"
        download_period = "2d" if fetch_period == "1d" else fetch_period
        include_prepost = fetch_period in ("1d", "5d")

        df = yf.download(etf_tickers_list, period=download_period, interval=interval, prepost=include_prepost, progress=False)
        if df is not None and not df.empty:
            closes = df["Close"] if "Close" in df else df
            if isinstance(closes, pd.DataFrame):
                closes = closes.ffill().bfill()
                weights_series = pd.Series(etf_weights)

                from zoneinfo import ZoneInfo
                madrid_tz = ZoneInfo("Europe/Madrid")
                ny_tz = ZoneInfo("America/New_York")

                session_dates = [idx.astimezone(ny_tz).date() for idx in closes.index]
                unique_sessions = sorted(list(set(session_dates)))

                # Calculate norm_df normalized by session
                if fetch_period in ("1d", "5d") and len(unique_sessions) > 1:
                    norm_dfs = []
                    for s_idx, s in enumerate(unique_sessions):
                        idx_s = [idx for idx, d in zip(closes.index, session_dates) if d == s]
                        sub_closes = closes.loc[idx_s]
                        if s_idx == 0:
                            # For the initial session, base is its first row or prev_close
                            base_s = sub_closes.iloc[0]
                        else:
                            # For subsequent sessions, base is the last close of the previous session!
                            prev_session_dates = [idx for idx, d in zip(closes.index, session_dates) if d == unique_sessions[s_idx - 1]]
                            base_s = closes.loc[prev_session_dates].iloc[-1]
                        norm_s = (sub_closes - base_s) / base_s * 100.0
                        norm_dfs.append(norm_s)
                    norm_df = pd.concat(norm_dfs)
                elif fetch_period == "1d":
                    base_dict = {}
                    for t in etf_tickers_list:
                        pc = quotes.get(t, {}).get("prev_close")
                        if pc and pc > 0:
                            base_dict[t] = pc
                        elif t in closes.columns and not closes[t].empty:
                            base_dict[t] = float(closes[t].iloc[0])
                        else:
                            base_dict[t] = 1.0
                    base_s = pd.Series(base_dict)
                    norm_df = (closes - base_s) / base_s * 100.0
                else:
                    base_s = closes.iloc[0]
                    norm_df = (closes - base_s) / base_s * 100.0

                sim_pct = norm_df.dot(weights_series)

                prev_ny_d = None
                prev_phase = None

                for idx, val in sim_pct.items():
                    dt = idx.to_pydatetime()
                    dt_madrid = dt.astimezone(madrid_tz) if dt.tzinfo is not None else dt
                    dt_ny = dt.astimezone(ny_tz) if dt.tzinfo is not None else dt
                    ny_d = dt_ny.date()

                    # Determine market phase in NY
                    mins_ny = dt_ny.hour * 60 + dt_ny.minute
                    if mins_ny < 9 * 60 + 30:
                        phase = "PRE"
                    elif mins_ny < 16 * 60:
                        phase = "REGULAR"
                    else:
                        phase = "POST"

                    t_unix = int(dt_madrid.timestamp())

                    # Phase change markers (Apertura Regular 15:30, Post-Market 22:00)
                    if prev_phase is not None and phase != prev_phase:
                        if phase == "REGULAR":
                            session_markers.append({
                                "time_unix": t_unix,
                                "label": "Apertura Regular (15:30)",
                                "type": "regular_open",
                                "color": "#10b981",
                                "phase": phase,
                            })
                        elif phase == "POST":
                            session_markers.append({
                                "time_unix": t_unix,
                                "label": "Post-Market (22:00)",
                                "type": "post_market",
                                "color": "#f59e0b",
                                "phase": phase,
                            })

                    prev_ny_d = ny_d
                    prev_phase = phase

                    if fetch_period == "1d":
                        lbl = dt_madrid.strftime("%H:%M")
                    elif fetch_period == "5d":
                        lbl = dt_madrid.strftime("%d %b %H:%M")
                    else:
                        lbl = dt_madrid.strftime("%d %b")

                    pct_val = round(float(val), 2)
                    chart_points.append({
                        "time": dt_madrid.isoformat(),
                        "time_unix": t_unix,
                        "label": lbl,
                        "time_ny": dt_ny.strftime("%H:%M") if dt_ny.tzinfo else lbl,
                        "date": dt_madrid.strftime("%Y-%m-%d"),
                        "session_date": ny_d.isoformat(),
                        "phase": phase,
                        "simulated_pct": pct_val,
                        "simulated_amount": round(total_val * (pct_val / 100.0), 2),
                    })
    except Exception as e:
        logger.warning(f"Error fetching ETF history download: {e}")

    # ETFs summary list
    etfs_summary = []
    for t in etf_tickers_list:
        q = quotes.get(t, {})
        etfs_summary.append({
            "ticker": t,
            "name": q.get("name") or t,
            "weight": round(etf_weights.get(t, 0.0) * 100, 2),
            "price": q.get("price"),
            "regular_price": q.get("regular_price"),
            "pre_market_price": q.get("pre_market_price"),
            "post_market_price": q.get("post_market_price"),
            "change_pct": q.get("change_pct"),
            "currency": q.get("currency", "USD"),
        })

    # Session date & human-readable label
    latest_date_str = chart_points[-1]["date"] if chart_points else datetime.now().strftime("%Y-%m-%d")
    is_session_today = (latest_date_str == datetime.now().strftime("%Y-%m-%d"))
    try:
        ld = datetime.strptime(latest_date_str, "%Y-%m-%d")
        session_display = f"{DIAS_ES[ld.weekday()]}, {ld.day} {MESES_ES[ld.month]}."
    except Exception:
        session_display = latest_date_str

    return {
        "summary": {
            "total_value": round(total_val, 2),
            "simulated_daily_pct": simulated_daily_pct,
            "simulated_daily_amount": simulated_daily_amount,
            "market_state": urth_state,
            "as_of": _now_iso(),
            "session_date": latest_date_str,
            "session_display": session_display,
            "is_session_today": is_session_today,
            "timezone": "Europe/Madrid",
            "period": period,
            "has_extended_hours": True,
        },
        "holdings": sorted(holdings, key=lambda x: x["fund_value"], reverse=True),
        "etfs_summary": sorted(etfs_summary, key=lambda x: x["weight"], reverse=True),
        "chart_points": chart_points,
        "session_markers": session_markers,
        "cache_timestamp": _now_iso(),
    }


@router.get("/simulated-portfolio")
async def get_simulated_portfolio(
    period: str = "1d",
    user_id: Optional[str] = "asier",
    db: Session = Depends(get_db),
):
    """
    Simulated real-time fund portfolio performance based on liquid ETF equivalents
    (URTH, ACWI, XLK, COWZ, EEM, EWJ, FEZ, EFV) with intraday historical trajectory.
    """
    cache_key = f"{user_id}:{period}"
    now = time.time()
    if cache_key in _sim_portfolio_cache:
        entry = _sim_portfolio_cache[cache_key]
        if now - entry["ts"] < SIM_PORTFOLIO_CACHE_TTL:
            return entry["data"]

    data = await asyncio.to_thread(_fetch_simulated_portfolio_sync, period, user_id or "asier", db)
    _sim_portfolio_cache[cache_key] = {"data": data, "ts": now}
    return data




# ── Curated stock universe with metadata ───────────────────────────────────────