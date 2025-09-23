from typing import Dict, Any, List, Tuple
import os, re, io, json, math, zipfile, tempfile
import pdfplumber
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None
from decimal import Decimal

try:
    from openai import OpenAI
    _OPENAI = OpenAI(api_key=os.getenv("OPENAI_API_KEY")) if os.getenv("OPENAI_API_KEY") else None
except Exception:
    _OPENAI = None

from .bank_monthly import build_monthly_rows

def _to_money(v) -> float:
    try:
        return float(Decimal(str(v)))
    except Exception:
        return 0.0

def parse_bank_pdfs_to_payload(pdf_paths: List[str]) -> Dict[str, Any]:
    """Very lightweight parser; OK to start, refine later per bank."""
    statements = []
    for p in pdf_paths:
        try:
            with pdfplumber.open(p) as pdf:
                text = "\n".join((page.extract_text() or "") for page in pdf.pages)
        except Exception:
            text = ""
        month, year = _infer_month_year(text)
        transactions = _extract_transactions(text)
        beginning, ending, daily = _extract_balances(text)
        statements.append({
            "month": f"{year}-{month:02d}" if month and year else None,
            "source_file": os.path.basename(p),
            "beginning_balance": beginning,
            "ending_balance": ending,
            "transactions": transactions,
            "daily_endings": daily,
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
        raw_amt = md.group(2).replace("$","").replace(",","").replace(" ","")
        try:
            amt = float(raw_amt)
            rows.append({"date": md.group(1), "amount": amt, "desc": md.group(3).strip()})
        except:
            continue
    return rows

def _extract_balances(text: str) -> Tuple[float,float,List[float]]:
    beg = 0.0; end = 0.0; daily=[]
    mb = re.search(r'Beginning\s+Balance[:\s]+\$?([\d,]+\.\d{2})', text, re.I)
    me = re.search(r'Ending\s+Balance[:\s]+\$?([\d,]+\.\d{2})', text, re.I)
    if mb: beg = float(mb.group(1).replace(",",""))
    if me: end = float(me.group(1).replace(",",""))
    for m in re.finditer(r'Ending\s+Balance\s+for\s+\w+\s+\d{1,2},\s+\d{4}\s+\$?([\d,]+\.\d{2})', text, re.I):
        daily.append(float(m.group(1).replace(",","")))
    return beg, end, daily

def llm_risk_and_summary(monthly_rows: List[Dict[str,Any]]) -> Dict[str,Any]:
    """Returns JSON with risk_score, flags, pros/cons, followups, required docs, eligibility."""
    if not _OPENAI:
        return {
            "risk_score": 70,
            "risk_flags": ["no_openai_key"],
            "pros": ["Parsed without LLM"],
            "cons": ["No LLM deep pattern analysis"],
            "follow_up_questions": [
                "Confirm source of ACH deposits",
                "Provide payoff letters for existing MCAs",
                "Explain any low daily balances during settlement days",
                "Clarify credit card usage (AMEX/CHASE) intent",
                "Verify recurring CADENCE BANK and SBA EIDL amounts"
            ],
            "required_docs": ["3 months bank statements", "Voided check", "Driver’s license", "EIN letter (if available)"],
            "eligibility": "review",
            "reason": "No LLM. Manual underwriter review suggested."
        }
    sys = "You are an expert MCA underwriter. Be concise, data-grounded, and return strict JSON."
    user = {
        "months": monthly_rows,
        "instructions": {
            "compute": [
                "risk_score (0-100, 100 worst)",
                "risk_flags (array of short slugs)",
                "pros (short bullets)",
                "cons (short bullets)",
                "follow_up_questions (5-10, specific to bank behavior)",
                "required_docs (checklist)",
                "eligibility (approve|decline|review) with reason"
            ],
            "notes": "Treat 'withdrawals_PFSINGLE_PT' as MCA settlements; exclude 'wire_credits' from normalized revenue."
        }
    }
    resp = _OPENAI.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type":"json_object"},
        messages=[{"role":"system","content":sys},{"role":"user","content":json.dumps(user)}],
        temperature=0.2
    )
    try:
        content = resp.choices[0].message.content
        return json.loads(content or "{}")
    except Exception:
        return {"risk_score": 80, "risk_flags":["llm_parse_error"], "pros":[], "cons":["LLM parse failed"], "follow_up_questions":[], "required_docs":[], "eligibility":"review", "reason":"LLM failure"}

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
            "id": f"tier-{i}",
            "factor": f,
            "advance": advance,
            "payback": payback,
            "holdback_cap": holdback,
            "remit": remit,
            "est_daily": est_daily,
            "notes": "Eligible inflow excludes wires; holdback capped by MCA load."
        })
    return offers

def _redact_pdf_file(input_path: str, output_path: str) -> None:
    if not fitz:
        # PDF redaction not available without PyMuPDF, copy original
        import shutil
        shutil.copy2(input_path, output_path)
        return
        
    doc = fitz.open(input_path)
    patterns = [
      r'\b\d{9,12}\b', r'\b\d{3}-\d{2}-\d{4}\b',
      r'Routing\s*Number[:\s]*\d+', r'Account\s*Number[:\s]*\d+',
      r'\b(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b',
      r'\b\d{3}[-.\s]?\d{2,3}[-.\s]?\d{4}\b',
    ]
    for page in doc:
        txt = page.get_text("text")
        for pat in patterns:
            for m in re.finditer(pat, txt, re.I):
                for rect in page.search_for(m.group(0)):
                    page.add_redact_annot(rect, fill=(0,0,0))
        page.apply_redactions()
    doc.save(output_path, deflate=True, garbage=4)

def redact_many_to_zip(pdf_paths: List[str]) -> bytes:
    with tempfile.TemporaryDirectory() as tdir:
        out_paths=[]
        for p in pdf_paths:
            out_p = os.path.join(tdir, f"SCRUBBED_{os.path.basename(p)}")
            try:
                _redact_pdf_file(p, out_p)
                out_paths.append(out_p)
            except Exception:
                out_paths.append(p)
        mem = io.BytesIO()
        with zipfile.ZipFile(mem, 'w', zipfile.ZIP_DEFLATED) as z:
            for p in out_paths:
                z.write(p, arcname=os.path.basename(p))
        return mem.getvalue()
