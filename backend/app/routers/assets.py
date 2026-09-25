"""Assets router — manage asset catalog + price data."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Asset
from app.schemas import AssetCreate, AssetOut, PricePoint
from app.services.price_service import get_current_price, get_price_history

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("", response_model=list[AssetOut])
def list_assets(db: Session = Depends(get_db)):
    return db.query(Asset).all()


@router.post("", response_model=AssetOut)
def create_asset(asset: AssetCreate, db: Session = Depends(get_db)):
    existing = db.query(Asset).filter(Asset.isin == asset.isin).first()
    if existing:
        raise HTTPException(status_code=409, detail="Asset already exists")
    db_asset = Asset(**asset.model_dump())
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset


@router.put("/{isin}", response_model=AssetOut)
def update_asset(isin: str, asset: AssetCreate, db: Session = Depends(get_db)):
    db_asset = db.query(Asset).filter(Asset.isin == isin).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    for k, v in asset.model_dump().items():
        setattr(db_asset, k, v)
    db.commit()
    db.refresh(db_asset)
    return db_asset


@router.get("/{isin}/price")
async def get_price(isin: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.isin == isin).first()
    ticker = asset.ticker if asset else None
    price = await get_current_price(isin, ticker)
    return {"isin": isin, "price": price, "ticker": ticker}


@router.get("/{isin}/history", response_model=list[PricePoint])
async def get_history(isin: str, period: str = "1y", db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.isin == isin).first()
    ticker = asset.ticker if asset else None
    history = await get_price_history(isin, ticker, period)
    return [PricePoint(**h) for h in history]
