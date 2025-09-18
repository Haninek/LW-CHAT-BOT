"""Merchant management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
import uuid

from core.database import get_db
from models.merchant import Merchant, FieldState
from models.deal import Deal

router = APIRouter()


class MerchantResponse(BaseModel):
    id: str
    legal_name: str
    status: str
    phone: Optional[str] = None
    email: Optional[str] = None


@router.get("/")
async def search_merchants(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Search merchants by name, phone, or email."""
    query = db.query(Merchant)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Merchant.legal_name.ilike(search_term)) |
            (Merchant.phone.ilike(search_term)) |
            (Merchant.email.ilike(search_term))
        )
    
    merchants = query.limit(50).all()
    return [
        MerchantResponse(
            id=m.id,
            legal_name=m.legal_name,
            status=m.status,
            phone=m.phone,
            email=m.email
        )
        for m in merchants
    ]


@router.get("/resolve")
async def resolve_merchant(
    phone: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    ein: Optional[str] = Query(None),
    legal_name: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Resolve existing merchant with enhanced matching and open deal detection."""
    
    m = None
    score = 0.0
    
    # Try token first (decode merchant ID) - legacy support
    if token:
        try:
            merchant_id = token.replace("demo_", "")  # Simple token for demo
            m = db.query(Merchant).filter(Merchant.id == merchant_id).first()
            if m:
                score = 1.0
        except:
            pass
    
    # Try EIN match (highest confidence)
    if not m and ein:
        m = db.query(Merchant).filter(Merchant.ein == ein).first()
        score = 0.99 if m else 0
    
    # Try phone/email match (high confidence)
    if not m and (phone or email):
        q = db.query(Merchant)
        if phone:
            q = q.filter(Merchant.phone == phone)
        if email:
            q = q.filter(Merchant.email == email)
        m = q.first()
        score = 0.95 if m else 0
    
    # Try fuzzy legal name match (medium confidence)
    if not m and legal_name:
        name = (legal_name or "").lower().strip()
        if name:
            cands = db.query(Merchant).all()
            best = None
            best_score = 0
            
            for candidate in cands:
                if candidate.legal_name:
                    candidate_name = candidate.legal_name.lower().strip()
                    # Simple length-based similarity + state match bonus
                    length_sim = 1 - abs(len(candidate_name) - len(name)) / max(len(name), len(candidate_name), 1)
                    
                    # State match bonus
                    state_bonus = 0.1 if (state and candidate.state and 
                                        candidate.state.lower() == state.lower()) else 0
                    
                    candidate_score = length_sim + state_bonus
                    
                    if candidate_score > best_score and candidate_score > 0.6:  # Minimum threshold
                        best = candidate
                        best_score = candidate_score
            
            if best:
                m = best
                score = min(0.8, best_score)  # Cap fuzzy matches at 0.8
    
    if not m:
        return {"found": False}
    
    # Return open/active deal if any
    open_deal = db.query(Deal).filter(
        Deal.merchant_id == m.id, 
        Deal.status.in_(["open", "offer", "accepted"])
    ).order_by(Deal.created_at.desc()).first()
    
    return {
        "found": True,
        "merchant": {
            "id": m.id,
            "legal_name": m.legal_name,
            "phone": m.phone,
            "email": m.email
        },
        "open_deal": {
            "id": open_deal.id,
            "status": open_deal.status
        } if open_deal else None,
        "match": {
            "score": round(score, 2)
        }
    }


@router.post("/import-csv")
async def import_csv_merchants(
    # TODO: Implement CSV import
    db: Session = Depends(get_db)
):
    """Import merchants from CSV file."""
    # Placeholder for CSV import functionality
    return {"message": "CSV import not yet implemented", "imported": 0}