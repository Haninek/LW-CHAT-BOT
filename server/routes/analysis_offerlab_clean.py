from fastapi import APIRouter, UploadFile, File, Form
from typing import List, Dict, Any
import os, io, re, tempfile, pdfplumber, fitz, math, json
from services.parsers.totals_any import extract_summary_from_pages
from services.parsers.extract_any import extract_any_bank_statement
from services.snapshot_metrics import compute_snapshot

router = APIRouter(prefix="/api/offerlab", tags=["offerlab"])

def _f(x):
    try: return float(x) if x is not None else 0.0
    except: return 0.0

def compute_offers(months: List[Dict[str,Any]], cadence: str="daily")->List[Dict[str,Any]]:
    if not months: return []
    dep_avg = sum(_f(r.get("total_deposits")) for r in months)/len(months)
    wires_avg = sum(_f(r.get("wire_credits")) for r in months)/len(months)
    eligible_inflow = max(0.0, dep_avg - wires_avg)
    mca_paid = sum(abs(_f(r.get("withdrawals_PFSINGLE_PT"))) for r in months)
    dep_sum = sum(_f(r.get("total_deposits")) for r in months)
    mca_load = (mca_paid/dep_sum) if dep_sum else 0.0
    holdback_cap = 0.08 if mca_load >= 0.90 else (0.10 if mca_load >= 0.80 else 0.12)

    business_days = 21
    weeks = 24
    term_days = weeks if cadence.lower()=="weekly" else 120
    daily_sales_proxy = eligible_inflow / business_days if business_days else 0.0
    weekly_sales_proxy = eligible_inflow / 4.2

    def remit_cap(cad):
        base = weekly_sales_proxy if cad=="weekly" else daily_sales_proxy
        return base * holdback_cap

    tiers = [
        {"name":"Tier A","factor":1.20,"advance_mult":0.60},
        {"name":"Tier B","factor":1.30,"advance_mult":0.80},
        {"name":"Tier C","factor":1.40,"advance_mult":1.00},
    ]
    offers=[]
    for t in tiers:
        adv = round(max(0.0, eligible_inflow*t["advance_mult"]), -2)
        pay = round(adv*t["factor"], -2)
        if cadence.lower()=="weekly":
            est = max(1, math.ceil(pay/max(1,weeks)))
            est = min(est, max(1, math.floor(remit_cap("weekly"))))
            offers.append({"id":t["name"].lower(),"name":t["name"],"factor":t["factor"],"advance":int(adv),
                           "payback":int(pay),"cadence":"Weekly","term_units":weeks,"est_remit":int(est),"holdback_cap":holdback_cap})
        else:
            est = max(1, math.ceil(pay/max(1,term_days)))
            est = min(est, max(1, math.floor(remit_cap("daily"))))
            offers.append({"id":t["name"].lower(),"name":t["name"],"factor":t["factor"],"advance":int(adv),
                           "payback":int(pay),"cadence":"Daily","term_units":term_days,"est_remit":int(est),"holdback_cap":holdback_cap})
    return [o for o in offers if o["advance"]>0 and o["est_remit"]>0]

def build_clean_scrub_pdf(pdf_paths: List[str], snapshot: Dict[str,Any]) -> bytes:
    doc_out = fitz.open()
    # 1-page summary
    page = doc_out.new_page(width=612, height=792)
    title = "Scrub Snapshot"
    pairs = [
        ("Avg Deposit Amount", f"${snapshot['avg_deposit_amount']:,}"),
        ("Other Advances",     f"${snapshot['other_advances']:,}"),
        ("Transfer Amount",    f"${snapshot['transfer_amount']:,}"),
        ("Misc Deduction",     f"${snapshot['misc_deduction']:,}"),
        ("Number of Deposits", f"{snapshot['number_of_deposits']:,}"),
        ("Negative Days",      f"{snapshot['negative_days']:,}"),
        ("Avg Daily Balance",  f"${snapshot['avg_daily_balance']:,}"),
        ("Avg Beginning Balance", f"${snapshot['avg_beginning_balance']:,}"),
        ("Avg Ending Balance", f"${snapshot['avg_ending_balance']:,}"),
    ]
    page.insert_textbox((36,36,576,90), title, fontsize=18, fontname="helv")
    y=110
    for i,(k,v) in enumerate(pairs):
        col = 36 if (i%2==0) else 320
        if i%2==0 and i>0: y += 36
        page.insert_textbox((col,y,col+250,y+16), k, fontsize=10, color=(0.3,0.35,0.4))
        page.insert_textbox((col,y+14,col+250,y+34), v, fontsize=14, color=(0,0,0))

    # Append scrubbed pages (white fill)
    for p in pdf_paths:
        try:
            d = fitz.open(p)
            for pg in d:
                text = pg.get_text("text")
                pats = [r"Routing\s*Number[:\s]*\d{7,13}", r"Account\s*Number[:\s]*\d{6,14}",
                        r"\b\d{3}-\d{2}-\d{4}\b", r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
                        r"\b\d{3}[-.\s]?\d{2,3}[-.\s]?\d{4}\b", r"\b(?:\d[ -]?){13,19}\b"]
                for pat in pats:
                    for m in re.finditer(pat, text, re.I):
                        for rect in pg.search_for(m.group(0)):
                            pg.add_redact_annot(rect, fill=(1,1,1))
                pg.apply_redactions()
            doc_out.insert_pdf(d)
            d.close()
        except Exception:
            pass
    return doc_out.tobytes(deflate=True)

@router.post("/analyze")
async def analyze(files: List[UploadFile]=File(...), remit: str=Form("daily")):
    import shutil, tempfile, json
    with tempfile.TemporaryDirectory() as tdir:
        paths=[]
        for f in files:
            p=os.path.join(tdir, f.filename or "statement.pdf")
            with open(p,"wb") as w: w.write(await f.read())
            paths.append(p)

        # parse each: deterministic totals + OCR/regex breakouts
        months=[]
        for p in paths:
            texts=[]
            with pdfplumber.open(p) as pdf:
                for pg in pdf.pages: texts.append(pg.extract_text() or "")
            det = extract_summary_from_pages(texts)
            row = extract_any_bank_statement(p)
            # prefer deterministic totals
            for k,v in det.items():
                if v not in (None,""): row[k]=v
            months.append(row)

        # snapshot + offers
        snapshot = compute_snapshot(months)
        offers = compute_offers(months, cadence=remit)

        # emit a clean combined PDF to /mnt/data so UI can link it
        pdf_bytes = build_clean_scrub_pdf(paths, snapshot)
        out_path = "/mnt/data/CLEAN_SCRUB_SNAPSHOT.pdf"
        with open(out_path,"wb") as w: w.write(pdf_bytes)

        return {
            "ok": True,
            "monthly_rows": months,
            "snapshot": snapshot,
            "offers": offers,
            "downloads": {"clean_scrub_pdf_path": "/mnt/data/CLEAN_SCRUB_SNAPSHOT.pdf"}
        }
