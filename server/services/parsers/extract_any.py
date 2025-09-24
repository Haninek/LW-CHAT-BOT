import os, re, json, base64
from typing import Dict, Any, List
from decimal import Decimal
import fitz  # PyMuPDF
import pdfplumber

def _to_f(v) -> float:
    try: return float(Decimal(str(v).replace(',','').replace('$','')))
    except: return 0.0

def _encode_png_b64(pg) -> str:
    pix = pg.get_pixmap(matrix=fitz.Matrix(2,2), alpha=False)
    return base64.b64encode(pix.tobytes("png")).decode("ascii")

def _pick_summary_pages(text_pages: List[str]) -> List[int]:
    idxs=[]
    for i,t in enumerate(text_pages):
        tt=t.lower()
        if any(k in tt for k in ["account summary","summary of your account","summary of activity",
                                 "deposits","withdrawals","other deposits","other withdrawals","totals"]):
            idxs.append(i)
    if not idxs:
        n=len(text_pages)
        idxs=[0]+([1] if n>1 else [])+([n-1] if n>2 else [])
    seen=set(); out=[]
    for i in idxs:
        if i not in seen:
            out.append(i); seen.add(i)
        if len(out)==3: break
    return out

CURRENCY_RE = re.compile(r"\$?\s?([0-9][\d,]*\.\d{2})-?")
AMOUNT = lambda s: _to_f(CURRENCY_RE.search(s).group(1)) if CURRENCY_RE.search(s) else None

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
    out["mobile_check_deposits"]   = _sum_inline(text, r"Mobile\s+Check\s+Deposit")
    out["deposits_from_RADOVANOVIC"] = _sum_next_amount(text, r"Electronic\s+Deposit(?:(?!\n).){0,200}?From\s+RADOVANOVIC")
    out["wire_credits"]            = _sum_next_amount(text, r"Wire\s+Credit|Incoming\s+Wire|Credit\s+Wire")
    out["loan_proceeds_credits"]   = _sum_next_amount(text, r"Loan\s+Proceeds|Loan\s+Advance|Funding\s+Proceeds|Advance\s+Credit")
    out["withdrawals_PFSINGLE_PT"] = _sum_next_amount(text, r"Electronic\s+Settlement(?:(?!\n).){0,200}?PFSINGLE|SETTLMT\s+PFSINGLE")
    out["withdrawals_Zelle"]       = _sum_next_amount(text, r"\bZelle\b")
    out["withdrawals_AMEX"]        = _sum_next_amount(text, r"To\s+AMEX|AMEX\s+EPAYMENT|AMERICAN\s+EXPRESS")
    out["withdrawals_CHASE_CC"]    = _sum_next_amount(text, r"To\s+CHASE\s+(?:CREDIT\s+CRD|CARD)|AUTOPAY\s+CHASE")
    out["withdrawals_CADENCE_BANK"]= _sum_next_amount(text, r"To\s+CADENCE\s+BANK")
    out["withdrawals_SBA_EIDL"]    = _sum_next_amount(text, r"SBA\s+EIDL|To\s+SBA")
    out["withdrawals_Nav_Technologies"] = _sum_next_amount(text, r"Nav\s+Technologies|Nav\s+Tech")
    out["bank_fees"]               = _sum_next_amount(text, r"Analysis\s+Service\s+Charge|Bank\s+Service\s+Fee|Monthly\s+Service\s+Fee")
    out["transfer_in"]             = _sum_next_amount(text, r"Transfer\s+From|Online\s+Transfer\s+From|Account\s+Transfer\s+From")
    out["transfer_out"]            = _sum_next_amount(text, r"Transfer\s+To|Online\s+Transfer\s+To|Account\s+Transfer\s+To")
    return out

def extract_daily_endings(text: str) -> List[float]:
    heads = [
        r"Date\s+Ending\s+Balance",
        r"Daily\s+Ending\s+Balance",
        r"Daily\s+Ledger\s+Balance",
        r"Daily\s+Balance",
    ]
    for h in heads:
        m = re.search(h + r".*?(?:Only\s+balances.*?|This\s+statement.*?|Page\s+\d+|\Z)", text, re.I|re.S)
        if m:
            block = m.group(0)
            vals = re.findall(r"([\d,]+\.\d{2})", block)
            if vals: return [_to_f(x) for x in vals]
    return []

def _openai_client():
    try:
        from openai import OpenAI
        key = os.getenv("OPENAI_API_KEY")
        return OpenAI(api_key=key) if key else None
    except Exception:
        return None

PROMPT = """You are reading bank statements. Extract exact MONTH TOTALS from each supplied page image.
Return strict JSON:
{"period_label": null|"Mon YYYY","beginning_balance":0.00|null,"ending_balance":0.00|null,"deposit_count":0|null,"total_deposits":0.00|null,"withdrawal_count":0|null,"total_withdrawals":0.00|null}
Use the table totals (Deposits & Credits / Other Deposits, Withdrawals & Debits / Other Withdrawals). Return ONLY JSON."""

def _llm_extract_on_pages(b64_pages: List[str]) -> Dict[str,Any]:
    client=_openai_client()
    if not client: return {}
    content=[{"type":"text","text":PROMPT}]
    for b in b64_pages:
        content.append({"type":"input_image","image_url":{"url":f"data:image/png;base64,{b}","detail":"low"}})
    try:
        resp = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL","gpt-4o-mini"),
            messages=[{"role":"user","content":content}],
            response_format={"type":"json_object"},
            temperature=0.1,
            max_tokens=400
        )
        import json
        return json.loads(resp.choices[0].message.content)
    except Exception:
        return {}

def extract_any_bank_statement(pdf_path: str) -> Dict[str,Any]:
    text_pages=[]
    with pdfplumber.open(pdf_path) as pdf:
        for pg in pdf.pages:
            text_pages.append(pg.extract_text() or "")
    doc=fitz.open(pdf_path)
    idxs=_pick_summary_pages(text_pages)
    b64s=[ _encode_png_b64(doc[i]) for i in idxs ]
    llm=_llm_extract_on_pages(b64s)
    totals = {
        "beginning_balance": _to_f(llm.get("beginning_balance")) if llm else None,
        "ending_balance": _to_f(llm.get("ending_balance")) if llm else None,
        "deposit_count": int(llm.get("deposit_count")) if llm.get("deposit_count") not in (None,"") else None,
        "total_deposits": _to_f(llm.get("total_deposits")) if llm else None,
        "withdrawal_count": int(llm.get("withdrawal_count")) if llm.get("withdrawal_count") not in (None,"") else None,
        "total_withdrawals": -abs(_to_f(llm.get("total_withdrawals"))) if llm and llm.get("total_withdrawals") not in (None,"") else None,
        "period": llm.get("period_label") if llm else None,
    }
    full_text = "\n".join(text_pages)
    brk = _breakouts_fulltext(full_text)
    daily = extract_daily_endings(full_text)
    row = { **totals, **brk,
            "min_daily_ending_balance": min(daily) if daily else None,
            "max_daily_ending_balance": max(daily) if daily else None,
            "daily_endings_full": daily }
    return row
