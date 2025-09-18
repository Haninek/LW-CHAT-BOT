"""Underwriting validation and pre-offer checking endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Optional, List
import uuid
from datetime import datetime

from core.database import get_db
from core.security import verify_partner_key
from models.deal import Deal
from models.metrics_snapshot import MetricsSnapshot
from services.underwriting import underwriting_guardrails, UnderwritingDecision, ViolationSeverity

router = APIRouter(prefix="/api/underwriting", tags=["underwriting"])


class ValidateMetricsRequest(BaseModel):
    avg_monthly_revenue: float
    avg_daily_balance_3m: float
    total_nsf_3m: int
    total_days_negative_3m: int
    highest_balance: Optional[float] = None
    lowest_balance: Optional[float] = None
    state: str = "CA"
    deal_id: Optional[str] = None


class ValidateTermsRequest(BaseModel):
    deal_amount: float
    fee_rate: float
    term_days: int
    monthly_revenue: float
    state: str = "CA"


@router.post("/validate")
async def validate_underwriting(
    request: ValidateMetricsRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Validate financial metrics against underwriting guardrails."""
    
    # Convert request to metrics dict
    metrics = {
        "avg_monthly_revenue": request.avg_monthly_revenue,
        "avg_daily_balance_3m": request.avg_daily_balance_3m,
        "total_nsf_3m": request.total_nsf_3m,
        "total_days_negative_3m": request.total_days_negative_3m,
        "highest_balance": request.highest_balance,
        "lowest_balance": request.lowest_balance
    }
    
    # Run underwriting analysis
    result = underwriting_guardrails.evaluate_metrics(metrics, request.state)
    
    # If deal_id provided, update the deal status based on decision
    if request.deal_id:
        deal = db.query(Deal).filter(Deal.id == request.deal_id).first()
        if deal:
            if result.decision == UnderwritingDecision.DECLINED:
                deal.status = "declined"
                deal.decline_reason = "; ".join(result.reasons)
            elif result.decision == UnderwritingDecision.MANUAL_REVIEW:
                deal.status = "manual_review"
            elif result.decision == UnderwritingDecision.CONDITIONAL:
                deal.status = "conditional"
            else:
                deal.status = "approved"
            
            deal.underwriting_decision = result.decision.value
            deal.risk_score = result.risk_score
            db.commit()
    
    # Format violations for response
    violation_details = []
    for violation in result.violations:
        violation_details.append({
            "rule_id": violation.rule_id,
            "description": violation.description,
            "severity": violation.severity.value,
            "actual_value": violation.actual_value,
            "threshold_value": violation.threshold_value,
            "field_name": violation.field_name
        })
    
    return {
        "decision": result.decision.value,
        "approved": result.decision == UnderwritingDecision.APPROVED,
        "risk_score": result.risk_score,
        "max_offer_amount": result.max_offer_amount,
        "ca_compliant": result.ca_compliant,
        "violations": violation_details,
        "reasons": result.reasons,
        "critical_violations": len([v for v in result.violations if v.severity == ViolationSeverity.CRITICAL]),
        "warning_violations": len([v for v in result.violations if v.severity == ViolationSeverity.WARNING]),
        "state": request.state,
        "deal_id": request.deal_id
    }


@router.post("/validate-terms")
async def validate_deal_terms(
    request: ValidateTermsRequest,
    _: bool = Depends(verify_partner_key)
):
    """Validate specific deal terms for compliance."""
    
    is_valid, issues = underwriting_guardrails.validate_deal_terms(
        deal_amount=request.deal_amount,
        fee_rate=request.fee_rate,
        term_days=request.term_days,
        monthly_revenue=request.monthly_revenue,
        state=request.state
    )
    
    # Calculate additional metrics for response
    total_payback = request.deal_amount * request.fee_rate
    daily_payment = total_payback / request.term_days
    daily_revenue = request.monthly_revenue / 30
    payment_ratio = daily_payment / daily_revenue if daily_revenue > 0 else 0
    exposure_ratio = request.deal_amount / request.monthly_revenue if request.monthly_revenue > 0 else 0
    
    # Approximate APR calculation
    approx_apr = ((request.fee_rate - 1) * 365) / request.term_days
    
    return {
        "valid": is_valid,
        "issues": issues,
        "metrics": {
            "deal_amount": request.deal_amount,
            "fee_rate": request.fee_rate,
            "term_days": request.term_days,
            "total_payback": total_payback,
            "daily_payment": daily_payment,
            "payment_ratio": payment_ratio,
            "exposure_ratio": exposure_ratio,
            "approximate_apr": approx_apr
        },
        "state": request.state
    }


@router.post("/check-deal/{deal_id}")
async def check_deal_underwriting(
    deal_id: str,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Check underwriting status for an existing deal using its latest metrics."""
    
    # Get deal
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Get latest metrics snapshot
    metrics_snapshot = db.query(MetricsSnapshot).filter(
        MetricsSnapshot.deal_id == deal_id
    ).order_by(MetricsSnapshot.created_at.desc()).first()
    
    if not metrics_snapshot:
        raise HTTPException(
            status_code=400, 
            detail="No metrics snapshot found for deal. Upload bank statements and recompute metrics first."
        )
    
    # Convert snapshot to metrics dict
    metrics = {
        "avg_monthly_revenue": metrics_snapshot.avg_monthly_revenue,
        "avg_daily_balance_3m": metrics_snapshot.avg_daily_balance_3m,
        "total_nsf_3m": metrics_snapshot.total_nsf_3m,
        "total_days_negative_3m": metrics_snapshot.total_days_negative_3m,
        "highest_balance": metrics_snapshot.highest_balance,
        "lowest_balance": metrics_snapshot.lowest_balance
    }
    
    # Run underwriting analysis (assume CA for now)
    result = underwriting_guardrails.evaluate_metrics(metrics, "CA")
    
    # Update deal with underwriting results
    deal.underwriting_decision = result.decision.value
    deal.risk_score = result.risk_score
    
    if result.decision == UnderwritingDecision.DECLINED:
        deal.status = "declined"
        deal.decline_reason = "; ".join(result.reasons)
    elif result.decision == UnderwritingDecision.MANUAL_REVIEW:
        deal.status = "manual_review"
    elif result.decision == UnderwritingDecision.CONDITIONAL:
        deal.status = "conditional"
    else:
        deal.status = "approved"
    
    db.commit()
    
    # Format response
    violation_details = []
    for violation in result.violations:
        violation_details.append({
            "rule_id": violation.rule_id,
            "description": violation.description,
            "severity": violation.severity.value,
            "actual_value": violation.actual_value,
            "threshold_value": violation.threshold_value,
            "field_name": violation.field_name
        })
    
    return {
        "deal_id": deal_id,
        "decision": result.decision.value,
        "approved": result.decision == UnderwritingDecision.APPROVED,
        "risk_score": result.risk_score,
        "max_offer_amount": result.max_offer_amount,
        "ca_compliant": result.ca_compliant,
        "violations": violation_details,
        "reasons": result.reasons,
        "deal_status": deal.status,
        "metrics_snapshot_id": metrics_snapshot.id,
        "metrics_source": metrics_snapshot.source,
        "analysis_confidence": metrics_snapshot.analysis_confidence
    }