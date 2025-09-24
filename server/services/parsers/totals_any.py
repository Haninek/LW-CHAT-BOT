import re
from decimal import Decimal
from typing import Dict, Any, List, Optional

def _f(x) -> float:
    try: return float(Decimal(str(x).replace(",", "").replace("$","").strip()))
    except: return 0.0

MONEY = r"\$?\s*([0-9][\d,]*\.\d{2})\s*-?"
MONEY_RE = re.compile(MONEY)

SUMMARIES = {
    "deposits": [
        r"\bOther\s+Deposits\b.*?" + MONEY,
        r"\bDeposits\s*&\s*Credits\b.*?" + MONEY,
        r"\bTotal\s+Deposits\b.*?" + MONEY,
        r"\bTotal\s+Credits\b.*?" + MONEY,
        r"\bDeposits\b.*?" + MONEY,
    ],
    "withdrawals": [
        r"\bOther\s+Withdrawals\b.*?" + MONEY,
        r"\bWithdrawals\s*&\s*Debits\b.*?" + MONEY,
        r"\bTotal\s+Withdrawals\b.*?" + MONEY,
        r"\bTotal\s+Debits\b.*?" + MONEY,
        r"\bWithdrawals\b.*?" + MONEY,
    ],
    "beginning": [
        r"\bBeginning\s+Balance\b.*?" + MONEY,
        r"\bBalance\s+on\s+(\w+\s+\d{1,2},?\s*\d{2,4})\b.*?" + MONEY,
    ],
    "ending": [
        r"\bEnding\s+Balance\b.*?" + MONEY,
        r"\bEnding\s+Balance\s+on\s+(\w+\s+\d{1,2},?\s*\d{2,4})\b.*?" + MONEY,
        r"\bNew\s+Balance\b.*?" + MONEY,
    ],
    "deposit_count": [
        r"\bOther\s+Deposits\s+(\d+)\b",
        r"\bDeposits\s*&\s*Credits\s+(\d+)\b",
        r"\bDeposits\s+(\d+)\b",
    ],
    "withdrawal_count": [
        r"\bOther\s+Withdrawals\s+(\d+)\b",
        r"\bWithdrawals\s*&\s*Debits\s+(\d+)\b",
        r"\bWithdrawals\s+(\d+)\b",
    ],
}

def _first_amount(s: str) -> Optional[float]:
    m = MONEY_RE.search(s)
    return _f(m.group(1)) if m else None

def extract_summary_from_pages(text_pages: List[str]) -> Dict[str, Any]:
    joined = "\n".join(text_pages)
    out: Dict[str, Any] = {}
    def grab(key: str):
        for pat in SUMMARIES[key]:
            m = re.search(pat, joined, re.I|re.S)
            if m:
                amt = _first_amount(m.group(0))
                if amt is not None:
                    if key == "withdrawals": amt = -abs(amt)
                    out_key = {
                        "deposits": "total_deposits",
                        "withdrawals": "total_withdrawals",
                        "beginning": "beginning_balance",
                        "ending": "ending_balance",
                        "deposit_count": "deposit_count",
                        "withdrawal_count": "withdrawal_count",
                    }[key]
                    if out_key not in out:
                        out[out_key] = int(amt) if "count" in out_key else amt
    for k in ("deposits","withdrawals","beginning","ending","deposit_count","withdrawal_count"):
        grab(k)
    return out
