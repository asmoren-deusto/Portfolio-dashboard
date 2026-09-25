"""Transactions router — CRUD + CSV import."""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import logging

from app.database import get_db
from app.models import Asset, Transaction
from app.schemas import TransactionCreate, TransactionOut
from app.services.csv_importer import parse_myinvestor_csv

router = APIRouter(prefix="/api/transactions", tags=["transactions"])
logger = logging.getLogger(__name__)


@router.get("", response_model=list[TransactionOut])
def get_transactions(db: Session = Depends(get_db)):
    """List all transactions ordered by date desc."""
    return db.query(Transaction).order_by(Transaction.date.desc()).all()


@router.post("", response_model=TransactionOut)
def create_transaction(tx: TransactionCreate, db: Session = Depends(get_db)):
    """Add a single transaction manually."""
    db_tx = Transaction(**tx.model_dump())
    db.add(db_tx)

    # Auto-create asset entry if missing
    existing = db.query(Asset).filter(Asset.isin == tx.isin).first()
    if not existing:
        db.add(Asset(isin=tx.isin, name=f"Asset {tx.isin}", asset_type="fund"))

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
async def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Import transactions from a MyInvestor CSV export.
    Auto-detects column names and Spanish number formatting.
    """
    if not file.filename.lower().endswith((".csv", ".txt")):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()
    transactions = parse_myinvestor_csv(content)

    if not transactions:
        raise HTTPException(status_code=422, detail="No valid transactions found in CSV")

    imported = 0
    skipped = 0

    for tx_data in transactions:
        # Skip duplicates (same isin + date + amount)
        existing = db.query(Transaction).filter(
            Transaction.isin == tx_data["isin"],
            Transaction.date == tx_data["date"],
            Transaction.amount == tx_data["amount"],
        ).first()

        if existing:
            skipped += 1
            continue

        db_tx = Transaction(**tx_data)
        db.add(db_tx)

        # Auto-create asset if missing
        if not db.query(Asset).filter(Asset.isin == tx_data["isin"]).first():
            db.add(Asset(isin=tx_data["isin"], name=f"Fund {tx_data['isin']}", asset_type="fund"))

        imported += 1

    db.commit()
    return {
        "imported": imported,
        "skipped": skipped,
        "total": len(transactions),
        "message": f"Successfully imported {imported} transactions ({skipped} duplicates skipped)",
    }
