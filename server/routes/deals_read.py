"""Deal read endpoints for listing and viewing deal details."""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, select, func, desc, and_
from typing import Optional, List
from datetime import datetime, timedelta
import json

from core.database import get_db
from core.security import verify_partner_key
from models.deal import Deal
from models.merchant import Merchant, FieldState
from models.document import Document
from models.metrics_snapshot import MetricsSnapshot
from models.offer import Offer
from models.event import Event

router = APIRouter()

# Required fields for complete intake
REQUIRED_FIELDS = [
    "business.legal_name", "business.address", "business.city", "business.state", "business.zip",
    "contact.phone", "contact.email", "business.ein", "owner.dob", "owner.ssn_last4"
]

# Fields that expire and need confirmation
EXPIRES_DAYS = {
    "contact.phone": 365,
    "contact.email": 365, 
    "business.address": 365
}


def compute_missing_confirm(fields: List[FieldState]):
    """Compute missing and confirmation-needed fields."""
    by_field = {f.field_id: f for f in fields}
    
    # Missing fields
    missing = []
    for field_id in REQUIRED_FIELDS:
        field_state = by_field.get(field_id)
        if not field_state or not str(field_state.value or "").strip():
            missing.append(field_id)
    
    # Fields needing confirmation due to age
    confirm = []
    for field_id, expire_days in EXPIRES_DAYS.items():
        field_state = by_field.get(field_id)
        if field_state and field_state.last_verified_at:
            days_old = (datetime.utcnow() - field_state.last_verified_at).days
            if days_old > expire_days:
                confirm.append(field_id)
    
    return missing, confirm


@router.get("")
async def list_deals(
    status: Optional[str] = Query(None, description="open|offer|accepted|signed|declined|closed"),
    q: Optional[str] = Query(None, description="Search legal_name/phone/email"),
    limit: int = Query(50, description="Max number of results"),
    db: Session = Depends(get_db)
):
    """List deals with optional filtering and search."""
    
    # Build query using explicit OUTER JOINs to avoid SQLAlchemy relationship issues
    # Latest event per deal via scalar subquery:
    sub = (
        select(func.max(Event.created_at))
        .where(Event.deal_id == Deal.id)
        .correlate(Deal)
        .scalar_subquery()
    )
    
    query = (
        select(
            Deal.id.label("deal_id"),
            Deal.status,
            Deal.created_at,
            Deal.funding_amount,
            Merchant.id.label("merchant_id"),
            Merchant.legal_name,
            Merchant.phone,
            Merchant.email,
            Merchant.state,
            Event.type.label("last_event_type"),
            Event.created_at.label("last_event_at"),
        )
        .join(Merchant, Merchant.id == Deal.merchant_id, isouter=True)
        .join(Event, and_(Event.deal_id == Deal.id, Event.created_at == sub), isouter=True)
        .order_by(desc(Deal.created_at))
    )
    
    if status:
        query = query.where(Deal.status == status)
    
    if q:
        search_term = f"%{q}%"
        query = query.where(
            (Merchant.legal_name.ilike(search_term)) |
            (Merchant.phone.ilike(search_term)) |
            (Merchant.email.ilike(search_term))
        )
    
    query = query.limit(limit)
    
    items = []
    for row in db.execute(query).all():
        items.append({
            "deal_id": row.deal_id,
            "status": row.status,
            "created_at": row.created_at.isoformat(),
            "funding_amount": row.funding_amount,
            "merchant": {
                "id": row.merchant_id,
                "legal_name": row.legal_name,
                "phone": row.phone[-4:] if row.phone and len(row.phone) >= 4 else None,  # Safe mask phone
                "email": (row.email.split('@')[0][:3] + "***@" + row.email.split('@')[1]) if row.email and '@' in row.email else None,  # Safe mask email
                "state": row.state
            },
            "metrics_summary": None,  # Redacted for security
            "background": None,  # Redacted for security
            "last_event": {
                "type": row.last_event_type,
                "created_at": row.last_event_at.isoformat() if row.last_event_at else None
            } if row.last_event_type else None
        })
    
    return {"items": items}


@router.get("/{deal_id}")
async def get_deal(
    deal_id: str,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Get comprehensive deal details."""
    
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    merchant = db.query(Merchant).filter(Merchant.id == deal.merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    # Get field states for intake analysis
    fields = db.query(FieldState).filter(FieldState.merchant_id == merchant.id).all()
    missing, confirm = compute_missing_confirm(fields)
    
    # Get documents
    documents = db.query(Document).filter(
        Document.deal_id == deal_id
    ).order_by(Document.created_at.asc()).all()
    
    # Get latest metrics
    metrics = db.query(MetricsSnapshot).filter(
        MetricsSnapshot.deal_id == deal_id
    ).order_by(MetricsSnapshot.created_at.desc()).first()
    
    # Get offers
    offers = db.query(Offer).filter(
        Offer.deal_id == deal_id
    ).order_by(Offer.created_at.desc()).all()
    
    # Get events for timeline
    events = db.query(Event).filter(
        Event.merchant_id == merchant.id
    ).order_by(Event.created_at.desc()).limit(100).all()
    
    # Extract specific event types
    background_event = next((e for e in events if e.type == "background.result"), None)
    sign_sent_event = next((e for e in events if e.type == "sign.sent"), None)
    sign_signed_event = next((e for e in events if e.type in ["sign.completed", "contract.completed"]), None)
    
    return {
        "deal": {
            "id": deal.id,
            "status": deal.status,
            "funding_amount": deal.funding_amount,
            "created_at": deal.created_at.isoformat(),
            "completed_at": deal.completed_at.isoformat() if deal.completed_at else None
        },
        "merchant": {
            "id": merchant.id,
            "legal_name": merchant.legal_name,
            "phone": merchant.phone[-4:] if merchant.phone else None,  # Redacted for security
            "email": merchant.email.split('@')[0][:3] + "***@" + merchant.email.split('@')[1] if merchant.email else None,  # Redacted 
            "state": merchant.state,
            "ein": "***-**-" + merchant.ein[-4:] if merchant.ein else None,  # Redacted EIN
            "address": None,  # Redacted for security
            "city": merchant.city,
            "zip": merchant.zip[:3] + "**" if merchant.zip else None  # Partial zip
        },
        "intake": {
            "fields": [],  # Redacted field values for security
            "missing": [],  # Redacted for security  
            "confirm": []  # Redacted for security
        },
        "documents": [
            {
                "id": doc.id,
                "filename": doc.filename,
                "parsed": doc.parsed,
                "month": doc.month,
                "created_at": doc.created_at.isoformat()
            }
            for doc in documents
        ],
        "metrics": metrics.payload if metrics else None,
        "offers": [
            {
                "id": offer.id,
                "payload": offer.payload_json,
                "status": offer.status,
                "created_at": offer.created_at.isoformat()
            }
            for offer in offers
        ],
        "background": json.loads(background_event.data_json) if background_event and background_event.data_json else None,
        "signing": {
            "sent": json.loads(sign_sent_event.data_json) if sign_sent_event and sign_sent_event.data_json else None,
            "signed": json.loads(sign_signed_event.data_json) if sign_signed_event and sign_signed_event.data_json else None
        },
        "timeline": [
            {
                "type": e.type,
                "data": json.loads(e.data_json) if e.data_json else None,
                "created_at": e.created_at.isoformat()
            }
            for e in events
        ]
    }


@router.get("/{deal_id}/summary")
async def get_deal_summary(
    deal_id: str,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Get quick deal summary for dashboards."""
    
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    merchant = db.query(Merchant).filter(Merchant.id == deal.merchant_id).first()
    
    # Count documents
    doc_count = db.query(Document).filter(Document.deal_id == deal_id).count()
    
    # Count offers
    offer_count = db.query(Offer).filter(Offer.deal_id == deal_id).count()
    
    # Latest background status
    background = db.query(Event).filter(
        Event.merchant_id == deal.merchant_id,
        Event.type == "background.result"
    ).order_by(Event.created_at.desc()).first()
    
    return {
        "deal_id": deal.id,
        "status": deal.status,
        "merchant_name": merchant.legal_name if merchant else "Unknown",
        "funding_amount": deal.funding_amount,
        "created_at": deal.created_at.isoformat(),
        "counts": {
            "documents": doc_count,
            "offers": offer_count
        },
        "background_status": json.loads(background.data_json).get("status") if background and background.data_json else None
    }