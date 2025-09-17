"""Merchant management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
import uuid

from core.database import get_db
from models.merchant import Merchant, FieldState

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
    token: Optional[str] = Query(None),
    phone: Optional[str] = Query(None), 
    email: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Resolve existing merchant for ask-only-what's-missing logic."""
    
    merchant = None
    
    # Try token first (decode merchant ID)
    if token:
        try:
            merchant_id = token.replace("demo_", "")  # Simple token for demo
            merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
        except:
            pass
    
    # Try phone/email fuzzy match
    if not merchant and (phone or email):
        query = db.query(Merchant)
        if phone:
            query = query.filter(Merchant.phone == phone)
        elif email:
            query = query.filter(Merchant.email == email)
        merchant = query.first()
    
    if not merchant:
        return {"found": False}
    
    # Get field states for ask-only-what's-missing
    field_states = db.query(FieldState).filter(FieldState.merchant_id == merchant.id).all()
    field_map = {fs.field_id: {
        "value": fs.value,
        "last_verified_at": fs.last_verified_at.isoformat() if fs.last_verified_at else None,
        "confidence": fs.confidence,
        "source": fs.source
    } for fs in field_states}
    
    return {
        "found": True,
        "merchant": {
            "id": merchant.id,
            "legal_name": merchant.legal_name,
            "status": merchant.status,
            "phone": merchant.phone,
            "email": merchant.email
        },
        "fields": field_map
    }


@router.post("/import-csv")
async def import_csv_merchants(
    # TODO: Implement CSV import
    db: Session = Depends(get_db)
):
    """Import merchants from CSV file."""
    # Placeholder for CSV import functionality
    return {"message": "CSV import not yet implemented", "imported": 0}