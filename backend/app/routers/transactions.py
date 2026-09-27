"""Transactions router — CRUD + CSV/Excel import + Text paste import."""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import logging

from app.database import get_db
from app.models import Asset, Transaction
from app.schemas import TransactionCreate, TransactionOut, ImportTextRequest
from app.services.csv_importer import parse_myinvestor_csv
from app.services.parse_web_orders import parse_web_text, KNOWN_NAMES

router = APIRouter(prefix="/api/transactions", tags=["transactions"])
logger = logging.getLogger(__name__)


@router.get("", response_model=list[TransactionOut])
def get_transactions(user_id: str = "asier", broker: str | None = None, db: Session = Depends(get_db)):
    """List all transactions ordered by date desc."""
    query = db.query(Transaction).filter(Transaction.user_id == user_id)
    if broker and broker.lower() not in ["all", "todos"]:
        query = query.filter(Transaction.broker == broker.lower())
    return query.order_by(Transaction.date.desc()).all()


@router.post("", response_model=TransactionOut)
def create_transaction(tx: TransactionCreate, db: Session = Depends(get_db)):
    """Add a single transaction manually."""
    data = tx.model_dump()
    asset_name = data.pop("asset_name", None) or f"Fondo {tx.isin}"
    if not data.get("user_id"):
        data["user_id"] = "asier"

    db_tx = Transaction(**data)
    db.add(db_tx)

    # Auto-create asset entry if missing
    existing = db.query(Asset).filter(Asset.isin == tx.isin).first()
    if not existing:
        db.add(Asset(isin=tx.isin, name=asset_name, asset_type="fund"))
    elif asset_name and (existing.name.startswith("Asset ") or existing.name.startswith("Fund ") or existing.name.startswith("Fondo ")):
        existing.name = asset_name

    db.commit()
    db.refresh(db_tx)
    return db_tx


@router.delete("/{tx_id}")
def delete_transaction(tx_id: int, db: Session = Depends(get_db)):
    """Delete a transaction by ID."""
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(tx)
    db.commit()
    return {"ok": True}


@router.post("/import-csv")
async def import_csv(file: UploadFile = File(...), user_id: str = "asier", db: Session = Depends(get_db)):
    """
    Import transactions from MyInvestor CSV or Excel export.
    Auto-detects column names and Spanish number formatting.
    """
    allowed_exts = (".csv", ".txt", ".xlsx", ".xls", ".tsv")
    if not any(file.filename.lower().endswith(ext) for ext in allowed_exts):
        raise HTTPException(
            status_code=400,
            detail=f"Formato no admitido ('{file.filename}'). Formatos válidos: CSV, Excel (.xlsx, .xls), TXT.",
        )

    content = await file.read()
    transactions = parse_myinvestor_csv(content, filename=file.filename)

    if not transactions:
        raise HTTPException(
            status_code=422,
            detail="No se encontraron operaciones válidas en el archivo. Asegúrate de que contiene las columnas de Fecha, ISIN, Títulos o Importe.",
        )

    imported = 0
    skipped = 0
    seen_assets = {a.isin for a in db.query(Asset).all()}

    for tx_data in transactions:
        tx_data["user_id"] = user_id
        asset_name = tx_data.pop("name", "")
        isin = tx_data["isin"]

        # Skip duplicates (same isin + date + amount + user_id)
        existing = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.isin == isin,
            Transaction.date == tx_data["date"],
            Transaction.amount == tx_data["amount"],
        ).first()

        if existing:
            skipped += 1
            continue

        db_tx = Transaction(**tx_data)
        db.add(db_tx)

        # Auto-create or update asset
        if isin not in seen_assets:
            db.add(Asset(isin=isin, name=asset_name or f"Fondo {isin}", asset_type="fund"))
            seen_assets.add(isin)
        elif asset_name:
            asset = db.query(Asset).filter(Asset.isin == isin).first()
            if asset and (asset.name.startswith("Asset ") or asset.name.startswith("Fund ") or asset.name.startswith("Fondo ")):
                asset.name = asset_name

        imported += 1

    db.commit()
    return {
        "imported": imported,
        "skipped": skipped,
        "total": len(transactions),
        "message": f"Se han importado correctamente {imported} operaciones ({skipped} duplicadas omitidas).",
    }


@router.post("/import-text")
def import_text(req: ImportTextRequest, db: Session = Depends(get_db)):
    """
    Import transactions directly from text copied from MyInvestor website.
    Distinguishes Suscripción (buy) vs Reembolso (sell) and maps ISINs.
    """
    ops = parse_web_text(req.text)
    if not ops:
        raise HTTPException(
            status_code=422,
            detail="No se detectaron operaciones en el texto proporcionado. Asegúrate de copiar el listado de movimientos de MyInvestor.",
        )

    user_id = req.user_id or "asier"
    finalized = [op for op in ops if op["status"] == "finalizada" and op["type"] in ["buy", "sell"] and op["isin"]]

    imported = 0
    skipped = 0
    seen_assets = {a.isin for a in db.query(Asset).all()}

    for op in finalized:
        isin = op["isin"]
        amount = op["amount"]
        shares = op["shares"]
        date = op["date"]
        op_type = op["type"]
        price = round(amount / shares, 4) if shares > 0 else 0.0

        existing = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.isin == isin,
            Transaction.date == date,
            Transaction.amount == amount,
            Transaction.type == op_type,
        ).first()

        if existing:
            skipped += 1
            continue

        db.add(Transaction(
            user_id=user_id,
            isin=isin,
            type=op_type,
            shares=shares,
            price=price,
            amount=amount,
            fees=0.0,
            date=date,
            broker="myinvestor",
            notes=op["raw_type"],
        ))

        name = KNOWN_NAMES.get(isin, op["fund_name"])
        if isin not in seen_assets:
            db.add(Asset(isin=isin, name=name, asset_type="fund"))
            seen_assets.add(isin)
        else:
            asset = db.query(Asset).filter(Asset.isin == isin).first()
            if asset and name and (asset.name.startswith("Asset ") or asset.name.startswith("Fund ") or asset.name.startswith("Fondo ")):
                asset.name = name

        imported += 1

    db.commit()
    return {
        "imported": imported,
        "skipped": skipped,
        "total": len(finalized),
        "message": f"Se han importado correctamente {imported} operaciones ({skipped} duplicadas omitidas).",
    }
