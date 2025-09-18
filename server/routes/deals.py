"""Deal management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

from core.database import get_db
from core.security import verify_partner_key
from models.deal import Deal
from models.merchant import Merchant

router = APIRouter(prefix="/api/deals", tags=["deals"])


class StartDealRequest(BaseModel):
    merchant_id: str
    funding_amount: Optional[float] = None


@router.post("/start")
async def start_deal(
    request: StartDealRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Start a new deal for a merchant."""
    
    # Verify merchant exists
    merchant = db.query(Merchant).filter(Merchant.id == request.merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    # Create new deal
    deal_id = str(uuid.uuid4())
    deal = Deal(
        id=deal_id,
        merchant_id=request.merchant_id,
        status="active",
        funding_amount=request.funding_amount,
        created_at=datetime.utcnow()
    )
    
    db.add(deal)
    db.commit()
    db.refresh(deal)
    
    return {
        "deal_id": deal.id,
        "merchant_id": deal.merchant_id,
        "status": deal.status,
        "funding_amount": deal.funding_amount,
        "created_at": deal.created_at.isoformat()
    }


@router.get("/{deal_id}")
async def get_deal(
    deal_id: str,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Get deal details."""
    
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    return {
        "deal_id": deal.id,
        "merchant_id": deal.merchant_id,
        "status": deal.status,
        "funding_amount": deal.funding_amount,
        "created_at": deal.created_at.isoformat()
    }


@router.get("/merchant/{merchant_id}")
async def get_merchant_deals(
    merchant_id: str,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Get all deals for a merchant."""
    
    deals = db.query(Deal).filter(Deal.merchant_id == merchant_id).order_by(Deal.created_at.desc()).all()
    
    return [
        {
            "deal_id": deal.id,
            "merchant_id": deal.merchant_id,
            "status": deal.status,
            "funding_amount": deal.funding_amount,
            "created_at": deal.created_at.isoformat()
        }
        for deal in deals
    ]