"""Portfolio router — summary, positions, performance."""
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from app.database import get_db
from app.models import Asset, Transaction, PriceCache
from app.schemas import PortfolioSummary, PositionOut, PerformancePoint, UpdatePriceRequest
from app.services.price_service import get_current_price, get_price_with_date, get_price_history, _price_cache
from app.services.finance_engine import (
    calculate_positions,
    calculate_portfolio_value_series,
    calculate_portfolio_nav_series,
    calculate_twr,
    calculate_cagr,
    calculate_volatility,
    calculate_max_drawdown,
    calculate_sharpe,
    calculate_period_return,
    calculate_xirr,
)
from app.routers.auth import get_current_user_id

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])
logger = logging.getLogger(__name__)


def _get_all_transactions(db: Session, user_id: str = "asier", broker: str | None = None) -> list[dict]:
    query = db.query(Transaction)
    if user_id:
        query = query.filter(Transaction.user_id == user_id)
    if broker and broker.lower() not in ["all", "todos"]:
        query = query.filter(Transaction.broker == broker.lower())
    rows = query.order_by(Transaction.date).all()
    return [
        {
            "id": t.id,
            "isin": t.isin,
            "type": t.type,
            "shares": t.shares,
            "price": t.price,
            "amount": t.amount,
            "date": t.date,
            "broker": t.broker or "myinvestor",
            "notes": t.notes,
        }
        for t in rows
    ]


def _get_asset(db: Session, isin: str) -> Asset | None:
    return db.query(Asset).filter(Asset.isin == isin).first()


@router.get("/summary", response_model=PortfolioSummary)
async def get_portfolio_summary(user_id: str = Depends(get_current_user_id), broker: str | None = None, db: Session = Depends(get_db)):
    """Return overall portfolio KPIs."""
    transactions = _get_all_transactions(db, user_id, broker=broker)
    if not transactions:
        return PortfolioSummary(
            total_value=0,
            total_invested=0,
            total_pnl=0,
            total_pnl_pct=0,
            num_positions=0,
            last_updated=datetime.now().isoformat(),
        )

    positions = calculate_positions(transactions)
    active_positions = {isin: pos for isin, pos in positions.items() if pos["shares"] > 0.0001}
    total_value = 0.0
    total_invested = 0.0

    for isin, pos in active_positions.items():
        asset = _get_asset(db, isin)
        ticker = asset.ticker if asset else None
        price = await get_current_price(isin, ticker, db=db)
        effective_price = price if (price is not None and price >= 0) else pos["avg_cost"]
        total_value += pos["shares"] * effective_price
        total_invested += pos["invested_amount"]

    total_pnl = total_value - total_invested
    total_pnl_pct = (total_pnl / total_invested * 100) if total_invested > 0 else 0

    valid_positions = [
        isin for isin in active_positions
        if isin != "TR_TRANSFER" and not isin.startswith("TR_") and (not _get_asset(db, isin) or "Trade Republic" not in (_get_asset(db, isin).name or ""))
    ]

    return PortfolioSummary(
        total_value=round(total_value, 2),
        total_invested=round(total_invested, 2),
        total_pnl=round(total_pnl, 2),
        total_pnl_pct=round(total_pnl_pct, 2),
        num_positions=len(valid_positions),
        last_updated=datetime.now().isoformat(),
    )


@router.get("/positions", response_model=list[PositionOut])
async def get_positions(user_id: str = Depends(get_current_user_id), broker: str | None = None, refresh: bool = False, db: Session = Depends(get_db)):
    """Return all current positions with live prices, valuation dates, and broker tags."""
    if refresh:
        _price_cache.clear()

    transactions = _get_all_transactions(db, user_id, broker=broker)
    if not transactions:
        return []

    positions = calculate_positions(transactions)
    active_positions = {isin: pos for isin, pos in positions.items() if pos["shares"] > 0.0001}
    result = []
    total_value = 0.0

    position_data = []
    for isin, pos in active_positions.items():
        asset = _get_asset(db, isin)
        ticker = asset.ticker if asset else None
        name = asset.name if asset else isin
        asset_type = asset.asset_type if asset else "fund"
        currency = asset.currency if asset else "EUR"

        # Do not include Cartera Trade Republic in positions listing
        if isin == "TR_TRANSFER" or isin.startswith("TR_") or "Trade Republic" in name:
            continue

        # Find broker for this position
        pos_txs = [t for t in transactions if t["isin"] == isin]
        pos_broker = pos_txs[-1].get("broker", "myinvestor") if pos_txs else "myinvestor"

        price, price_date = await get_price_with_date(isin, ticker, db=db, force=refresh)
        effective_price = price if (price is not None and price >= 0) else pos["avg_cost"]
        current_value = pos["shares"] * effective_price
        total_value += current_value

        pnl = current_value - pos["invested_amount"]
        pnl_pct = (pnl / pos["invested_amount"] * 100) if pos["invested_amount"] > 0 else 0.0
        # Calculate daily return from price history (comparing against previous distinct trading session)
        daily_change = None
        daily_change_pct = None
        p_prev = None

        h = await get_price_history(isin, ticker, "1mo")
        if h and len(h) >= 2:
            last_h_price = effective_price
            for pt in reversed(h):
                if pt.get("price", 0) > 0 and abs(pt["price"] - last_h_price) > 0.0001:
                    p_prev = pt["price"]
                    break

        if (p_prev is None or p_prev <= 0) and db is not None:
            distinct_cached = []
            for cp in db.query(PriceCache).filter(PriceCache.isin == isin).order_by(PriceCache.date.desc()).all():
                if cp.price and cp.price > 0:
                    if not distinct_cached or abs(cp.price - distinct_cached[-1]) > 0.0001:
                        distinct_cached.append(cp.price)
                    if len(distinct_cached) >= 2:
                        p_prev = distinct_cached[1]
                        break

        if p_prev and p_prev > 0 and effective_price and effective_price > 0:
            daily_change = round(effective_price - p_prev, 4)
            daily_change_pct = round((effective_price - p_prev) / p_prev * 100, 2)

        position_data.append({
            "isin": isin,
            "name": name,
            "ticker": ticker,
            "domain": getattr(asset, "domain", None) if asset else None,
            "asset_type": asset_type,
            "currency": currency,
            "shares": round(pos["shares"], 6),
            "avg_cost": round(pos["avg_cost"], 4),
            "current_price": round(effective_price, 4),
            "current_value": round(current_value, 2),
            "invested_amount": round(pos["invested_amount"], 2),
            "unrealized_pnl": round(pnl, 2),
            "unrealized_pnl_pct": round(pnl_pct, 2),
            "daily_change": daily_change,
            "daily_change_pct": daily_change_pct,
            "broker": pos_broker,
            "ter": getattr(asset, "ter", None) if asset else None,
            "last_updated": price_date or datetime.now().strftime("%Y-%m-%d"),
            "price_date": price_date or datetime.now().strftime("%Y-%m-%d"),
        })

    # Add weight
    for p in position_data:
        if total_value > 0:
            p["weight"] = round(p["current_value"] / total_value * 100, 2)
        else:
            p["weight"] = 0.0
        result.append(PositionOut(**p))

    return sorted(result, key=lambda x: x.current_value or 0, reverse=True)


@router.post("/refresh-prices")
async def refresh_portfolio_prices(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """
    Force re-scraping of all active positions from official gestora websites,
    Financial Times tearsheets, and Quefondos. Clears in-memory price cache.
    """
    _price_cache.clear()
    _perf_cache.clear()
    transactions = _get_all_transactions(db, user_id)
    positions = calculate_positions(transactions)
    active = {isin: pos for isin, pos in positions.items() if pos["shares"] > 0.0001}

    async def _fetch_one(isin, pos):
        asset = _get_asset(db, isin)
        ticker = asset.ticker if asset else None
        p, p_date = await get_price_with_date(isin, ticker, db=db, force=True)
        return isin, {
            "name": asset.name if asset else isin,
            "price": p,
            "price_date": p_date,
        }

    tasks = [_fetch_one(isin, pos) for isin, pos in active.items()]
    items = await asyncio.gather(*tasks, return_exceptions=True)
    results = {}
    for res in items:
        if isinstance(res, tuple):
            isin_key, data = res
            results[isin_key] = data

    logger.info(f"Refreshed prices for {len(results)} assets: {results}")
    return {
        "status": "ok",
        "updated_at": datetime.now().isoformat(),
        "count": len(results),
        "results": results,
    }


@router.post("/update-price")
async def update_price(req: UpdatePriceRequest, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Update or override a fund NAV manually with an exact date."""
    target_date = req.date or datetime.now().strftime("%Y-%m-%d")
    existing = db.query(PriceCache).filter(PriceCache.isin == req.isin, PriceCache.date == target_date).first()
    if existing:
        existing.price = req.price
    else:
        db.add(PriceCache(isin=req.isin, date=target_date, price=req.price, currency="EUR"))
    db.commit()

    _price_cache[req.isin] = {"price": req.price, "date": target_date, "ts": datetime.now()}
    _perf_cache.clear()
    return {"ok": True, "isin": req.isin, "price": req.price, "date": target_date}


_perf_cache: dict[str, tuple[datetime, list[dict]]] = {}


def clear_portfolio_caches():
    _perf_cache.clear()
    _bench_cache.clear()
    _price_cache.clear()
    try:
        from app.services.price_service import _history_cache, _price_cache as _svc_price_cache
        _history_cache.clear()
        _svc_price_cache.clear()
    except Exception:
        pass


@router.get("/performance", response_model=list[PerformancePoint])
async def get_performance(
    period: str = "1y",
    user_id: str = Depends(get_current_user_id),
    broker: str | None = None,
    start_date: str | None = None,
    db: Session = Depends(get_db),
):
    effective_start = start_date
    if not effective_start and period != "all":
        now = datetime.now()
        if period == "1mo":
            effective_start = (now - timedelta(days=30)).strftime("%Y-%m-%d")
        elif period == "3mo":
            effective_start = (now - timedelta(days=90)).strftime("%Y-%m-%d")
        elif period == "6mo":
            effective_start = (now - timedelta(days=180)).strftime("%Y-%m-%d")
        elif period == "1y":
            effective_start = (now - timedelta(days=365)).strftime("%Y-%m-%d")
        elif period == "2y":
            effective_start = (now - timedelta(days=730)).strftime("%Y-%m-%d")
        elif period == "5y":
            effective_start = (now - timedelta(days=1825)).strftime("%Y-%m-%d")

    cache_key = f"{user_id}:{broker}:{period}:{effective_start}"
    if cache_key in _perf_cache:
        ts, cached = _perf_cache[cache_key]
        if (datetime.now() - ts).total_seconds() < 600:
            return [PerformancePoint(**v) for v in cached]

    transactions = _get_all_transactions(db, user_id, broker=broker)
    if not transactions:
        return []

    positions = calculate_positions(transactions)

    # Fetch price history for all assets, ensuring latest date uses current price
    price_history = {}
    all_isins = set(t["isin"] for t in transactions)
    for isin in all_isins:
        asset = _get_asset(db, isin)
        ticker = asset.ticker if asset else None
        history = await get_price_history(isin, ticker, period)
        curr_p, curr_p_date = await get_price_with_date(isin, ticker, db=db)
        if history:
            latest_date = curr_p_date or datetime.now().strftime("%Y-%m-%d")
            if curr_p is not None and curr_p >= 0:
                if history[-1]["date"] == latest_date:
                    history[-1]["price"] = round(curr_p, 4)
                elif history[-1]["date"] < latest_date:
                    history.append({"date": latest_date, "price": round(curr_p, 4)})
            price_history[isin] = history
        elif curr_p is not None and curr_p >= 0:
            price_history[isin] = [{"date": curr_p_date or datetime.now().strftime("%Y-%m-%d"), "price": round(curr_p, 4)}]

    value_series = calculate_portfolio_value_series(transactions, price_history, start_date=effective_start)
    _perf_cache[cache_key] = (datetime.now(), value_series)
    return [PerformancePoint(**v) for v in value_series]


_bench_cache: dict[str, tuple[datetime, dict]] = {}


def _get_ecb_deposit_rate(date_str: str) -> float:
    """Returns official annualized ECB deposit facility rate (%) for a given YYYY-MM-DD date."""
    if date_str < "2022-07-27":
        return 0.00  # Floored at 0.0%
    elif date_str < "2022-09-14":
        return 0.00
    elif date_str < "2022-11-02":
        return 0.75
    elif date_str < "2022-12-21":
        return 1.50
    elif date_str < "2023-02-08":
        return 2.00
    elif date_str < "2023-03-22":
        return 2.50
    elif date_str < "2023-05-10":
        return 3.00
    elif date_str < "2023-06-21":
        return 3.25
    elif date_str < "2023-08-02":
        return 3.50
    elif date_str < "2023-09-20":
        return 3.75
    elif date_str < "2024-06-12":
        return 4.00
    elif date_str < "2024-09-18":
        return 3.75
    elif date_str < "2024-10-23":
        return 3.50
    elif date_str < "2024-12-18":
        return 3.25
    else:
        return 3.00


@router.get("/benchmark-comparison")
async def get_benchmark_comparison(
    period: str = "1y",
    user_id: str = Depends(get_current_user_id),
    broker: str | None = None,
    db: Session = Depends(get_db),
):
    """
    Returns time-weighted portfolio returns alongside S&P 500 and MSCI World,
    neutralizing the impact of cash inflows and outflows.
    """
    cache_key = f"{user_id}:{broker}:{period}"
    if cache_key in _bench_cache:
        ts, cached = _bench_cache[cache_key]
        if (datetime.now() - ts).total_seconds() < 600:
            return cached

    transactions = _get_all_transactions(db, user_id, broker=broker)
    if not transactions:
        return {"period": period, "points": [], "summary": None}

    now = datetime.now()
    effective_start = None
    if period in ("1m", "1mo"):
        effective_start = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    elif period in ("3m", "3mo"):
        effective_start = (now - timedelta(days=90)).strftime("%Y-%m-%d")
    elif period in ("6m", "6mo"):
        effective_start = (now - timedelta(days=180)).strftime("%Y-%m-%d")
    elif period == "ytd":
        effective_start = f"{now.year}-01-01"
    elif period == "1y":
        effective_start = (now - timedelta(days=365)).strftime("%Y-%m-%d")
    elif period == "2y":
        effective_start = (now - timedelta(days=730)).strftime("%Y-%m-%d")
    elif period == "5y":
        effective_start = (now - timedelta(days=1825)).strftime("%Y-%m-%d")

    price_history = {}
    all_isins = set(t["isin"] for t in transactions)
    for isin in all_isins:
        asset = _get_asset(db, isin)
        ticker = asset.ticker if asset else None
        history = await get_price_history(isin, ticker, period)
        curr_p = await get_current_price(isin, ticker, db=db)
        if history:
            if curr_p and curr_p > 0:
                history[-1]["price"] = round(curr_p, 4)
            price_history[isin] = history
        elif curr_p and curr_p > 0:
            price_history[isin] = [{"date": datetime.now().strftime("%Y-%m-%d"), "price": round(curr_p, 4)}]

    # 1. Compute true unitized Time-Weighted Return (TWR) using True NAV Engine
    val_series = calculate_portfolio_value_series(transactions, price_history, start_date=effective_start)
    val_map = {p["date"]: p for p in val_series}

    nav_series = calculate_portfolio_nav_series(transactions, price_history)
    if effective_start:
        nav_points = [p for p in nav_series if p["date"] >= effective_start and p["date"] in val_map]
    else:
        nav_points = [p for p in nav_series if p["date"] in val_map]

    if not nav_points:
        return {"period": period, "points": [], "summary": None}

    base_nav = nav_points[0]["nav"]
    twr_points = []
    for pt in nav_points:
        d = pt["date"]
        v_info = val_map.get(d, {"value": 0.0, "invested": 0.0})
        twr_val = round((pt["nav"] / base_nav - 1.0) * 100.0, 2)
        twr_points.append({
            "date": d,
            "value": v_info["value"],
            "invested": v_info["invested"],
            "twr": twr_val,
        })

    # 2. Fetch S&P 500, MSCI World, NASDAQ 100 and Euro Stoxx 50 historical prices
    sp_hist = await get_price_history("^GSPC", "^GSPC", period)
    msci_hist = await get_price_history("URTH", "URTH", period)
    nasdaq_hist = await get_price_history("QQQ", "QQQ", period)
    stoxx_hist = await get_price_history("^STOXX50E", "^STOXX50E", period)
    nikkei_hist = await get_price_history("^N225", "^N225", period)

    sp_dict = {p["date"]: p["price"] for p in sp_hist if p.get("price")}
    msci_dict = {p["date"]: p["price"] for p in msci_hist if p.get("price")}
    nasdaq_dict = {p["date"]: p["price"] for p in nasdaq_hist if p.get("price")}
    stoxx_dict = {p["date"]: p["price"] for p in stoxx_hist if p.get("price")}
    nikkei_dict = {p["date"]: p["price"] for p in nikkei_hist if p.get("price")}

    sp_dates = sorted(sp_dict.keys())
    msci_dates = sorted(msci_dict.keys())
    nasdaq_dates = sorted(nasdaq_dict.keys())
    stoxx_dates = sorted(stoxx_dict.keys())
    nikkei_dates = sorted(nikkei_dict.keys())

    def _find_price(target_date: str, price_map: dict[str, float], all_dates: list[str]) -> float | None:
        if target_date in price_map:
            return price_map[target_date]
        prev_dates = [d for d in all_dates if d <= target_date]
        if prev_dates:
            return price_map[prev_dates[-1]]
        return None

    start_date = twr_points[0]["date"]
    sp_base = _find_price(start_date, sp_dict, sp_dates) or (sp_dict[sp_dates[0]] if sp_dates else None)
    msci_base = _find_price(start_date, msci_dict, msci_dates) or (msci_dict[msci_dates[0]] if msci_dates else None)
    nasdaq_base = _find_price(start_date, nasdaq_dict, nasdaq_dates) or (nasdaq_dict[nasdaq_dates[0]] if nasdaq_dates else None)
    stoxx_base = _find_price(start_date, stoxx_dict, stoxx_dates) or (stoxx_dict[stoxx_dates[0]] if stoxx_dates else None)
    nikkei_base = _find_price(start_date, nikkei_dict, nikkei_dates) or (nikkei_dict[nikkei_dates[0]] if nikkei_dates else None)

    aligned_points = []
    last_sp_ret = 0.0
    last_msci_ret = 0.0
    last_nasdaq_ret = 0.0
    last_stoxx_ret = 0.0
    last_nikkei_ret = 0.0
    bce_cum_factor = 1.0
    prev_d = None

    for pt in twr_points:
        d = pt["date"]

        # 1. ECB risk-free rate compounding
        if prev_d is not None:
            try:
                days_delta = (datetime.strptime(d, "%Y-%m-%d") - datetime.strptime(prev_d, "%Y-%m-%d")).days
                if days_delta > 0:
                    annual_rate = _get_ecb_deposit_rate(d) / 100.0
                    bce_cum_factor *= ((1.0 + annual_rate) ** (days_delta / 365.25))
            except Exception:
                pass
        prev_d = d
        bce_ret = round((bce_cum_factor - 1.0) * 100.0, 2)

        # 2. S&P 500
        sp_p = _find_price(d, sp_dict, sp_dates)
        if sp_p and sp_base and sp_base > 0:
            sp_ret = round((sp_p / sp_base - 1.0) * 100.0, 2)
            last_sp_ret = sp_ret
        else:
            sp_ret = last_sp_ret

        # 3. MSCI World
        msci_p = _find_price(d, msci_dict, msci_dates)
        if msci_p and msci_base and msci_base > 0:
            msci_ret = round((msci_p / msci_base - 1.0) * 100.0, 2)
            last_msci_ret = msci_ret
        else:
            msci_ret = last_msci_ret

        # 4. NASDAQ 100
        nasdaq_p = _find_price(d, nasdaq_dict, nasdaq_dates)
        if nasdaq_p and nasdaq_base and nasdaq_base > 0:
            nasdaq_ret = round((nasdaq_p / nasdaq_base - 1.0) * 100.0, 2)
            last_nasdaq_ret = nasdaq_ret
        else:
            nasdaq_ret = last_nasdaq_ret

        # 5. Euro Stoxx 50
        stoxx_p = _find_price(d, stoxx_dict, stoxx_dates)
        if stoxx_p and stoxx_base and stoxx_base > 0:
            stoxx_ret = round((stoxx_p / stoxx_base - 1.0) * 100.0, 2)
            last_stoxx_ret = stoxx_ret
        else:
            stoxx_ret = last_stoxx_ret

        # 6. Nikkei 225
        nikkei_p = _find_price(d, nikkei_dict, nikkei_dates)
        if nikkei_p and nikkei_base and nikkei_base > 0:
            nikkei_ret = round((nikkei_p / nikkei_base - 1.0) * 100.0, 2)
            last_nikkei_ret = nikkei_ret
        else:
            nikkei_ret = last_nikkei_ret

        aligned_points.append({
            "date": d,
            "value": pt["value"],
            "invested": pt["invested"],
            "portfolio_twr": pt["twr"],
            "sp500": sp_ret,
            "msci_world": msci_ret,
            "bce_rate": bce_ret,
            "nasdaq100": nasdaq_ret,
            "eurostoxx50": stoxx_ret,
            "nikkei225": nikkei_ret,
        })

    final_twr = aligned_points[-1]["portfolio_twr"] if aligned_points else 0.0
    final_sp = aligned_points[-1]["sp500"] if aligned_points else 0.0
    final_msci = aligned_points[-1]["msci_world"] if aligned_points else 0.0
    final_bce = aligned_points[-1]["bce_rate"] if aligned_points else 0.0
    final_nasdaq = aligned_points[-1]["nasdaq100"] if aligned_points else 0.0
    final_stoxx = aligned_points[-1]["eurostoxx50"] if aligned_points else 0.0
    final_nikkei = aligned_points[-1]["nikkei225"] if aligned_points else 0.0

    result = {
        "period": period,
        "points": aligned_points,
        "summary": {
            "portfolio_twr": final_twr,
            "sp500": final_sp,
            "msci_world": final_msci,
            "bce_rate": final_bce,
            "nasdaq100": final_nasdaq,
            "eurostoxx50": final_stoxx,
            "nikkei225": final_nikkei,
            "alpha_sp500": round(final_twr - final_sp, 2),
            "alpha_msci": round(final_twr - final_msci, 2),
            "alpha_bce": round(final_twr - final_bce, 2),
        }
    }
    _bench_cache[cache_key] = (datetime.now(), result)
    return result


@router.get("/analytics")
async def get_analytics(period: str = "1y", user_id: str = Depends(get_current_user_id), broker: str | None = None, db: Session = Depends(get_db)):
    """Return all computed risk/return metrics."""
    transactions = _get_all_transactions(db, user_id, broker=broker)
    if not transactions:
        return {}

    positions = calculate_positions(transactions)
    price_history = {}
    all_isins = set(t["isin"] for t in transactions)
    # Analytics computes multi-horizon returns (1d, 1w, 1m, 3m, 6m, 1y, ytd).
    # Ensure at least 2y of price history so all horizons can be computed reliably.
    history_period = "max" if period == "max" else "2y"
    for isin in all_isins:
        asset = _get_asset(db, isin)
        ticker = asset.ticker if asset else None
        history = await get_price_history(isin, ticker, history_period)
        curr_p, curr_date = await get_price_with_date(isin, ticker, db=db)
        if history:
            history = [dict(h) for h in history]
            if curr_p and curr_p > 0:
                last_dt = history[-1]["date"]
                target_dt = curr_date or datetime.now().strftime("%Y-%m-%d")
                if target_dt > last_dt:
                    history.append({"date": target_dt, "price": round(curr_p, 4)})
                else:
                    history[-1]["price"] = round(curr_p, 4)
            price_history[isin] = history
        elif curr_p and curr_p > 0:
            price_history[isin] = [{"date": curr_date or datetime.now().strftime("%Y-%m-%d"), "price": round(curr_p, 4)}]

    value_series = calculate_portfolio_value_series(transactions, price_history)
    nav_series = calculate_portfolio_nav_series(transactions, price_history)

    current_val = value_series[-1]["value"] if value_series else 0.0
    current_invested = value_series[-1]["invested"] if value_series else 0.0
    net_profit = round(current_val - current_invested, 2)
    net_profit_pct = round((net_profit / current_invested * 100), 2) if current_invested > 0 else 0.0

    annualized_ret = calculate_xirr(transactions, current_val)
    vol = calculate_volatility(nav_series)
    max_dd = calculate_max_drawdown(nav_series)
    twr = calculate_twr(nav_series, transactions)

    # Realistic Sharpe ratio based on annualized return vs 2.5% risk free
    sharpe = None
    if annualized_ret is not None and vol and vol > 0:
        sharpe = round((annualized_ret - 2.5) / vol, 2)

    series_for_returns = nav_series if nav_series and len(nav_series) >= 2 else value_series
    days_ytd = max(1, (datetime.now() - datetime(datetime.now().year, 1, 1)).days)

    # Compute weighted daily return directly from active positions for exact 1D consistency.
    # Funds that have NOT yet updated to the latest reporting NAV date compute with 0.00% daily change
    # to avoid falsely attributing past days' returns to today's session.
    all_dates = []
    for isin in positions.keys():
        c = db.query(PriceCache.date).filter(PriceCache.isin == isin).order_by(PriceCache.date.desc()).first()
        if c and c[0]:
            all_dates.append(c[0])
    latest_nav_date = max(all_dates) if all_dates else datetime.now().strftime("%Y-%m-%d")

    weighted_1d = 0.0
    active_val = 0.0
    updated_positions_count = 0
    total_positions_count = 0

    for isin, pos in positions.items():
        if pos.get("shares", 0) <= 0.0001:
            continue
        total_positions_count += 1
        p = price_history.get(isin, [])
        pos_val = pos["shares"] * (p[-1]["price"] if p and p[-1].get("price") is not None and p[-1]["price"] >= 0 else pos.get("avg_cost", 0))
        active_val += pos_val
        cached_prices = db.query(PriceCache).filter(PriceCache.isin == isin).order_by(PriceCache.date.desc()).limit(10).all()
        distinct_cached = []
        for cp in cached_prices:
            if not distinct_cached or abs(cp.price - distinct_cached[-1].price) > 0.0001:
                distinct_cached.append(cp)
            if len(distinct_cached) >= 2:
                break

        # Only compute non-zero daily return if this fund has updated to the latest NAV date
        asset_daily_pct = 0.0
        if distinct_cached and distinct_cached[0].date == latest_nav_date:
            updated_positions_count += 1
            if len(distinct_cached) >= 2 and distinct_cached[1].price and distinct_cached[1].price > 0:
                asset_daily_pct = (distinct_cached[0].price - distinct_cached[1].price) / distinct_cached[1].price * 100
            elif len(p) >= 2 and p[-2].get("price", 0) > 0:
                asset_daily_pct = (p[-1]["price"] - p[-2]["price"]) / p[-2]["price"] * 100

        weighted_1d += pos_val * asset_daily_pct

    portfolio_daily_ret = round(weighted_1d / active_val, 2) if active_val > 0 else None
    ret_1d = portfolio_daily_ret if portfolio_daily_ret is not None else calculate_period_return(series_for_returns, 1)

    return {
        "annualized_return": annualized_ret,
        "net_profit": net_profit,
        "net_profit_pct": net_profit_pct,
        "total_value": round(current_val, 2),
        "total_invested": round(current_invested, 2),
        "twr": twr,
        "cagr": annualized_ret or calculate_cagr(nav_series),
        "volatility": vol,
        "max_drawdown": max_dd,
        "sharpe_ratio": sharpe,
        "return_1d": ret_1d,
        "updated_positions_count": updated_positions_count,
        "total_positions_count": total_positions_count,
        "latest_nav_date": latest_nav_date,
        "return_1w": calculate_period_return(series_for_returns, 7),
        "return_ytd": calculate_period_return(series_for_returns, days_ytd),
        "return_1m": calculate_period_return(series_for_returns, 30),
        "return_3m": calculate_period_return(series_for_returns, 90),
        "return_6m": calculate_period_return(series_for_returns, 180),
        "return_1y": calculate_period_return(series_for_returns, 365),
    }
