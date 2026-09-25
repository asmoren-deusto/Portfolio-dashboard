"""SQLAlchemy ORM models."""
from sqlalchemy import Column, String, Float, Integer, Text, DateTime, func
from app.database import Base


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
