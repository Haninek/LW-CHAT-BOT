from __future__ import annotations
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from core.database import get_db
from core.idempotency import capture_body, require_idempotency, store_idempotent
from core.auth import require_bearer
from models import MetricsSnapshot

router = APIRouter(prefix="/api/statements", tags=["statements"], dependencies=[Depends(require_bearer)])

@router.post("/parse", dependencies=[Depends(capture_body)])
async def parse_statements(
    request: Request,
    merchant_id: str = Query(...),
    deal_id: str = Query(...),
    db: Session = Depends(get_db),
    tenant_id=Depends(require_idempotency),
) -> Dict[str, Any]:
    """
    DEV alias endpoint: return latest MetricsSnapshot for this deal.
    Your /api/documents/bank/upload already created a snapshot; this
    endpoint lets the front-end fetch 'cashflow analysis' without
    running a real parser yet.
    """
    if getattr(request.state, "idem_cached", None):
        return request.state.idem_cached

    row = (
        db.query(MetricsSnapshot)
        .filter(MetricsSnapshot.deal_id == deal_id)
        .order_by(desc(MetricsSnapshot.created_at))
        .first()
    )
    if not row or not getattr(row, "payload", None):
        raise HTTPException(404, "No metrics available for this deal. Upload 3 statements first.")

    resp = {"ok": True, "metrics": row.payload}
    await store_idempotent(request, resp)
    return resp