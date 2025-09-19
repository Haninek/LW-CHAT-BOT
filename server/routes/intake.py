"""Intake session endpoints."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
import uuid

from core.database import get_db
from core.auth import require_bearer
from core.idempotency import capture_body, require_idempotency, store_idempotent
from models.intake import Intake
from models.merchant import FieldState

router = APIRouter()


class StartIntakeRequest(BaseModel):
    merchant_id: str
    campaign: str = None


class AnswerFieldRequest(BaseModel):
    merchant_id: str
    field_id: str
    value: str


@router.post("/start", dependencies=[Depends(capture_body)])
async def start_intake(
    req: Request,
    request: StartIntakeRequest,
    db: Session = Depends(get_db),
    tenant_id=Depends(require_idempotency),
    _: bool = Depends(require_bearer)
):
    """Start new intake session."""
    
    if getattr(req.state, "idem_cached", None):
        return req.state.idem_cached
    
    intake_id = str(uuid.uuid4())
    intake = Intake(
        id=intake_id,
        merchant_id=request.merchant_id,
        status="active"
    )
    
    db.add(intake)
    db.commit()
    
    resp = {"intake_id": intake_id}
    await store_idempotent(req, resp)
    return resp


@router.post("/answer", dependencies=[Depends(capture_body)])
async def answer_field(
    req: Request,
    request: AnswerFieldRequest,
    db: Session = Depends(get_db),
    tenant_id=Depends(require_idempotency),
    _: bool = Depends(require_bearer)
):
    """Answer a field during intake and compute missing/confirm fields."""
    
    if getattr(req.state, "idem_cached", None):
        return req.state.idem_cached
    
    # Required fields for complete application
    REQUIRED = [
        "business.legal_name", "business.address", "business.city", 
        "business.state", "business.zip", "contact.phone", "contact.email", 
        "business.ein", "owner.dob", "owner.ssn_last4"
    ]
    
    # Fields that need periodic reconfirmation (field_id: days)
    EXPIRES = {
        "contact.phone": 365,
        "contact.email": 365, 
        "business.address": 365
    }
    
    # Find existing field state or create new one
    field_state = db.query(FieldState).filter(
        FieldState.merchant_id == request.merchant_id,
        FieldState.field_id == request.field_id
    ).first()
    
    if field_state:
        field_state.value = request.value
        field_state.last_verified_at = datetime.utcnow()
        field_state.source = "intake"
        field_state.confidence = 1.0
    else:
        field_state = FieldState(
            merchant_id=request.merchant_id,
            field_id=request.field_id,
            value=request.value,
            source="intake",
            last_verified_at=datetime.utcnow(),
            confidence=1.0
        )
        db.add(field_state)
    
    db.commit()
    
    # Compute missing and confirm sets after upsert
    all_fs = db.query(FieldState).filter(FieldState.merchant_id == request.merchant_id).all()
    by_id = {f.field_id: f for f in all_fs}
    
    # Find missing required fields (empty or missing)
    missing = [
        f for f in REQUIRED 
        if f not in by_id or not (by_id[f].value or "").strip()
    ]
    
    # Find fields that need reconfirmation due to expiry
    confirm = []
    for fid, days in EXPIRES.items():
        st = by_id.get(fid)
        if st and st.last_verified_at:
            days_since_verified = (datetime.utcnow() - st.last_verified_at).days
            if days_since_verified > days:
                confirm.append(fid)
    
    resp = {
        "status": "saved",
        "field_id": request.field_id,
        "missing": missing,
        "confirm": confirm
    }
    await store_idempotent(req, resp)
    return resp