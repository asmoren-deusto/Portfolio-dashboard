"""Portfolio router — summary, positions, performance."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.database import get_db
from app.models import Asset, Transaction
from app.schemas import PortfolioSummary, PositionOut, PerformancePoint
from app.services.price_service import get_current_price, get_price_history
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


def _get_all_transactions(db: Session) -> list[dict]:
    rows = db.query(Transaction).order_by(Transaction.date).all()
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
async def get_portfolio_summary(db: Session = Depends(get_db)):
    """Return overall portfolio KPIs."""
    transactions = _get_all_transactions(db)
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
    total_value = 0.0
    total_invested = 0.0

    for isin, pos in positions.items():
        asset = _get_asset(db, isin)
        ticker = asset.ticker if asset else None
        price = await get_current_price(isin, ticker)
        if price:
            total_value += pos["shares"] * price
        total_invested += pos["invested_amount"]

    total_pnl = total_value - total_invested
    total_pnl_pct = (total_pnl / total_invested * 100) if total_invested > 0 else 0

    return PortfolioSummary(
        total_value=round(total_value, 2),
        total_invested=round(total_invested, 2),
        total_pnl=round(total_pnl, 2),
        total_pnl_pct=round(total_pnl_pct, 2),
        num_positions=len(positions),
        last_updated=datetime.now().isoformat(),
    )


@router.get("/positions", response_model=list[PositionOut])
async def get_positions(db: Session = Depends(get_db)):
    """Return all current positions with live prices."""
    transactions = _get_all_transactions(db)
    if not transactions:
        return []

    positions = calculate_positions(transactions)
    result = []
    total_value = 0.0

    position_data = []
    for isin, pos in positions.items():
        asset = _get_asset(db, isin)
        ticker = asset.ticker if asset else None
        name = asset.name if asset else isin
        asset_type = asset.asset_type if asset else "fund"
        currency = asset.currency if asset else "EUR"

        price = await get_current_price(isin, ticker)
        current_value = pos["shares"] * price if price else None
        if current_value:
            total_value += current_value

        position_data.append({
            "isin": isin,
            "name": name,
            "asset_type": asset_type,
            "currency": currency,
            "shares": round(pos["shares"], 6),
            "avg_cost": round(pos["avg_cost"], 4),
            "current_price": price,
            "current_value": round(current_value, 2) if current_value else None,
            "invested_amount": round(pos["invested_amount"], 2),
            "unrealized_pnl": round(current_value - pos["invested_amount"], 2) if current_value else None,
            "unrealized_pnl_pct": round(
                (current_value - pos["invested_amount"]) / pos["invested_amount"] * 100, 2
            ) if current_value and pos["invested_amount"] > 0 else None,
            "last_updated": datetime.now().isoformat(),
        })

    # Add weight
    for p in position_data:
        if p["current_value"] and total_value > 0:
            p["weight"] = round(p["current_value"] / total_value * 100, 2)
        else:
            p["weight"] = None
        result.append(PositionOut(**p))

    return sorted(result, key=lambda x: x.current_value or 0, reverse=True)


@router.get("/performance", response_model=list[PerformancePoint])
async def get_performance(period: str = "1y", db: Session = Depends(get_db)):
    """Return portfolio value time series."""
    transactions = _get_all_transactions(db)
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
async def get_analytics(period: str = "1y", db: Session = Depends(get_db)):
    """Return all computed risk/return metrics."""
    transactions = _get_all_transactions(db)
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
