"""Contract signing endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid
import json

from core.database import get_db
from core.config import settings
from core.security import verify_partner_key
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
async def send_for_signature(
    deal_id: str = Query(..., description="Deal ID"),
    recipient_email: str = Query(..., description="Recipient email address"),
    force: bool = Query(False, description="Force send even if background check not OK"),
    template_id: Optional[str] = Query(None, description="Template ID"),
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Send document for digital signature with optional force override."""
    
    from models.deal import Deal
    from sqlalchemy import text
    
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Check background status unless forced
    if not force:
        bg_query = text("""
          SELECT data FROM events
          WHERE deal_id = :deal_id AND type = 'background.result'
          ORDER BY created_at DESC LIMIT 1
        """)
        
        bg_result = db.execute(bg_query, {"deal_id": deal_id}).first()
        
        if not bg_result:
            raise HTTPException(
                status_code=400, 
                detail="Background check missing; pass force=true to override"
            )
        
        status = (bg_result[0] or {}).get("status")
        if status != "OK":
            raise HTTPException(
                status_code=400,
                detail=f"Background check not OK ({status}); pass force=true to override"
            )
    
    agreement_id = str(uuid.uuid4())
    envelope_id = f"mock-envelope-{agreement_id[:8]}"
    
    # Create mock agreement for now
    agreement = Agreement(
        id=agreement_id,
        merchant_id=deal.merchant_id,
        provider="mock",
        status="sent",
        envelope_id=envelope_id
    )
    db.add(agreement)
    
    # Log signing request event
    event = Event(
        type="sign.sent",
        merchant_id=deal.merchant_id,
        data_json=json.dumps({
            "deal_id": deal_id,
            "envelope_id": envelope_id,
            "recipient_email": recipient_email,
            "template_id": template_id,
            "force": force,
            "agreement_id": agreement_id
        })
    )
    db.add(event)
    db.commit()
    
    return {
        "success": True,
        "envelope_id": envelope_id,
        "recipient_email": recipient_email,
        "status": "sent",
        "force": force,
        "agreement_id": agreement_id,
        "message": "Document sent for signature" + (" (forced)" if force else "")
    }


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