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


# ── User & Auth schemas ────────────────────────────────────────────────────────
class UserOut(BaseModel):
    id: str
    name: str
    email: str
    strategy: str
    initial_balance: float
    broker: str
    avatar: str
    badge: str
    bg_gradient: str
    is_demo: bool
    has_password: bool

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None


class LoginResponse(BaseModel):
    success: bool
    user: Optional[UserOut] = None
    token: Optional[str] = None
    error: Optional[str] = None


class SetPasswordRequest(BaseModel):
    user_id: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    user_id: str
    current_password: str
    new_password: str


class CreateUserRequest(BaseModel):
    name: str
    email: str
    strategy: str = "Cartera Indexada Global"
    initial_balance: float = 50000.0
    password: Optional[str] = None

