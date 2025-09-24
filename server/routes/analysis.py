from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from services.analysis_orchestrator import (
    parse_bank_pdfs_to_payload, build_monthly_rows, llm_risk_and_summary,
    compute_cash_pnl, compute_offers, build_clean_scrub_pdf
)
from services.snapshot_metrics import compute_snapshot
import tempfile, os

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

@router.get("/llm-health")
async def llm_health():
    rows = [{
        "file": "Synthetic_Aug_2025.pdf",
        "total_deposits": 100000.0, "deposit_count": 10, "wire_credits": 0.0,
        "total_withdrawals": -90000.0, "withdrawals_PFSINGLE_PT": 80000.0,
        "ending_balance": 25000.0, "beginning_balance": 30000.0, "net_change": -5000.0
    }]
    pack = llm_risk_and_summary(rows)
    return {"ok": True, "sample": pack}

@router.post("/run")
async def run_full_analysis(
    merchant_id: str = Form(...),
    deal_id: str = Form(...),
    files: list[UploadFile] = File(...),
    remit: str = Form("daily"),
):
    with tempfile.TemporaryDirectory() as tdir:
        paths=[]
        for f in files:
            filename = f.filename or "uploaded.pdf"
            p = os.path.join(tdir, filename)
            with open(p, "wb") as w: w.write(await f.read())
            paths.append(p)

        payload = parse_bank_pdfs_to_payload(paths)
        monthly_rows = build_monthly_rows(payload)
        # include daily endings for snapshot
        for i,st in enumerate(payload.get("statements", [])):
            if i < len(monthly_rows):
                monthly_rows[i]["daily_endings_full"] = st.get("daily_endings", [])

        risk = llm_risk_and_summary(monthly_rows)
        pnl = compute_cash_pnl(monthly_rows)
        offers = compute_offers(monthly_rows, remit) if risk.get("eligibility","review") != "decline" else []
        snapshot = compute_snapshot(monthly_rows)

        # create clean combined scrub PDF
        clean_pdf_bytes = build_clean_scrub_pdf(paths, snapshot)
        clean_pdf_path = None
        if clean_pdf_bytes:
            clean_pdf_path = os.path.join(tdir, "CLEAN_SCRUB_SNAPSHOT.pdf")
            with open(clean_pdf_path, "wb") as w: w.write(clean_pdf_bytes)
        # expose via a simple file relay
        clean_url = None
        if clean_pdf_path:
            # store to /tmp public-ish path; on Replit you may need to proxy it
            final_path = "/tmp/CLEAN_SCRUB_SNAPSHOT.pdf"
            try:
                import shutil; shutil.copyfile(clean_pdf_path, final_path)
                clean_url = "/tmp/CLEAN_SCRUB_SNAPSHOT.pdf"
            except Exception:
                clean_url = None

        return {
            "ok": True,
            "monthly_rows": monthly_rows,
            "risk": risk,
            "cash_pnl": pnl,
            "offers": offers,
            "snapshot": snapshot,
            "downloads": {
                "clean_scrub_pdf_path": clean_url
            }
        }
