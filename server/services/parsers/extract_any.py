import os, re, json, base64
from typing import Dict, Any, List, Tuple
from decimal import Decimal
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None
import pdfplumber

# ---- helpers ---------------------------------------------------------------
def _to_f(v) -> float:
    try: return float(Decimal(str(v).replace(',','').replace('$','')))
    except: return 0.0

def _encode_png_b64(pg) -> str:
    if not fitz:
        return ""
    # low-detail, 2x scale to keep cost down but readable
    pix = pg.get_pixmap(matrix=fitz.Matrix(2,2), alpha=False)
    return base64.b64encode(pix.tobytes("png")).decode("ascii")

def _pick_summary_pages(text_pages: List[str]) -> List[int]:
    # choose up to 3 best candidates
    idxs=[]
    for i,t in enumerate(text_pages):
        tt=t.lower()
        if any(k in tt for k in [
            "account summary","summary of your account","summary of activity",
            "deposits", "withdrawals", "other deposits", "other withdrawals",
            "summary", "totals"
        ]):
            idxs.append(i)
    if not idxs:
        # take 1st, maybe 2nd, and last as a fallback
        n=len(text_pages)
        idxs=[0] + ([1] if n>1 else []) + ([n-1] if n>2 else [])
    # unique & keep order; cap to 3
    seen=set(); out=[]
    for i in idxs:
        if i not in seen:
            out.append(i); seen.add(i)
        if len(out)==3: break
    return out

CURRENCY_RE = re.compile(r"\$?\s?([0-9][\d,]*\.\d{2})-?")
def AMOUNT(s):
    match = CURRENCY_RE.search(s)
    return _to_f(match.group(1)) if match else None

def _sum_next_amount(text: str, anchor_pat: str, window: int = 200) -> float:
    total=0.0
    for m in re.finditer(anchor_pat, text, re.I|re.S):
        tail=text[m.end(): m.end()+window]
        a = AMOUNT(tail)
        if a is not None: total+=abs(a)
    return total

def _sum_inline(text: str, line_pat: str) -> float:
    total=0.0
    for line in text.splitlines():
        if re.search(line_pat, line, re.I):
            a=AMOUNT(line)
            if a is not None: total+=abs(a)
    return total

def _breakouts_fulltext(text: str) -> Dict[str,float]:
    out={}
    # Deposits
    out["mobile_check_deposits"]   = _sum_inline(text, r"Mobile\s+Check\s+Deposit")
    out["deposits_from_RADOVANOVIC"] = _sum_next_amount(text, r"Electronic\s+Deposit(?:(?!\n).){0,200}?From\s+RADOVANOVIC")
    out["wire_credits"]            = _sum_next_amount(text, r"Wire\s+Credit|Incoming\s+Wire|Credit\s+Wire")
    # Withdrawals
    out["withdrawals_PFSINGLE_PT"] = _sum_next_amount(text, r"Electronic\s+Settlement(?:(?!\n).){0,200}?PFSINGLE|SETTLMT\s+PFSINGLE")
    out["withdrawals_Zelle"]       = _sum_next_amount(text, r"\bZelle\b")
    out["withdrawals_AMEX"]        = _sum_next_amount(text, r"To\s+AMEX|AMEX\s+EPAYMENT|AMERICAN\s+EXPRESS")
    out["withdrawals_CHASE_CC"]    = _sum_next_amount(text, r"To\s+CHASE\s+(?:CREDIT\s+CRD|CARD)|AUTOPAY\s+CHASE")
    out["withdrawals_CADENCE_BANK"]= _sum_next_amount(text, r"To\s+CADENCE\s+BANK")
    out["withdrawals_SBA_EIDL"]    = _sum_next_amount(text, r"SBA\s+EIDL|To\s+SBA")
    out["withdrawals_Nav_Technologies"] = _sum_next_amount(text, r"Nav\s+Technologies|Nav\s+Tech")
    out["bank_fees"]               = _sum_next_amount(text, r"Analysis\s+Service\s+Charge|Bank\s+Service\s+Charge|Monthly\s+Service\s+Fee")
    return out

# ---- OpenAI Vision extraction ----------------------------------------------
def _openai_client():
    try:
        from openai import OpenAI
        import os
        key = os.getenv("OPENAI_API_KEY")
        return OpenAI(api_key=key) if key else None
    except Exception:
        return None

PROMPT = """You are reading bank statements. Extract exact MONTH TOTALS from each supplied page image.
Return strict JSON with numbers (no currency symbols), like:
{
 "period_label": "Aug 2025" | null,
 "beginning_balance": 0.00 | null,
 "ending_balance": 0.00 | null,
 "deposit_count": 0 | null,
 "total_deposits": 0.00 | null,
 "withdrawal_count": 0 | null,
 "total_withdrawals": 0.00 | null
}
Rules:
- For total_deposits: Find the COMPLETE total of ALL deposits including "Other Deposits", regular deposits, electronic deposits, mobile checks, wires, etc. Sum everything credited to the account.
- For total_withdrawals: Find the COMPLETE total of ALL withdrawals including "Other Withdrawals", electronic settlements, fees, transfers, etc. Sum everything debited from the account.
- Prefer "Account Summary" sections that show comprehensive totals.
- If only a minus sign indicates a debit, return the absolute number; sign is handled downstream.
- If a field is not visible, return null.
Return ONLY JSON.
"""

def _llm_extract_on_pages(b64_pages: List[str]) -> Dict[str,Any]:
    client=_openai_client()
    if not client: 
        return {}
    # Send images with low detail to cut cost
    content=[]
    for b in b64_pages:
        content.append({
            "type":"image_url",
            "image_url":{"url": f"data:image/png;base64,{b}", "detail":"low"}
        })
    content.insert(0, {"type":"text","text":PROMPT})
    try:
        resp = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL","gpt-4o-mini"),
            messages=[{"role":"user","content":content}],
            response_format={"type":"json_object"},
            temperature=float(os.getenv("OPENAI_TEMPERATURE","0.1")),
            max_tokens=int(os.getenv("OPENAI_MAX_TOKENS","500"))
        )
        return json.loads(resp.choices[0].message.content or "{}")
    except Exception:
        return {}

# ---- main entry ------------------------------------------------------------
def extract_any_bank_statement(pdf_path: str) -> Dict[str,Any]:
    # 1) get both text & image renders
    text_pages=[]
    with pdfplumber.open(pdf_path) as pdf:
        for pg in pdf.pages:
            text_pages.append((pg.extract_text() or ""))

    if fitz:
        doc=fitz.open(pdf_path)
        cand = _pick_summary_pages(text_pages)
        b64s=[ _encode_png_b64(doc[i]) for i in cand ]
        # 2) Ask LLM to read totals
        llm = _llm_extract_on_pages(b64s)
    else:
        llm = {}
        
    # normalize
    totals = {
        "beginning_balance": _to_f(llm.get("beginning_balance")) if llm else None,
        "ending_balance": _to_f(llm.get("ending_balance")) if llm else None,
        "deposit_count": int(llm.get("deposit_count")) if llm and llm.get("deposit_count") not in (None,"") else None,
        "total_deposits": _to_f(llm.get("total_deposits")) if llm else None,
        "withdrawal_count": int(llm.get("withdrawal_count")) if llm and llm.get("withdrawal_count") not in (None,"") else None,
        "total_withdrawals": -abs(_to_f(llm.get("total_withdrawals"))) if llm and llm.get("total_withdrawals") not in (None,"") else None,
        "period": llm.get("period_label") if llm else None,
    }

    # 3) Breakouts from full text (all pages)
    full_text = "\n".join(text_pages)
    brk = _breakouts_fulltext(full_text)

    # 4) Derive min/max ending balances if the statement includes a balance ladder
    # (If not present, leave None; the UI handles nulls)
    # Use the largest/smallest currency numbers near "Ending Balance" rows to approximate
    daily_nums = [ _to_f(x) for x in re.findall(r"([0-9][\d,]*\.\d{2})", full_text) ]
    min_bal = min(daily_nums) if daily_nums else None
    max_bal = max(daily_nums) if daily_nums else None

    # 5) Ensure total_deposits includes ALL deposit types
    llm_total_deposits = totals.get("total_deposits") or 0
    breakout_total_deposits = sum([
        brk.get("mobile_check_deposits", 0),
        brk.get("deposits_from_RADOVANOVIC", 0), 
        brk.get("wire_credits", 0)
    ])
    
    # Use the larger of LLM-read total or breakout sum (LLM should be more comprehensive)
    final_total_deposits = max(llm_total_deposits, breakout_total_deposits) if llm_total_deposits > 0 else breakout_total_deposits
    
    # 6) Similarly for withdrawals - ensure total includes all types
    llm_total_withdrawals = abs(totals.get("total_withdrawals") or 0)
    breakout_total_withdrawals = sum([
        brk.get("withdrawals_PFSINGLE_PT", 0),
        brk.get("withdrawals_Zelle", 0),
        brk.get("withdrawals_AMEX", 0),
        brk.get("withdrawals_CHASE_CC", 0),
        brk.get("withdrawals_CADENCE_BANK", 0),
        brk.get("withdrawals_SBA_EIDL", 0),
        brk.get("withdrawals_Nav_Technologies", 0),
        brk.get("bank_fees", 0)
    ])
    
    final_total_withdrawals = -max(llm_total_withdrawals, breakout_total_withdrawals)
    
    # 7) Build row with corrected totals
    row = { 
        **totals, 
        **brk,
        "total_deposits": final_total_deposits,
        "total_withdrawals": final_total_withdrawals,
        "min_daily_ending_balance": min_bal,
        "max_daily_ending_balance": max_bal 
    }

    return row