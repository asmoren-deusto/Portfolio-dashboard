"""Database setup — SQLite via SQLAlchemy."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os

DEFAULT_DB = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "portfolio.db"))
DB_PATH = os.getenv("DB_PATH", DEFAULT_DB)
os.makedirs(os.path.dirname(DB_PATH) if os.path.dirname(DB_PATH) else ".", exist_ok=True)

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.models import Asset, Transaction, PriceCache  # noqa
    Base.metadata.create_all(bind=engine)
