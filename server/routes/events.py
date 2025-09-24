"""Event tracking endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
import json

from core.database import get_db
from models.event import Event

router = APIRouter()


@router.get("/")
async def get_events(
    merchant_id: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    """Get events timeline (optionally filtered by merchant)."""
    
    query = db.query(Event).order_by(Event.created_at.desc())
    
    if merchant_id:
        query = query.filter(Event.merchant_id == merchant_id)
    
    events = query.limit(limit).all()
    
    return [
        {
            "id": event.id,
            "type": event.type,
            "merchant_id": event.merchant_id,
            "data": json.loads(event.data_json) if event.data_json else None,
            "created_at": event.created_at.isoformat()
        }
        for event in events
    ]