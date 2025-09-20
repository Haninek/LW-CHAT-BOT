"""Merchant management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Dict
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

    class Config:
        orm_mode = True


class CreateMerchantRequest(BaseModel):
    legal_name: str
    dba: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    ein: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None


class CreateMerchantResponse(BaseModel):
    success: bool
    merchant: MerchantResponse
    reused: bool = False

    class Config:
        orm_mode = True


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


def _merchant_to_response(merchant: Merchant, status_override: Optional[str] = None) -> MerchantResponse:
    """Convert Merchant ORM object into response model."""
    status = status_override or merchant.status or "new"
    return MerchantResponse(
        id=merchant.id,
        legal_name=merchant.legal_name,
        status=status,
        phone=merchant.phone,
        email=merchant.email
    )


def _upsert_field_states(
    db: Session,
    merchant: Merchant,
    values: Dict[str, Optional[str]],
    source: str = "manual"
) -> None:
    """Create or update FieldState records for provided values."""
    if not values:
        return

    existing = {
        fs.field_id: fs
        for fs in db.query(FieldState).filter(FieldState.merchant_id == merchant.id).all()
    }

    for field_id, value in values.items():
        if not value:
            continue
        if field_id in existing:
            fs = existing[field_id]
            fs.value = value
            fs.source = source
        else:
            db.add(FieldState(
                merchant_id=merchant.id,
                field_id=field_id,
                value=value,
                source=source
            ))


@router.post("/create", response_model=CreateMerchantResponse)
async def create_merchant(
    request: CreateMerchantRequest,
    db: Session = Depends(get_db)
) -> CreateMerchantResponse:
    """Create a merchant or reuse an existing match based on EIN/email/phone."""

    match_fields = [
        (Merchant.ein, request.ein),
        (Merchant.email, request.email),
        (Merchant.phone, request.phone)
    ]

    merchant = None
    for column, value in match_fields:
        if value:
            merchant = db.query(Merchant).filter(column == value).first()
            if merchant:
                break

    reused = merchant is not None

    if not merchant:
        merchant = Merchant(
            id=str(uuid.uuid4()),
            legal_name=request.legal_name,
            dba=request.dba,
            phone=request.phone,
            email=request.email,
            ein=request.ein,
            address=request.address,
            city=request.city,
            state=request.state,
            zip=request.zip,
            status="new"
        )
        db.add(merchant)
    else:
        # Update basic profile details if new data is provided
        updates = {
            "legal_name": request.legal_name,
            "dba": request.dba,
            "phone": request.phone,
            "email": request.email,
            "ein": request.ein,
            "address": request.address,
            "city": request.city,
            "state": request.state,
            "zip": request.zip,
        }
        for attr, value in updates.items():
            if value and getattr(merchant, attr) != value:
                setattr(merchant, attr, value)
        if not merchant.status or merchant.status == "new":
            merchant.status = "existing"

    field_values = {
        "business.legal_name": request.legal_name,
        "business.dba": request.dba,
        "contact.phone": request.phone,
        "contact.email": request.email,
        "business.ein": request.ein,
        "business.address": request.address,
        "business.city": request.city,
        "business.state": request.state,
        "business.zip": request.zip,
    }

    _upsert_field_states(db, merchant, field_values)

    db.commit()
    db.refresh(merchant)

    response_status = "existing" if reused else merchant.status or "new"
    return CreateMerchantResponse(success=True, reused=reused, merchant=_merchant_to_response(merchant, response_status))


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