from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query, Request
from sqlalchemy.orm import Session
from core.database import get_db
from core.idempotency import capture_body, require_idempotency, store_idempotent
from models import Document, MetricsSnapshot, Event, Deal, Merchant
from services.storage import upload_private_bytes
from services.antivirus import scan_bytes
from services.bank_analysis import BankStatementAnalyzer
import json

router = APIRouter(prefix="/api/documents", tags=["documents"])

MAX_PDF = 12 * 1024 * 1024  # 12 MB per statement

@router.post("/bank/upload", dependencies=[Depends(capture_body)])
async def upload_bank_statements(
    request: Request,
    merchant_id: str = Query(...),
    deal_id: str = Query(...),
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    tenant_id=Depends(require_idempotency),
):
    if getattr(request.state, "idem_cached", None):
        return request.state.idem_cached
    
    if len(files) < 3:
        raise HTTPException(400, detail="Minimum 3 PDF bank statements required (3+ months)")
    
    if len(files) > 12:
        raise HTTPException(400, detail="Maximum 12 PDF bank statements allowed (12 months max)")
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
        doc = Document(deal_id=deal_id, filename=f.filename,
                       storage_key=meta["key"], bucket=meta["bucket"], checksum=meta["sha256"], parsed=False)
        db.add(doc); db.commit(); db.refresh(doc)
        stored.append({"id": doc.id, "filename": doc.filename})

    # Analyze bank statements with GPT
    analyzer = BankStatementAnalyzer()
    
    # Read file contents for analysis
    file_contents = []
    file_names = []
    for f in files:
        await f.seek(0)  # Reset file pointer
        content = await f.read()
        file_contents.append(content)
        file_names.append(f.filename)
    
    # Get comprehensive GPT analysis
    metrics = analyzer.analyze_statements(file_contents, file_names)
    snap = MetricsSnapshot(deal_id=deal_id, source="statements", payload=metrics)
    db.add(snap)
    db.add(Event(tenant_id=tenant_id, merchant_id=merchant_id, deal_id=deal_id, type="metrics.ready", data_json=json.dumps(metrics)))
    db.commit()
    
    resp = {"ok": True, "documents": stored, "metrics": metrics}
    await store_idempotent(request, resp)
    return resp