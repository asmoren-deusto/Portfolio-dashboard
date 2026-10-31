"""Database setup — SQLite via SQLAlchemy."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool
import os

DEFAULT_DB = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "portfolio.db"))
DB_PATH = os.getenv("DB_PATH", DEFAULT_DB)
os.makedirs(os.path.dirname(DB_PATH) if os.path.dirname(DB_PATH) else ".", exist_ok=True)

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False, "timeout": 30},
    poolclass=NullPool,
)

from sqlalchemy import event


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode = WAL")
    cursor.execute("PRAGMA busy_timeout = 10000")
    cursor.execute("PRAGMA synchronous = NORMAL")
    cursor.close()


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
    from app.models import Asset, Transaction, PriceCache, User, UserGoal  # noqa
    Base.metadata.create_all(bind=engine)
    _migrate_schema()
    _seed_default_users()
    _seed_default_goals()
    _seed_asier_data()


def _seed_default_goals():
    from app.models import UserGoal
    db = SessionLocal()
    try:
        for uid in ("asier", "demo"):
            existing = db.query(UserGoal).filter(UserGoal.user_id == uid).first()
            if not existing:
                db.add(UserGoal(
                    user_id=uid,
                    name="Patrimonio neto",
                    target_amount=100000.0,
                    target_date=None,
                ))
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


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
                        existing.name = a_data["name"]
                        if a_data.get("ticker"):
                            existing.ticker = a_data["ticker"]
                        if a_data.get("morningstar_id"):
                            existing.morningstar_id = a_data["morningstar_id"]
                        if a_data.get("category") and not existing.category:
                            existing.category = a_data["category"]

            # 2. Seed prices
            # Clean up any obsolete non-zero prices for TR_TRANSFER on persistent volumes
            db.query(PriceCache).filter(
                PriceCache.isin == "TR_TRANSFER",
            ).delete()

            # Purge any weekend dates from price_cache (funds do not liquidate on Saturdays or Sundays)
            try:
                from sqlalchemy import text
                db.execute(text("DELETE FROM price_cache WHERE strftime('%w', date) IN ('0', '6')"))
            except Exception:
                pass

            for p_data in PRICES:
                entry = db.query(PriceCache).filter(
                    PriceCache.isin == p_data["isin"],
                    PriceCache.date == p_data["date"],
                ).first()
                if not entry:
                    src = "live_yahoo" if p_data["isin"] == "IE00B4ND3602" and p_data["date"] >= "2026-10-27" else ("history_sync" if p_data["isin"] == "IE00B4ND3602" else None)
                    row_data = dict(p_data)
                    if src:
                        row_data["source"] = src
                    db.add(PriceCache(**row_data))
                elif p_data.get("price") is not None and abs(entry.price - p_data["price"]) > 0.0001:
                    entry.price = p_data["price"]
                    if p_data["isin"] == "IE00B4ND3602":
                        entry.source = "live_yahoo" if p_data["date"] >= "2026-10-27" else "history_sync"

            # 3. Seed transactions — ensure all seed transactions exist even on persistent DB volumes
            # Clean up obsolete duplicate Vanguard S&P 500 transaction created during v3.5.3 on persistent volumes
            db.query(Transaction).filter(
                Transaction.user_id == "asier",
                Transaction.isin == "IE0032126645",
                Transaction.date == "2026-10-28",
            ).delete()

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
                else:
                    tx_obj = db.query(Transaction).filter(
                        Transaction.user_id == sig[0],
                        Transaction.isin == sig[1],
                        Transaction.date == sig[2],
                        Transaction.type == sig[4],
                        Transaction.amount == t_data["amount"],
                    ).first()
                    if tx_obj:
                        if t_data.get("notes") and tx_obj.notes != t_data["notes"]:
                            tx_obj.notes = t_data["notes"]
                        if t_data.get("shares") is not None and abs((tx_obj.shares or 0) - t_data["shares"]) > 0.0001:
                            tx_obj.shares = t_data["shares"]
                        if t_data.get("price") is not None and abs((tx_obj.price or 0) - t_data["price"]) > 0.0001:
                            tx_obj.price = t_data["price"]

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
