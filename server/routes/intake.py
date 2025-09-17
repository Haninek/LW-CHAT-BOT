"""Intake session endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import uuid

from core.database import get_db
from core.security import verify_partner_key
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


@router.post("/start")
async def start_intake(
    request: StartIntakeRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Start new intake session."""
    
    intake_id = str(uuid.uuid4())
    intake = Intake(
        id=intake_id,
        merchant_id=request.merchant_id,
        status="active"
    )
    
    db.add(intake)
    db.commit()
    
    return {"intake_id": intake_id}


@router.post("/answer")
async def answer_field(
    request: AnswerFieldRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Answer a field during intake (updates FieldState)."""
    
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
    
    return {"status": "saved", "field_id": request.field_id}