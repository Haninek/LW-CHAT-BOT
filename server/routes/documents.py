from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query, Request
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models import BankDocument, MetricsSnapshot, Event, Deal, Merchant
from ..services.storage import upload_private_bytes
from ..services.antivirus import scan_bytes

router = APIRouter(prefix="/api/documents", tags=["documents"])

MAX_PDF = 12 * 1024 * 1024  # 12 MB per statement

@router.post("/bank/upload")
async def upload_bank_statements(
    request: Request,
    merchant_id: str = Query(...),
    deal_id: str = Query(...),
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    if len(files) != 3:
        raise HTTPException(400, detail="Exactly 3 PDF statements are required")
    stored = []
    for f in files:
        if f.content_type not in ("application/pdf", "application/x-pdf"):
            raise HTTPException(400, detail=f"{f.filename}: only PDF allowed")
        content = await f.read()
        if len(content) > MAX_PDF:
            raise HTTPException(400, detail=f"{f.filename}: file too large")
        try:
            scan_bytes(content)  # no-op if clamd not configured
        except Exception as e:
            raise HTTPException(400, detail=str(e))
        key = f"statements/{deal_id}/{f.filename}"
        meta = upload_private_bytes(content, key, "application/pdf")
        doc = BankDocument(deal_id=deal_id, filename=f.filename,
                           storage_key=meta["key"], bucket=meta["bucket"], checksum=meta["sha256"], parsed=False)
        db.add(doc); db.commit(); db.refresh(doc)
        stored.append({"id": doc.id, "filename": doc.filename})

    # TODO: call your parser; stub metrics for now:
    metrics = {"avg_monthly_revenue": 80000, "avg_daily_balance_3m": 12000, "total_nsf_3m": 1, "total_days_negative_3m": 2}
    snap = MetricsSnapshot(deal_id=deal_id, source="statements", payload=metrics)
    db.add(snap)
    db.add(Event(tenant_id=None, merchant_id=merchant_id, deal_id=deal_id, type="metrics.ready", data=metrics))
    db.commit()
    return {"ok": True, "documents": stored, "metrics": metrics}