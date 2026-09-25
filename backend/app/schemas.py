"""Pydantic schemas for API request/response validation."""
from pydantic import BaseModel
from typing import Optional
from datetime import date


# ── Asset schemas ──────────────────────────────────────────────────────────────
class AssetBase(BaseModel):
    isin: str
    name: str
    ticker: Optional[str] = None
    asset_type: str = "fund"
    currency: str = "EUR"
    morningstar_id: Optional[str] = None
    category: Optional[str] = None
    ter: Optional[float] = None


class AssetCreate(AssetBase):
    pass


class AssetOut(AssetBase):
    class Config:
        from_attributes = True


# ── Transaction schemas ────────────────────────────────────────────────────────
class TransactionBase(BaseModel):
    isin: str
    type: str          # buy | sell | dividend | transfer
    shares: float
    price: float
    amount: float
    fees: float = 0.0
    date: str          # YYYY-MM-DD
    broker: str = "myinvestor"
    notes: Optional[str] = None


class TransactionCreate(TransactionBase):
    pass


class TransactionOut(TransactionBase):
    id: int

    class Config:
        from_attributes = True


# ── Portfolio summary schemas ──────────────────────────────────────────────────
class PositionOut(BaseModel):
    isin: str
    name: str
    asset_type: str
    currency: str
    shares: float
    avg_cost: float
    current_price: Optional[float]
    current_value: Optional[float]
    invested_amount: float
    unrealized_pnl: Optional[float]
    unrealized_pnl_pct: Optional[float]
    weight: Optional[float] = None   # % of total portfolio
    last_updated: Optional[str] = None



class PortfolioSummary(BaseModel):
    total_value: float
    total_invested: float
    total_pnl: float
    total_pnl_pct: float
    num_positions: int
    last_updated: str


class PerformancePoint(BaseModel):
    date: str
    value: float


class PricePoint(BaseModel):
    date: str
    price: float
