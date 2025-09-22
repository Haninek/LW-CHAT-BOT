from __future__ import annotations
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Request, Query, Response
import pathlib
import csv
import io
import json
from sqlalchemy.orm import Session
from sqlalchemy import desc
from core.database import get_db
from core.idempotency import capture_body, require_idempotency, store_idempotent
from core.auth import require_bearer
from models import MetricsSnapshot, Document
from services.bank_analysis import BankStatementAnalyzer
from services.bank_monthly import build_monthly_rows

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

    if row and getattr(row, "payload", None):
        resp = {"ok": True, "metrics": row.payload}
        await store_idempotent(request, resp)
        return resp

    documents = (
        db.query(Document)
        .filter(Document.deal_id == deal_id)
        .order_by(Document.created_at.asc())
        .all()
    )

    if not documents:
        raise HTTPException(404, "No bank statements found for this deal. Upload 3 statements first.")

    file_contents = []
    filenames = []
    for doc in documents:
        if doc.file_data:
            file_contents.append(bytes(doc.file_data))
            filenames.append(doc.filename or f"statement-{len(file_contents)}.pdf")
            continue

        if not doc.storage_key:
            raise HTTPException(500, f"Document {doc.id} is missing stored content")

        path = pathlib.Path(doc.storage_key)
        if not path.exists():
            raise HTTPException(500, f"Stored document {path} not found on disk")

        try:
            file_contents.append(path.read_bytes())
            filenames.append(doc.filename or path.name)
        except Exception as exc:
            raise HTTPException(500, f"Unable to read document {doc.filename or doc.id}: {exc}")

    analyzer = BankStatementAnalyzer()

    try:
        metrics = analyzer.analyze_statements(file_contents, filenames)
    except Exception as exc:
        raise HTTPException(500, f"Failed to analyze bank statements: {exc}")

    snapshot = MetricsSnapshot(deal_id=deal_id, source="statements", payload=metrics)
    db.add(snapshot)
    db.commit()

    resp = {"ok": True, "metrics": metrics}
    await store_idempotent(request, resp)
    return resp


def _latest_snapshot(db: Session, deal_id: str):
    snap = db.query(MetricsSnapshot)\
             .filter(MetricsSnapshot.deal_id == deal_id)\
             .order_by(MetricsSnapshot.created_at.desc())\
             .first()
    if not snap:
        raise HTTPException(status_code=404, detail="No metrics snapshot for this deal")
    # payload might be a dict or JSON string depending on model
    payload = snap.payload if isinstance(snap.payload, dict) else json.loads(snap.payload or "{}")
    return payload


@router.get("/monthly")
async def get_monthly_rows(
    deal_id: str = Query(...),
    db: Session = Depends(get_db),
):
    payload = _latest_snapshot(db, deal_id)
    rows = build_monthly_rows(payload)
    return {"ok": True, "rows": rows}


@router.get("/monthly.csv")
async def download_monthly_csv(
    deal_id: str = Query(...),
    db: Session = Depends(get_db),
):
    payload = _latest_snapshot(db, deal_id)
    rows = build_monthly_rows(payload)
    if not rows:
        raise HTTPException(status_code=404, detail="No data")

    # write CSV
    buf = io.StringIO()
    fieldnames = list(rows[0].keys())
    w = csv.DictWriter(buf, fieldnames=fieldnames)
    w.writeheader()
    for r in rows:
        w.writerow({k: v if v is not None else "" for k,v in r.items()})
    csv_bytes = buf.getvalue().encode("utf-8")

    headers = {
        "Content-Disposition": 'attachment; filename="monthly_summary.csv"',
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store",
    }
    return Response(content=csv_bytes, headers=headers, media_type="text/csv")
