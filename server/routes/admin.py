"""Admin endpoints for background review and force operations."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List

from core.database import get_db
from core.security import verify_partner_key
from models.event import Event
from models.deal import Deal  
from models.merchant import Merchant

router = APIRouter()


@router.get("/background/review")
async def list_background_reviews(
    status: Optional[str] = Query(None, description="OK|REVIEW|DECLINE"),
    limit: int = 100,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """List latest background review results per deal."""
    
    # Get latest background.result per merchant (since events don't have deal_id)
    query = text("""
      WITH latest AS (
        SELECT e.*, ROW_NUMBER() OVER (PARTITION BY e.merchant_id ORDER BY e.created_at DESC) AS rn
        FROM events e WHERE e.type='background.result'
      )
      SELECT json_extract(l.data_json, '$.deal_id') as deal_id, l.merchant_id, l.data_json, d.status AS deal_status, 
             m.legal_name, m.email, m.phone, l.created_at
      FROM latest l
      JOIN merchants m ON m.id = l.merchant_id
      JOIN deals d ON d.merchant_id = l.merchant_id
      WHERE l.rn = 1
      ORDER BY l.created_at DESC
      LIMIT :lim
    """)
    
    rows = db.execute(query, {"lim": limit}).mappings().all()

    items = []
    for r in rows:
        # Parse JSON data
        import json
        data = json.loads(r["data_json"]) if r["data_json"] else {}
        decision = data.get("status")
        if status and decision != status: 
            continue
        items.append({
            "deal_id": r["deal_id"],
            "merchant_id": r["merchant_id"],
            "legal_name": r["legal_name"],
            "contact": {"email": r["email"], "phone": r["phone"]},
            "deal_status": r["deal_status"],
            "decision": decision,
            "reasons": data.get("reasons", {}),
            "created_at": r["created_at"].isoformat() if r["created_at"] else None
        })
    
    return {"items": items}


@router.get("/deals/summary")
async def get_deals_summary(
    limit: int = 50,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Get summary of recent deals for admin dashboard."""
    
    query = text("""
      SELECT d.id, d.status, d.funding_amount, d.created_at,
             m.legal_name, m.email, m.phone
      FROM deals d
      JOIN merchants m ON m.id = d.merchant_id
      ORDER BY d.created_at DESC
      LIMIT :lim
    """)
    
    rows = db.execute(query, {"lim": limit}).mappings().all()
    
    items = []
    for r in rows:
        items.append({
            "deal_id": r["id"],
            "status": r["status"],
            "funding_amount": r["funding_amount"],
            "legal_name": r["legal_name"],
            "contact": {"email": r["email"], "phone": r["phone"]},
            "created_at": r["created_at"] if r["created_at"] else None
        })
    
    return {"items": items}


@router.post("/deals/{deal_id}/force-action")
async def force_deal_action(
    deal_id: str,
    action: str = Query(..., description="approve|decline|reset"),
    reason: Optional[str] = Query(None, description="Reason for action"),
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Force a deal action regardless of background check status."""
    
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Capture previous status
    previous_status = deal.status
    
    # Update deal status based on action (using standard statuses)
    if action == "approve":
        deal.status = "accepted"  # Use standard status instead of "approved"
    elif action == "decline":
        deal.status = "declined"
    elif action == "reset":
        deal.status = "open"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    # Log the forced action as an event
    import json
    event = Event(
        merchant_id=deal.merchant_id,
        type="admin.force_action",
        data_json=json.dumps({
            "deal_id": deal_id,
            "action": action,
            "reason": reason,
            "forced": True,
            "previous_status": previous_status
        })
    )
    
    db.add(event)
    db.commit()
    
    return {
        "success": True,
        "deal_id": deal_id,
        "action": action,
        "new_status": deal.status,
        "reason": reason
    }