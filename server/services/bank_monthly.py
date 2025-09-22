from typing import List, Dict, Any
import re
from decimal import Decimal

# Normalize helpers
def _money(v) -> float:
    try:
        return float(v)
    except Exception:
        try:
            return float(Decimal(str(v)))
        except Exception:
            return 0.0

def _sum(items):
    return float(sum(_money(x) for x in items))

# Categorization by description
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
    """
    Input: analyzer/snapshot payload with shape like:
      { "statements": [ { "month": "2025-08", "beginning_balance":..., "ending_balance":..., 
                          "transactions":[ { "date":"2025-08-03", "amount": -123.45, "desc":"..." }, ... ],
                          "daily_endings":[...]
                        }, ... ] }
    Output: rows matching our CSV columns.
    """
    out = []
    statements = (analyzed_payload or {}).get("statements", [])
    for st in statements:
        txs = st.get("transactions", [])
        # balances
        beginning = _money(st.get("beginning_balance"))
        ending    = _money(st.get("ending_balance"))
        # daily endings for min/max
        daily = [ _money(x) for x in st.get("daily_endings", []) ]
        min_end = min(daily) if daily else None
        max_end = max(daily) if daily else None

        # deposits vs withdrawals
        deposits   = [ _money(t.get("amount")) for t in txs if _money(t.get("amount")) > 0 ]
        withdrawals= [ abs(_money(t.get("amount"))) for t in txs if _money(t.get("amount")) < 0 ]

        # categories on withdrawals
        def wsum(pat): return _sum([ abs(_money(t["amount"])) for t in txs if _money(t.get("amount")) < 0 and pat.search(t.get("desc","")) ])
        w_pfs   = wsum(PAT_PFSINGLE)
        w_zelle = wsum(PAT_ZELLE)
        w_amex  = wsum(PAT_AMEX)
        w_chase = wsum(PAT_CHASE)
        w_cad   = wsum(PAT_CADENCE)
        w_sba   = wsum(PAT_SBA)
        w_nav   = wsum(PAT_NAV)

        # categories on deposits
        def dsum(pat): return _sum([ _money(t["amount"]) for t in txs if _money(t.get("amount")) > 0 and pat.search(t.get("desc","")) ])
        d_rad   = dsum(PAT_RADOV)
        d_mchk  = dsum(PAT_MCHECK)
        d_wire  = dsum(PAT_WIRE_IN)

        row = {
            "file": st.get("source_file") or st.get("month") or "",
            "period": st.get("period") or None,
            "beginning_balance": beginning,
            "ending_balance": ending,
            "net_change": ending - beginning,

            "total_deposits": _sum(deposits),
            "deposit_count": len(deposits),
            "deposits_from_RADOVANOVIC": d_rad,
            "mobile_check_deposits": d_mchk,
            "wire_credits": d_wire,

            "total_withdrawals": -_sum(withdrawals),  # keep negative to match prior CSV
            "withdrawal_count": len(withdrawals),
            "withdrawals_PFSINGLE_PT": w_pfs,
            "withdrawals_Zelle": w_zelle,
            "withdrawals_AMEX": w_amex,
            "withdrawals_CHASE_CC": w_chase,
            "withdrawals_CADENCE_BANK": w_cad,
            "withdrawals_SBA_EIDL": w_sba,
            "withdrawals_Nav_Technologies": w_nav,

            "min_daily_ending_balance": min_end,
            "max_daily_ending_balance": max_end,
        }
        out.append(row)
    return out