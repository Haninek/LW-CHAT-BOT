"""Contract signing endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid
import json

from core.database import get_db
from core.config import settings
from models.agreement import Agreement
from models.event import Event

router = APIRouter()


class SendContractRequest(BaseModel):
    merchant_id: str
    offer_id: str


class WebhookRequest(BaseModel):
    envelope_id: str
    status: str
    event_type: str


@router.post("/send")
async def send_contract(
    request: SendContractRequest,
    db: Session = Depends(get_db)
):
    """Send contract for signing via DocuSign/Dropbox Sign."""
    
    agreement_id = str(uuid.uuid4())
    envelope_id = f"mock-envelope-{agreement_id[:8]}"
    
    if settings.MOCK_MODE:
        # Create mock agreement
        agreement = Agreement(
            id=agreement_id,
            merchant_id=request.merchant_id,
            provider="mock",
            status="sent",
            envelope_id=envelope_id
        )
        db.add(agreement)
        
        # Log event
        event = Event(
            type="contract.sent",
            merchant_id=request.merchant_id,
            data_json=json.dumps({
                "agreement_id": agreement_id,
                "offer_id": request.offer_id,
                "provider": "mock"
            })
        )
        db.add(event)
        db.commit()
        
        return {
            "agreement_id": agreement_id,
            "envelope_id": envelope_id,
            "status": "sent",
            "provider": "mock",
            "signing_url": f"https://mock-signing.example.com/{envelope_id}",
            "mock_mode": True
        }
    
    else:
        # TODO: Implement actual DocuSign/Dropbox Sign integration
        raise HTTPException(
            status_code=501,
            detail="Contract signing requires API keys - currently in mock mode"
        )


@router.post("/webhook")
async def signing_webhook(
    webhook_data: WebhookRequest,
    db: Session = Depends(get_db)
):
    """Handle signing webhook from DocuSign/Dropbox Sign."""
    
    # Find agreement by envelope ID
    agreement = db.query(Agreement).filter(
        Agreement.envelope_id == webhook_data.envelope_id
    ).first()
    
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    
    # Update agreement status
    if webhook_data.status in ["completed", "signed"]:
        agreement.status = "completed"
        from datetime import datetime
        agreement.completed_at = datetime.utcnow()
        
        # Log completion event
        event = Event(
            type="contract.completed",
            merchant_id=agreement.merchant_id,
            data_json=json.dumps({
                "agreement_id": agreement.id,
                "envelope_id": webhook_data.envelope_id,
                "event_type": webhook_data.event_type
            })
        )
        db.add(event)
    
    elif webhook_data.status in ["declined", "voided"]:
        agreement.status = webhook_data.status
        
        # Log declined/voided event
        event = Event(
            type=f"contract.{webhook_data.status}",
            merchant_id=agreement.merchant_id,
            data_json=json.dumps({
                "agreement_id": agreement.id,
                "envelope_id": webhook_data.envelope_id,
                "event_type": webhook_data.event_type
            })
        )
        db.add(event)
    
    db.commit()
    
    return {"status": "processed"}