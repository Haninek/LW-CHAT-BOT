from typing import List, Dict, Any
import re
from decimal import Decimal

def _money(v) -> float:
    try:
        return float(v)
    except Exception:
        try: return float(Decimal(str(v)))
        except Exception: return 0.0

def _sum(items): return float(sum(_money(x) for x in items))

PAT_PFSINGLE = re.compile(r'PFSINGLE|SETTLMT\s*PFSINGLE\s*PT|Electronic\s*Settlement', re.I)
PAT_ZELLE    = re.compile(r'\bZELLE\b', re.I)
PAT_AMEX     = re.compile(r'\bAMEX\b', re.I)
PAT_CHASE    = re.compile(r'\bCHASE\b', re.I)
PAT_CADENCE  = re.compile(r'\bCADENCE\b', re.I)
PAT_SBA      = re.compile(r'\bSBA\b|\bEIDL\b', re.I)
PAT_NAV      = re.compile(r'\bNAV\b', re.I)
PAT_RADOV    = re.compile(r'RADOVANOVIC', re.I)
PAT_MCHECK   = re.compile(r'mobile\s*check', re.I)
PAT_WIRE_IN  = re.compile(r'\bWIRE\b', re.I)

def build_monthly_rows(analyzed_payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    out = []
    statements = (analyzed_payload or {}).get("statements", [])
    for st in statements:
        txs = st.get("transactions", [])
        beginning = _money(st.get("beginning_balance"))
        ending    = _money(st.get("ending_balance"))
        daily = [ _money(x) for x in st.get("daily_endings", []) ]
        min_end = min(daily) if daily else None
        max_end = max(daily) if daily else None

        deposits    = [ _money(t.get("amount")) for t in txs if _money(t.get("amount")) > 0 ]
        withdrawals = [ abs(_money(t.get("amount"))) for t in txs if _money(t.get("amount")) < 0 ]

        def wsum(pat): 
            return _sum([ abs(_money(t.get("amount"))) for t in txs if _money(t.get("amount")) < 0 and pat.search(t.get("desc","")) ])
        def dsum(pat): 
            return _sum([ _money(t.get("amount")) for t in txs if _money(t.get("amount")) > 0 and pat.search(t.get("desc","")) ])

        row = {
            "file": st.get("source_file") or st.get("month") or "",
            "period": st.get("period") or None,
            "beginning_balance": beginning,
            "ending_balance": ending,
            "net_change": ending - beginning,

            "total_deposits": _sum(deposits),
            "deposit_count": len(deposits),
            "deposits_from_RADOVANOVIC": dsum(PAT_RADOV),
            "mobile_check_deposits": dsum(PAT_MCHECK),
            "wire_credits": dsum(PAT_WIRE_IN),

            "total_withdrawals": -_sum(withdrawals),  # keep negative (CSV style)
            "withdrawal_count": len(withdrawals),
            "withdrawals_PFSINGLE_PT": wsum(PAT_PFSINGLE),
            "withdrawals_Zelle": wsum(PAT_ZELLE),
            "withdrawals_AMEX": wsum(PAT_AMEX),
            "withdrawals_CHASE_CC": wsum(PAT_CHASE),
            "withdrawals_CADENCE_BANK": wsum(PAT_CADENCE),
            "withdrawals_SBA_EIDL": wsum(PAT_SBA),
            "withdrawals_Nav_Technologies": wsum(PAT_NAV),

            "min_daily_ending_balance": min_end,
            "max_daily_ending_balance": max_end,
        }
        out.append(row)
    return out
