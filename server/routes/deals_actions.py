"""Deal action endpoints for accepting offers and updating deal status."""

from fastapi import APIRouter, Depends, HTTPException, Path, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import uuid
import json

from core.database import get_db
from core.security import verify_partner_key
from models.deal import Deal
from models.offer import Offer
from models.event import Event

router = APIRouter()


class AcceptOfferRequest(BaseModel):
    offer_id: str
    terms_accepted: bool = True
    notes: Optional[str] = None


class UpdateDealStatusRequest(BaseModel):
    status: str
    reason: Optional[str] = None
    notes: Optional[str] = None


@router.post("/{deal_id}/accept")
async def accept_offer(
    deal_id: str = Path(..., description="Deal ID"),
    request: AcceptOfferRequest = Body(...),
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Accept a specific offer for a deal."""
    
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Find the offer
    offer = db.query(Offer).filter(
        Offer.id == request.offer_id,
        Offer.deal_id == deal_id
    ).first()
    
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    # Update offer status
    offer.status = "accepted"
    
    # Update deal status
    deal.status = "accepted"
    if offer.payload_json:
        try:
            offer_data = json.loads(offer.payload_json) if isinstance(offer.payload_json, str) else offer.payload_json
            deal.funding_amount = offer_data.get("amount")
        except:
            pass
    
    # Log acceptance event
    event = Event(
        merchant_id=deal.merchant_id,
        type="offer.accepted",
        data_json=json.dumps({
            "deal_id": deal_id,
            "offer_id": request.offer_id,
            "terms_accepted": request.terms_accepted,
            "notes": request.notes,
            "offer_details": offer.payload_json
        })
    )
    
    db.add(event)
    db.commit()
    
    return {
        "success": True,
        "deal_id": deal_id,
        "offer_id": request.offer_id,
        "deal_status": deal.status,
        "offer_status": offer.status,
        "funding_amount": deal.funding_amount
    }


@router.post("/{deal_id}/decline")
async def decline_deal(
    deal_id: str = Path(..., description="Deal ID"),
    request: UpdateDealStatusRequest = Body(...),
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Decline a deal."""
    
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Capture previous status before updating
    previous_status = deal.status
    
    # Update deal status
    deal.status = "declined"
    
    # Log decline event
    event = Event(
        merchant_id=deal.merchant_id,
        type="deal.declined",
        data_json=json.dumps({
            "deal_id": deal_id,
            "reason": request.reason,
            "notes": request.notes,
            "previous_status": previous_status
        })
    )
    
    db.add(event)
    db.commit()
    
    return {
        "success": True,
        "deal_id": deal_id,
        "status": deal.status,
        "reason": request.reason
    }


@router.post("/{deal_id}/status")
async def update_deal_status(
    deal_id: str = Path(..., description="Deal ID"),
    request: UpdateDealStatusRequest = Body(...),
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Update deal status with reason and notes."""
    
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    previous_status = deal.status
    
    # Validate status transition
    valid_statuses = ["open", "offer", "accepted", "signed", "declined", "closed", "cancelled"]
    if request.status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    # Update deal status
    deal.status = request.status
    
    # Set completion date for final statuses
    if request.status in ["signed", "declined", "closed", "cancelled"]:
        from datetime import datetime
        deal.completed_at = datetime.utcnow()
    
    # Log status change event
    event = Event(
        merchant_id=deal.merchant_id,
        type="deal.status_changed",
        data_json=json.dumps({
            "deal_id": deal_id,
            "previous_status": previous_status,
            "new_status": request.status,
            "reason": request.reason,
            "notes": request.notes
        })
    )
    
    db.add(event)
    db.commit()
    
    return {
        "success": True,
        "deal_id": deal_id,
        "previous_status": previous_status,
        "new_status": request.status,
        "reason": request.reason,
        "completed_at": deal.completed_at.isoformat() if deal.completed_at else None
    }


@router.post("/{deal_id}/reopen")
async def reopen_deal(
    deal_id: str = Path(..., description="Deal ID"),
    notes: Optional[str] = Body(None, description="Reason for reopening"),
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Reopen a closed or declined deal."""
    
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    if deal.status not in ["declined", "closed", "cancelled"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reopen deal with status '{deal.status}'"
        )
    
    previous_status = deal.status
    deal.status = "open"
    deal.completed_at = None
    
    # Log reopen event
    event = Event(
        merchant_id=deal.merchant_id,
        type="deal.reopened",
        data_json=json.dumps({
            "deal_id": deal_id,
            "previous_status": previous_status,
            "notes": notes
        })
    )
    
    db.add(event)
    db.commit()
    
    return {
        "success": True,
        "deal_id": deal_id,
        "previous_status": previous_status,
        "new_status": deal.status,
        "notes": notes
    }