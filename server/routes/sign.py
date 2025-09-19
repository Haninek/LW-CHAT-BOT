"""Contract signing endpoints."""

import hmac, hashlib, json
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
import uuid

from core.database import get_db
from core.config import get_settings
from core.idempotency import capture_body, require_idempotency, store_idempotent, R, _memory_store
from models.agreement import Agreement
from models.event import Event
from models.deal import Deal

router = APIRouter()
S = get_settings()

def verify_dropboxsign(body: bytes, header: str) -> bool:
    if not S.DROPBOXSIGN_WEBHOOK_SECRET: return False
    expected = hmac.new(S.DROPBOXSIGN_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, (header or "").strip())

def verify_docusign(body: bytes, header: str) -> bool:
    if not S.DOCUSIGN_WEBHOOK_SECRET: return False
    expected = hmac.new(S.DOCUSIGN_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, (header or "").strip())


class SendContractRequest(BaseModel):
    merchant_id: str
    offer_id: str


class WebhookRequest(BaseModel):
    envelope_id: str
    status: str
    event_type: str


@router.post("/send", dependencies=[Depends(capture_body)])
async def send_for_signature(
    request: Request,
    deal_id: str,
    recipient_email: str,
    force: bool = False,
    tenant_id=Depends(require_idempotency),
    db: Session = Depends(get_db)
):
    """Send document for digital signature with optional force override."""
    
    if getattr(request.state, "idem_cached", None):
        return request.state.idem_cached
    
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Check background status unless forced
    if not force:
        bg_query = text("""
          SELECT data_json FROM events
          WHERE deal_id = :deal_id AND type = 'background.result'
          ORDER BY created_at DESC LIMIT 1
        """)
        
        bg_result = db.execute(bg_query, {"deal_id": deal_id}).first()
        
        if not bg_result:
            raise HTTPException(
                status_code=400, 
                detail="Background check missing; pass force=true to override"
            )
        
        bg_data = json.loads(bg_result[0]) if bg_result[0] else {}
        status = bg_data.get("status")
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
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        deal_id=deal_id,
        type="sign.sent",
        data_json=json.dumps({
            "deal_id": deal_id,
            "envelope_id": envelope_id,
            "recipient_email": recipient_email,
            "force": force,
            "agreement_id": agreement_id
        })
    )
    db.add(event)
    db.commit()
    
    result = {
        "success": True,
        "envelope_id": envelope_id,
        "recipient_email": recipient_email,
        "status": "sent",
        "force": force,
        "agreement_id": agreement_id,
        "message": "Document sent for signature" + (" (forced)" if force else "")
    }
    
    # Store idempotent result
    await store_idempotent(request, result)
    return result


@router.post("/webhook")
async def signing_webhook(
    request: Request,
    webhook_data: WebhookRequest,
    dropbox_signature: str = Header(None, alias="X-Dropbox-Signature"),
    docusign_signature: str = Header(None, alias="X-DocuSign-Signature"),
    db: Session = Depends(get_db)
):
    """Handle signing webhook from DocuSign/Dropbox Sign with signature verification."""
    
    # Verify webhook signature for security FIRST
    body = await request.body()
    verified = False
    
    if dropbox_signature:
        verified = verify_dropboxsign(body, dropbox_signature)
        if not verified:
            raise HTTPException(status_code=401, detail="Invalid Dropbox Sign signature")
    elif docusign_signature:  
        verified = verify_docusign(body, docusign_signature)
        if not verified:
            raise HTTPException(status_code=401, detail="Invalid DocuSign signature")
    else:
        # Always require webhook signature for pilot security
        raise HTTPException(status_code=401, detail="Missing webhook signature")
    
    # Check for webhook deduplication AFTER verification 
    dedup_key = f"wh:{webhook_data.envelope_id}:{webhook_data.event_type}"
    
    if R:
        try:
            # Use Redis NX (not exists) to atomically check and set
            if not await R.set(dedup_key, "1", ex=3600, nx=True):
                return {"status": "already_processed"}
        except Exception:
            # Fall back to memory store
            import time
            now = time.time()
            if dedup_key in _memory_store and (now - _memory_store[dedup_key]["ts"]) < 3600:
                return {"status": "already_processed"}
            _memory_store[dedup_key] = {"val": "1", "ts": now}
    else:
        # Use memory store directly
        import time
        now = time.time()
        if dedup_key in _memory_store and (now - _memory_store[dedup_key]["ts"]) < 3600:
            return {"status": "already_processed"}
        _memory_store[dedup_key] = {"val": "1", "ts": now}
    
    # Find agreement by envelope ID
    agreement = db.query(Agreement).filter(
        Agreement.envelope_id == webhook_data.envelope_id
    ).first()
    
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
        
    # Look up deal_id from the original sign.sent event for this envelope (portable approach)
    sign_events = db.query(Event).filter(Event.type == "sign.sent").all()
    
    deal_id = None
    tenant_id = agreement.merchant_id  # Default fallback
    
    # Parse in Python for SQLite/Postgres compatibility
    for event in sign_events:
        try:
            event_data = json.loads(event.data_json or "{}")
            if event_data.get("envelope_id") == webhook_data.envelope_id:
                deal_id = event_data.get("deal_id")
                tenant_id = event.tenant_id or agreement.merchant_id
                break
        except:
            continue  # Skip malformed events
    
    # Update agreement status
    if webhook_data.status in ["completed", "signed"]:
        agreement.status = "completed"
        from datetime import datetime
        agreement.completed_at = datetime.utcnow()
        
        # Log completion event
        event = Event(
            id=str(uuid.uuid4()),
            type="contract.completed", 
            tenant_id=tenant_id,  # Use proper tenant from sign event
            deal_id=deal_id,  # Use deal_id from original sign event
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
            id=str(uuid.uuid4()),
            type=f"contract.{webhook_data.status}",
            tenant_id=tenant_id,  # Use proper tenant from sign event
            deal_id=deal_id,  # Use deal_id from original sign event
            data_json=json.dumps({
                "agreement_id": agreement.id,
                "envelope_id": webhook_data.envelope_id,
                "event_type": webhook_data.event_type
            })
        )
        db.add(event)
    
    db.commit()
    
    return {"status": "processed"}