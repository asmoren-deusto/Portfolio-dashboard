"""Portfolio router — summary, positions, performance."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.database import get_db
from app.models import Asset, Transaction, PriceCache
from app.schemas import PortfolioSummary, PositionOut, PerformancePoint, UpdatePriceRequest
from app.services.price_service import get_current_price, get_price_with_date, get_price_history, _price_cache
from app.services.finance_engine import (
    calculate_positions,
    calculate_portfolio_value_series,
    calculate_twr,
    calculate_cagr,
    calculate_volatility,
    calculate_max_drawdown,
    calculate_sharpe,
    calculate_period_return,
)

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])
logger = logging.getLogger(__name__)


def _get_all_transactions(db: Session, user_id: str = "asier") -> list[dict]:
    query = db.query(Transaction)
    if user_id:
        query = query.filter(Transaction.user_id == user_id)
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
            "broker": t.broker,
        }
        for t in rows
    ]


def _get_asset(db: Session, isin: str) -> Asset | None:
    return db.query(Asset).filter(Asset.isin == isin).first()


@router.get("/summary", response_model=PortfolioSummary)
async def get_portfolio_summary(user_id: str = "asier", db: Session = Depends(get_db)):
    """Return overall portfolio KPIs."""
    transactions = _get_all_transactions(db, user_id)
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
    # Active positions with positive shares
    active_positions = {isin: pos for isin, pos in positions.items() if pos["shares"] > 0.0001}
    total_value = 0.0
    total_invested = 0.0

    for isin, pos in active_positions.items():
        asset = _get_asset(db, isin)
        ticker = asset.ticker if asset else None
        price = await get_current_price(isin, ticker, db=db)
        effective_price = price if (price and price > 0) else pos["avg_cost"]
        total_value += pos["shares"] * effective_price
        total_invested += pos["invested_amount"]

    total_pnl = total_value - total_invested
    total_pnl_pct = (total_pnl / total_invested * 100) if total_invested > 0 else 0

    return PortfolioSummary(
        total_value=round(total_value, 2),
        total_invested=round(total_invested, 2),
        total_pnl=round(total_pnl, 2),
        total_pnl_pct=round(total_pnl_pct, 2),
        num_positions=len(active_positions),
        last_updated=datetime.now().isoformat(),
    )


@router.get("/positions", response_model=list[PositionOut])
async def get_positions(user_id: str = "asier", db: Session = Depends(get_db)):
    """Return all current positions with live prices and valuation dates."""
    transactions = _get_all_transactions(db, user_id)
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

        price, price_date = await get_price_with_date(isin, ticker, db=db)
        effective_price = price if (price and price > 0) else pos["avg_cost"]
        current_value = pos["shares"] * effective_price
        total_value += current_value

        pnl = current_value - pos["invested_amount"]
        pnl_pct = (pnl / pos["invested_amount"] * 100) if pos["invested_amount"] > 0 else 0.0

        position_data.append({
            "isin": isin,
            "name": name,
            "asset_type": asset_type,
            "currency": currency,
            "shares": round(pos["shares"], 6),
            "avg_cost": round(pos["avg_cost"], 4),
            "current_price": round(effective_price, 4),
            "current_value": round(current_value, 2),
            "invested_amount": round(pos["invested_amount"], 2),
            "unrealized_pnl": round(pnl, 2),
            "unrealized_pnl_pct": round(pnl_pct, 2),
            "last_updated": datetime.now().isoformat(),
            "price_date": price_date,
        })

    # Add weight
    for p in position_data:
        if total_value > 0:
            p["weight"] = round(p["current_value"] / total_value * 100, 2)
        else:
            p["weight"] = 0.0
        result.append(PositionOut(**p))

    return sorted(result, key=lambda x: x.current_value or 0, reverse=True)


@router.post("/update-price")
async def update_price(req: UpdatePriceRequest, db: Session = Depends(get_db)):
    """Update or override a fund NAV manually with an exact date."""
    target_date = req.date or datetime.now().strftime("%Y-%m-%d")
    existing = db.query(PriceCache).filter(PriceCache.isin == req.isin, PriceCache.date == target_date).first()
    if existing:
        existing.price = req.price
    else:
        db.add(PriceCache(isin=req.isin, date=target_date, price=req.price, currency="EUR"))
    db.commit()

    _price_cache[req.isin] = {"price": req.price, "date": target_date, "ts": datetime.now()}
    return {"ok": True, "isin": req.isin, "price": req.price, "date": target_date}


@router.get("/performance", response_model=list[PerformancePoint])
async def get_performance(period: str = "1y", user_id: str = "asier", db: Session = Depends(get_db)):
    """Return portfolio value time series."""
    transactions = _get_all_transactions(db, user_id)
    if not transactions:
        return []

    positions = calculate_positions(transactions)

    # Fetch price history for all assets
    price_history = {}
    for isin in positions:
        asset = _get_asset(db, isin)
        ticker = asset.ticker if asset else None
        history = await get_price_history(isin, ticker, period)
        if history:
            price_history[isin] = history

    value_series = calculate_portfolio_value_series(transactions, price_history)
    return [PerformancePoint(**v) for v in value_series]


@router.get("/analytics")
async def get_analytics(period: str = "1y", user_id: str = "asier", db: Session = Depends(get_db)):
    """Return all computed risk/return metrics."""
    transactions = _get_all_transactions(db, user_id)
    if not transactions:
        return {}

    positions = calculate_positions(transactions)
    price_history = {}
    for isin in positions:
        asset = _get_asset(db, isin)
        ticker = asset.ticker if asset else None
        history = await get_price_history(isin, ticker, period)
        if history:
            price_history[isin] = history

    value_series = calculate_portfolio_value_series(transactions, price_history)

    return {
        "twr": calculate_twr(value_series, transactions),
        "cagr": calculate_cagr(value_series),
        "volatility": calculate_volatility(value_series),
        "max_drawdown": calculate_max_drawdown(value_series),
        "sharpe_ratio": calculate_sharpe(value_series),
        "return_ytd": calculate_period_return(value_series, 365),
        "return_1m": calculate_period_return(value_series, 30),
        "return_3m": calculate_period_return(value_series, 90),
        "return_6m": calculate_period_return(value_series, 180),
    }
