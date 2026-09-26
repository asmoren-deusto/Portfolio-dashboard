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
    from app.models import Asset, Transaction, PriceCache, User  # noqa
    Base.metadata.create_all(bind=engine)
    _seed_default_users()


def _seed_default_users():
    from app.models import User
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            demo_user = User(
                id="demo",
                name="Usuario Demo",
                email="demo@portfoliopro.app",
                password_hash=None,
                password_salt=None,
                strategy="Cartera Indexada Moderada",
                initial_balance=50000.0,
                broker="MyInvestor / Indexa",
                avatar="DM",
                badge="Modo Demo",
                bg_gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                is_demo=True,
            )
            asier_user = User(
                id="asier",
                name="Asier Moreno",
                email="asier.moreno@portfoliopro.app",
                password_hash=None,
                password_salt=None,
                strategy="Cartera Indexada Global",
                initial_balance=100000.0,
                broker="MyInvestor",
                avatar="AM",
                badge="Cuenta Principal",
                bg_gradient="linear-gradient(135deg, #10b981 0%, #047857 100%)",
                is_demo=False,
            )
            db.add_all([demo_user, asier_user])
            db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
