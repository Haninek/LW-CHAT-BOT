from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from core.database import get_db
from services.analysis_orchestrator import (
    parse_bank_pdfs_to_payload, build_monthly_rows, llm_risk_and_summary,
    compute_cash_pnl, compute_offers, redact_many_to_zip
)
import tempfile, os

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

@router.post("/run")
async def run_full_analysis(
    merchant_id: str = Form(...),
    deal_id: str = Form(...),
    files: list[UploadFile] = File(...),
    remit: str = Form("daily"),
    db: Session = Depends(get_db),
):
    with tempfile.TemporaryDirectory() as tdir:
        paths=[]
        for f in files:
            filename = f.filename or "uploaded_file.pdf"
            p = os.path.join(tdir, filename)
            with open(p, "wb") as w: w.write(await f.read())
            paths.append(p)

        payload = parse_bank_pdfs_to_payload(paths)
        monthly_rows = build_monthly_rows(payload)
        risk = llm_risk_and_summary(monthly_rows)
        pnl = compute_cash_pnl(monthly_rows)
        offers = compute_offers(monthly_rows, remit) if risk.get("eligibility","review") != "decline" else []

        return {
            "ok": True,
            "monthly_rows": monthly_rows,
            "risk": risk,
            "cash_pnl": pnl,
            "offers": offers,
            "downloads": {"scrubbed_zip_url": f"/api/analysis/scrubbed.zip?deal_id={deal_id}"}
        }

@router.get("/scrubbed.zip")
async def download_scrubbed_zip(deal_id: str = Query(...), db: Session = Depends(get_db)):
    # Wire your storage to fetch original PDFs for this deal, then:
    # bytes_zip = redact_many_to_zip(pdf_paths)
    raise HTTPException(status_code=501, detail="Wire storage for deal PDFs, then call redact_many_to_zip(paths).")