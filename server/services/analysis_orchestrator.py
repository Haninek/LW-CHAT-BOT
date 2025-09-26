from typing import Dict, Any, List, Tuple
import os, re, io, json, math, tempfile, zipfile
import pdfplumber
from decimal import Decimal

# PyMuPDF optional (for PDF redaction) - may fail on some systems
try:
    import fitz  # PyMuPDF
    print("✅ PyMuPDF (fitz) loaded successfully")
except Exception as e:
    print(f"⚠️ PyMuPDF (fitz) not available: {e}")
    fitz = None

# OpenAI client (uses Replit-secret OPENAI_API_KEY)
try:
    from openai import OpenAI
    _OPENAI = OpenAI(api_key=os.getenv("OPENAI_API_KEY")) if os.getenv("OPENAI_API_KEY") else None
except Exception:
    _OPENAI = None

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_MAX_TOKENS = int(os.getenv("OPENAI_MAX_TOKENS", "500"))
OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.2"))

from .bank_monthly import build_monthly_rows
from services.parsers.extract_any import extract_any_bank_statement
from services.parsers.totals_any import extract_summary_from_pages
from services.snapshot_metrics import compute_snapshot

def _to_money(v) -> float:
    try: return float(Decimal(str(v)))
    except Exception: return 0.0

def parse_bank_pdfs_to_payload(pdf_paths: List[str]) -> Dict[str, Any]:
    """Universal parser:
    1) Deterministic totals across common bank wordings (no AI).
    2) Breakouts + (optional) LLM Vision fill for missing pieces.
    """
    statements = []
    for p in pdf_paths:
        fname = os.path.basename(p)
        # text pages for deterministic total capture
        texts = []
        with pdfplumber.open(p) as pdf:
            for pg in pdf.pages: texts.append(pg.extract_text() or "")
        det = extract_summary_from_pages(texts)  # no-AI totals
        row = extract_any_bank_statement(p)      # adds breakouts + daily
        # prefer deterministic totals when present
        for k,v in det.items():
            if v not in (None,""):
                row[k] = v
        statements.append({
            "month": row.get("period"),
            "source_file": fname,
            "beginning_balance": row.get("beginning_balance"),
            "ending_balance": row.get("ending_balance"),
            "transactions": [],  # we compute breakouts separately
            "daily_endings": row.get("daily_endings_full") or [],
            "extras": row
        })
    return {"statements": statements}

def _infer_month_year(text: str) -> Tuple[int,int]:
    m = re.search(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[^\d]{0,10}(\d{4})', text, re.I)
    if not m: return (0,0)
    month_map = dict(jan=1,feb=2,mar=3,apr=4,may=5,jun=6,jul=7,aug=8,sep=9,oct=10,nov=11,dec=12)
    return month_map[m.group(1).lower()[:3]], int(m.group(2))

def _extract_transactions(text: str) -> List[Dict[str,Any]]:
    rows = []
    for line in text.splitlines():
        md = re.search(r'(\d{1,2}/\d{1,2}/\d{2,4}).*?([\-]?\$?\s?\d[\d,]*\.?\d{0,2}).*?(.+)$', line)
        if not md: 
            continue
        amt_raw = md.group(2).replace("$","").replace(",","").replace(" ","")
        try:
            amt = float(amt_raw)
            rows.append({"date": md.group(1), "amount": amt, "desc": md.group(3).strip()})
        except: 
            pass
    return rows

def _extract_balances(text: str):
    beg = 0.0; end = 0.0; daily=[]
    mb = re.search(r'Beginning\s+Balance[:\s]+\$?([\d,]+\.\d{2})', text, re.I)
    me = re.search(r'Ending\s+Balance[:\s]+\$?([\d,]+\.\d{2})', text, re.I)
    if mb: beg = float(mb.group(1).replace(",",""))
    if me: end = float(me.group(1).replace(",",""))
    for m in re.finditer(r'Ending\s+Balance\s+for\s+\w+\s+\d{1,2},\s+\d{4}\s+\$?([\d,]+\.\d{2})', text, re.I):
        daily.append(float(m.group(1).replace(",","")))
    return beg, end, daily

def llm_risk_and_summary(monthly_rows: List[Dict[str,Any]]) -> Dict[str,Any]:
    """Strict JSON: risk_score, risk_flags, pros, cons, follow_up_questions, required_docs, eligibility, reason."""
    if not _OPENAI:
        return {
            "risk_score": 70, "risk_flags": ["no_openai_key"],
            "pros": ["Parsed without LLM"], "cons": ["No LLM deep analysis"],
            "follow_up_questions": [
                "Confirm source of ACH deposits",
                "Provide payoff letters for existing MCAs",
                "Explain low-balance days during settlements",
                "Clarify credit card payments (AMEX/CHASE) cadence",
                "Verify CADENCE BANK and SBA EIDL as fixed obligations"
            ],
            "required_docs": ["Last 3 months bank statements", "Voided check", "Photo ID"],
            "eligibility": "review", "reason": "LLM unavailable"
        }
    sys = "You are an expert MCA underwriter. Be concise, data-grounded, and return strict JSON."
    user = {
        "months": monthly_rows,
        "instructions": {
            "compute": [
                "risk_score (0-100, 100 worst)",
                "risk_flags (array of short slugs)",
                "pros (short bullets)", "cons (short bullets)",
                "follow_up_questions (5-10, specific to bank behavior)",
                "required_docs (checklist)",
                "eligibility (approve|decline|review) with reason"
            ],
            "notes": "Treat 'withdrawals_PFSINGLE_PT' as MCA settlements; exclude 'wire_credits' from normalized revenue."
        }
    }
    try:
        resp = _OPENAI.chat.completions.create(
            model=OPENAI_MODEL,
            response_format={"type":"json_object"},
            messages=[{"role":"system","content":sys},{"role":"user","content":json.dumps(user)}],
            temperature=OPENAI_TEMPERATURE,
            max_tokens=OPENAI_MAX_TOKENS,
        )
        content = resp.choices[0].message.content
        if content:
            return json.loads(content)
        else:
            raise Exception("Empty response from OpenAI")
    except Exception:
        return {
            "risk_score": 75, "risk_flags": ["llm_error"],
            "pros": [], "cons": ["LLM call failed; manual review"],
            "follow_up_questions": ["Provide payoff letters for MCA settlements","Explain any large wires"],
            "required_docs": ["Recent 3 months bank statements","Voided check","Photo ID"],
            "eligibility": "review", "reason": "LLM error"
        }

def compute_cash_pnl(monthly_rows: List[Dict[str,Any]]) -> Dict[str,Any]:
    months=[]
    for r in monthly_rows:
        rev = _to_money(r.get("total_deposits")) - _to_money(r.get("wire_credits"))
        opex = _to_money(r.get("withdrawals_Nav_Technologies")) + _to_money(r.get("bank_fees", 0.0))
        debt = sum([
            _to_money(r.get("withdrawals_PFSINGLE_PT")),
            _to_money(r.get("withdrawals_AMEX")),
            _to_money(r.get("withdrawals_CHASE_CC")),
            _to_money(r.get("withdrawals_CADENCE_BANK")),
            _to_money(r.get("withdrawals_SBA_EIDL")),
        ])
        months.append({
            "label": r.get("file"),
            "revenue_cash": round(rev,2),
            "operating_expenses_cash": round(opex,2),
            "debt_service_cash": round(debt,2),
            "net_cash": round(rev - (opex + debt),2),
            "ending_balance": round(_to_money(r.get("ending_balance")),2)
        })
    totals = {
        "revenue_cash": round(sum(m["revenue_cash"] for m in months),2),
        "operating_expenses_cash": round(sum(m["operating_expenses_cash"] for m in months),2),
        "debt_service_cash": round(sum(m["debt_service_cash"] for m in months),2),
        "net_cash": round(sum(m["net_cash"] for m in months),2),
    }
    return {"months": months, "totals": totals}

def compute_offers(monthly_rows: List[Dict[str,Any]], remit="daily") -> List[Dict[str,Any]]:
    if not monthly_rows: return []
    dep_avg = sum(_to_money(r.get("total_deposits")) for r in monthly_rows)/len(monthly_rows)
    wires_avg = sum(_to_money(r.get("wire_credits")) for r in monthly_rows)/len(monthly_rows)
    eligible = max(0.0, dep_avg - wires_avg)
    mca_sum = sum(_to_money(r.get("withdrawals_PFSINGLE_PT")) for r in monthly_rows)
    denom = max(1.0, sum(_to_money(r.get("total_deposits")) for r in monthly_rows))
    mca_load = mca_sum / denom
    holdback = 0.08 if mca_load >= 0.9 else (0.10 if mca_load >= 0.8 else 0.12)

    offers=[]
    for i, f in enumerate([1.20, 1.30, 1.45], start=1):
        advance = round(eligible, -2)
        payback = round(advance * f, -2)
        term_days = 120 if remit == "daily" else 24
        est_daily = math.ceil(payback/term_days) if remit=="daily" else 0
        offers.append({
            "id": f"tier-{i}", "factor": f, "advance": advance, "payback": payback,
            "holdback_cap": holdback, "remit": remit, "est_daily": est_daily,
            "notes": "Eligible inflow excludes wires; holdback capped by MCA load."
        })
    return offers

def redact_many_to_zip(pdf_paths: List[str]) -> bytes:
    if not fitz:
        return b""  # redaction not available; caller should skip
    with tempfile.TemporaryDirectory() as tdir:
        out_paths=[]
        for p in pdf_paths:
            out_p = os.path.join(tdir, f"SCRUBBED_{os.path.basename(p)}")
            try:
                doc = fitz.open(p)  # type: ignore
                for page in doc:
                    text = page.get_text("text")  # type: ignore
                    # Generic PII patterns: account/routing, SSN, emails, phone, full card numbers
                    patterns = [
                        r"Routing\s*Number[:\s]*\d{7,13}",
                        r"Account\s*Number[:\s]*\d{6,14}",
                        r"\b\d{3}-\d{2}-\d{4}\b",                         # SSN-like
                        r"\b(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b", # email
                        r"\b\d{3}[-.\s]?\d{2,3}[-.\s]?\d{4}\b",           # phone
                        r"\b(?:\d[ -]?){13,19}\b"                         # long number runs (cards/accts)
                    ]
                    # clean white fill (no black boxes)
                    for pat in patterns:
                        for m in re.finditer(pat, text, re.I):
                            for rect in page.search_for(m.group(0)):  # type: ignore
                                page.add_redact_annot(rect, fill=(1,1,1))  # type: ignore
                    page.apply_redactions()  # type: ignore
                doc.save(out_p, deflate=True, garbage=4)  # type: ignore
                out_paths.append(out_p)
            except Exception:
                out_paths.append(p)
        mem = io.BytesIO()
        with zipfile.ZipFile(mem, 'w', zipfile.ZIP_DEFLATED) as z:
            for p in out_paths:
                z.write(p, arcname=os.path.basename(p))
        return mem.getvalue()

def build_clean_scrub_pdf(pdf_paths: List[str], snapshot: Dict[str,Any]) -> bytes:
    """Create a single PDF: page 1 = neat snapshot table, followed by all scrubbed pages."""
    if not fitz:
        return b""
    # First, scrub originals (white fill)
    with tempfile.TemporaryDirectory() as tdir:
        cleaned=[]
        for p in pdf_paths:
            out_p = os.path.join(tdir, f"SCRUB_{os.path.basename(p)}")
            try:
                doc = fitz.open(p)  # type: ignore
                for page in doc:
                    text = page.get_text("text")  # type: ignore
                    pats = [
                        r"Routing\s*Number[:\s]*\d{7,13}",
                        r"Account\s*Number[:\s]*\d{6,14}",
                        r"\b\d{3}-\d{2}-\d{4}\b",
                        r"\b(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b",
                        r"\b\d{3}[-.\s]?\d{2,3}[-.\s]?\d{4}\b",
                        r"\b(?:\d[ -]?){13,19}\b"
                    ]
                    for pat in pats:
                        for m in re.finditer(pat, text, re.I):
                            for rect in page.search_for(m.group(0)):  # type: ignore
                                page.add_redact_annot(rect, fill=(1,1,1))  # type: ignore
                    page.apply_redactions()  # type: ignore
                doc.save(out_p, deflate=True, garbage=4)  # type: ignore
                cleaned.append(out_p)
            except Exception:
                cleaned.append(p)
        # Create a one-page summary
        summary = fitz.open()  # type: ignore
        page = summary.new_page(width=612, height=792)  # type: ignore # Letter
        title = "Scrub Snapshot"
        labels = [
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
        page.insert_textbox((36,36,576,90), title, fontsize=18, fontname="helv", align=0)  # type: ignore
        y=110
        for i,(k,v) in enumerate(labels):
            col = 36 if (i%2==0) else 320
            if i%2==0 and i>0: y += 36
            page.insert_textbox((col,y,col+250,y+16), k, fontsize=10, color=(0.3,0.35,0.4))  # type: ignore
            page.insert_textbox((col,y+14,col+250,y+34), v, fontsize=14, color=(0,0,0))  # type: ignore
        # Append cleaned originals
        merged = fitz.open()  # type: ignore
        merged.insert_pdf(summary)  # type: ignore
        for p in cleaned:
            d = fitz.open(p)  # type: ignore
            merged.insert_pdf(d)  # type: ignore
            d.close()  # type: ignore
        out_bytes = merged.tobytes(deflate=True)  # type: ignore
        summary.close()  # type: ignore
        return out_bytes

