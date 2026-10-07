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
    _migrate_schema()
    _seed_default_users()
    _seed_asier_data()


def _migrate_schema():
    with engine.connect() as conn:
        try:
            columns = [c[1] for c in conn.exec_driver_sql("PRAGMA table_info(transactions)").fetchall()]
            if columns and "user_id" not in columns:
                conn.exec_driver_sql("ALTER TABLE transactions ADD COLUMN user_id VARCHAR(50) DEFAULT 'asier'")
        except Exception:
            pass
        try:
            conn.exec_driver_sql(
                "UPDATE users SET broker = 'Kutxabank / Scalable / Trade Republic' "
                "WHERE id = 'demo' AND broker IN ('MyInvestor / Indexa', 'Indexa / BBVA / Trade Republic')"
            )
            conn.commit()
        except Exception:
            pass


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
                broker="Kutxabank / Scalable / Trade Republic",
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


def _seed_asier_data():
    """Ensure real portfolio assets, prices, and transactions exist on fresh deployment."""
    try:
        from app.models import Asset, Transaction, PriceCache
        from app.seed_data import ASSETS, PRICES, TRANSACTIONS

        db = SessionLocal()
        try:
            # 1. Seed assets
            seen_assets = {a.isin for a in db.query(Asset).all()}
            for a_data in ASSETS:
                if a_data["isin"] not in seen_assets:
                    db.add(Asset(**a_data))
                    seen_assets.add(a_data["isin"])
                else:
                    existing = db.query(Asset).filter(Asset.isin == a_data["isin"]).first()
                    if existing:
                        if a_data.get("ticker"):
                            existing.ticker = a_data["ticker"]
                        if a_data.get("morningstar_id"):
                            existing.morningstar_id = a_data["morningstar_id"]
                        if a_data.get("category") and not existing.category:
                            existing.category = a_data["category"]

            # 2. Seed prices
            # Clean up any obsolete non-zero prices for TR_TRANSFER in 2026 on persistent volumes
            db.query(PriceCache).filter(
                PriceCache.isin == "TR_TRANSFER",
                PriceCache.date >= "2026-01-01",
            ).delete()

            for p_data in PRICES:
                entry = db.query(PriceCache).filter(
                    PriceCache.isin == p_data["isin"],
                    PriceCache.date == p_data["date"],
                ).first()
                if not entry:
                    db.add(PriceCache(**p_data))
                elif p_data.get("price") is not None and abs(entry.price - p_data["price"]) > 0.0001:
                    entry.price = p_data["price"]

            # 3. Seed transactions — ensure all seed transactions exist even on persistent DB volumes
            existing_txs = {
                (t.user_id, t.isin, t.date, round(float(t.amount), 2), t.type)
                for t in db.query(Transaction).filter(Transaction.user_id == "asier").all()
            }
            for t_data in TRANSACTIONS:
                sig = (
                    t_data.get("user_id", "asier"),
                    t_data["isin"],
                    t_data["date"],
                    round(float(t_data["amount"]), 2),
                    t_data["type"],
                )
                if sig not in existing_txs:
                    db.add(Transaction(**t_data))
                    existing_txs.add(sig)

            db.query(Transaction).filter(
                Transaction.user_id == "asier",
                Transaction.isin == "IE000ZYRH0Q7",
                Transaction.date == "2025-10-29"
            ).update({"notes": "Traspaso de Entrada desde Trade Republic"})

            db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()
    except ImportError:
        pass
