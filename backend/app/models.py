from sqlalchemy import Column, String, Float, Integer, Text, DateTime, Boolean, func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    password_salt = Column(String(64), nullable=True)
    strategy = Column(String(100), default="Cartera Indexada Global")
    initial_balance = Column(Float, default=50000.0)
    broker = Column(String(50), default="MyInvestor")
    avatar = Column(String(10), default="AM")
    badge = Column(String(50), default="Cuenta Principal")
    bg_gradient = Column(String(150), default="linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)")
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())


class Asset(Base):
    __tablename__ = "assets"

    isin = Column(String(12), primary_key=True)
    name = Column(String(255), nullable=False)
    ticker = Column(String(20))          # Yahoo Finance ticker (if exists)
    asset_type = Column(String(20), default="fund")  # fund | etf | stock | crypto
    currency = Column(String(3), default="EUR")
    morningstar_id = Column(String(50))
    category = Column(String(100))       # Morningstar category
    ter = Column(Float)                  # Total Expense Ratio
    created_at = Column(DateTime, server_default=func.now())


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    isin = Column(String(12), nullable=False)
    type = Column(String(10), nullable=False)   # buy | sell | dividend | transfer
    shares = Column(Float, nullable=False)
    price = Column(Float, nullable=False)       # NAV price at execution
    amount = Column(Float, nullable=False)      # total amount (shares * price + fees)
    fees = Column(Float, default=0.0)
    date = Column(String(10), nullable=False)   # YYYY-MM-DD
    broker = Column(String(50), default="myinvestor")
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


class PriceCache(Base):
    __tablename__ = "price_cache"

    isin = Column(String(12), primary_key=True)
    date = Column(String(10), primary_key=True)  # YYYY-MM-DD
    price = Column(Float, nullable=False)
    currency = Column(String(3), default="EUR")
    source = Column(String(50))
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
