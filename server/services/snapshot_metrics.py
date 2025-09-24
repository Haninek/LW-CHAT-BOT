from typing import List, Dict, Any
from decimal import Decimal

def _f(x) -> float:
    try: return float(Decimal(str(x)))
    except: return 0.0

def compute_snapshot(months: List[Dict[str,Any]]) -> Dict[str,Any]:
    """Aggregate across uploaded statements for Offer Lab 'scrub snapshot'."""
    if not months:
        return {
            "avg_deposit_amount": 0.0, "other_advances": 0.0, "transfer_amount": 0.0, "misc_deduction": 0.0,
            "number_of_deposits": 0, "negative_days": 0, "avg_daily_balance": 0.0,
            "avg_beginning_balance": 0.0, "avg_ending_balance": 0.0
        }
    dep_sum = sum(_f(m.get("total_deposits")) for m in months)
    dep_cnt = int(sum(_f(m.get("deposit_count")) for m in months))
    avg_deposit_amount = (dep_sum / dep_cnt) if dep_cnt else 0.0

    # "Other advances": wires + any credits labeled as advances/loan proceeds (if provided by parser)
    other_advances = sum(_f(m.get("wire_credits", 0.0)) for m in months)

    transfer_amount = sum(_f(m.get("transfer_in", 0.0)) + _f(m.get("transfer_out", 0.0)) for m in months)

    # Known categorized withdrawals to exclude from "misc"
    known_out = [
        "withdrawals_PFSINGLE_PT","withdrawals_CADENCE_BANK","withdrawals_SBA_EIDL",
        "withdrawals_AMEX","withdrawals_CHASE_CC","withdrawals_Nav_Technologies",
        "withdrawals_Zelle","bank_fees","transfer_out"
    ]
    total_w = sum(abs(_f(m.get("total_withdrawals"))) for m in months)
    known_sum = 0.0
    for m in months:
        for k in known_out:
            known_sum += abs(_f(m.get(k, 0.0)))
    misc_deduction = max(0.0, total_w - known_sum)

    number_of_deposits = dep_cnt

    # daily balances
    all_daily = []
    for m in months:
        arr = m.get("daily_endings_full") or []
        all_daily.extend([_f(x) for x in arr if x is not None])
    negative_days = sum(1 for x in all_daily if x < 0)
    if not all_daily:
        # coarse fallback
        all_daily = [(_f(m.get("beginning_balance")) + _f(m.get("ending_balance"))) / 2.0 for m in months]
    avg_daily_balance = (sum(all_daily)/len(all_daily)) if all_daily else 0.0

    avg_beginning_balance = (sum(_f(m.get("beginning_balance")) for m in months)/len(months))
    avg_ending_balance    = (sum(_f(m.get("ending_balance")) for m in months)/len(months))

    return {
        "avg_deposit_amount": round(avg_deposit_amount,2),
        "other_advances": round(other_advances,2),
        "transfer_amount": round(transfer_amount,2),
        "misc_deduction": round(misc_deduction,2),
        "number_of_deposits": int(number_of_deposits),
        "negative_days": int(negative_days),
        "avg_daily_balance": round(avg_daily_balance,2),
        "avg_beginning_balance": round(avg_beginning_balance,2),
        "avg_ending_balance": round(avg_ending_balance,2)
    }