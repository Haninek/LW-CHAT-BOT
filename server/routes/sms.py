from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from ..core.database import get_db
from ..models import Consent, Event, Merchant
from ..core.config import get_settings
from ..core.idempotency import capture_body, require_idempotency, store_idempotent
from redis.asyncio import from_url as redis_from_url
import re, json, uuid, asyncio, httpx, time

S = get_settings()
R = redis_from_url(S.REDIS_URL, encoding="utf-8", decode_responses=True)

router = APIRouter(prefix="/api/sms/cherry", tags=["sms"])

class SMSMessage(BaseModel):
    to: str
    body: str
    merchant_id: Optional[str] = None

class SMSPayload(BaseModel):
    campaignName: str
    messages: List[SMSMessage]

FOOTER = " Reply STOP to opt out."
PHONE_RE = re.compile(r"^\+?[1-9]\d{7,14}$")

async def rate_limit(tenant_id: str, count: int, limit: int = 2000, window_sec: int = 60):
    # simple token bucket per tenant
    key = f"rt:sms:{tenant_id}"
    pipe = R.pipeline()
    now = int(time.time())
    pipe.zremrangebyscore(key, 0, now - window_sec)
    pipe.zadd(key, {str(uuid.uuid4()): now} , nx=True)
    pipe.zcard(key)
    pipe.expire(key, window_sec + 5)
    _, _, current, _ = await pipe.execute()
    if int(current) + count > limit:
        raise HTTPException(429, detail="Rate limit exceeded for SMS")

@router.post("/send", dependencies=[Depends(capture_body)])
async def send_sms(
    request: Request,
    payload: SMSPayload,
    ide=Depends(require_idempotency),
    db: Session = Depends(get_db),
):
    if getattr(request.state, "idem_cached", None):
        return request.state.idem_cached
    tenant_id, _ = ide

    await rate_limit(tenant_id, len(payload.messages))

    queued = 0
    msgs = []
    for m in payload.messages:
        if not PHONE_RE.match(m.to): 
            continue
        # respect opt-out
        c = db.query(Consent).filter(Consent.phone == m.to, Consent.channel == "sms").first()
        if c and c.status == "opt_out":
            continue
        body = m.body.strip()
        if "stop to opt out" not in body.lower():
            body += FOOTER
        msgs.append({"to": m.to, "body": body})
        db.add(Event(tenant_id=tenant_id, merchant_id=m.merchant_id, deal_id=None, type="sms.queued", data={"to": m.to, "campaign": payload.campaignName}))
        queued += 1
    db.commit()

    # Queue to Cherry (mock/proxy through your existing Node service or call provider directly)
    async with httpx.AsyncClient(timeout=30) as client:
        # Replace with your internal sender endpoint if you have one
        # await client.post("https://cherry.example/send", headers={"Authorization": f"Bearer {S.CHERRY_API_KEY}"}, json={"messages": msgs})
        pass

    resp = {"campaign": payload.campaignName, "queued": queued}
    await store_idempotent(request, resp)
    return resp

@router.post("/webhook")
async def webhook(req: Request, db: Session = Depends(get_db)):
    body = await req.json()
    # Normalize: expect { "type": "inbound", "from": "+19735550188", "text": "STOP" }
    if (body.get("type") == "inbound") and str(body.get("text", "")).strip().upper() == "STOP":
        phone = body.get("from")
        c = db.query(Consent).filter(Consent.phone == phone, Consent.channel == "sms").first()
        if c: 
            c.status = "opt_out"
        else:
            db.add(Consent(phone=phone, channel="sms", status="opt_out"))
        # best-effort merchant link
        m = db.query(Merchant).filter(Merchant.phone == phone).first()
        db.add(Event(tenant_id=None, merchant_id=getattr(m, "id", None), deal_id=None, type="sms.stop", data={"from": phone}))
        db.commit()
    return {"ok": True}