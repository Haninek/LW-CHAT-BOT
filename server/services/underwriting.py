"""Underwriting guardrails and eligibility validation service."""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import json


class UnderwritingDecision(Enum):
    """Underwriting decision outcomes."""
    APPROVED = "approved"
    DECLINED = "declined"
    MANUAL_REVIEW = "manual_review"
    CONDITIONAL = "conditional"


class ViolationSeverity(Enum):
    """Severity levels for rule violations."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class RuleViolation:
    """Represents a violated underwriting rule."""
    rule_id: str
    description: str
    severity: ViolationSeverity
    actual_value: float
    threshold_value: float
    field_name: str


@dataclass
class UnderwritingResult:
    """Result of underwriting analysis."""
    decision: UnderwritingDecision
    violations: List[RuleViolation]
    max_offer_amount: Optional[float]
    risk_score: float
    reasons: List[str]
    ca_compliant: bool


class CAComplianceRules:
    """California-specific lending compliance requirements."""
    
    # CA Commercial Financing Truth in Lending Act (AB-1864) requirements
    MAX_ANNUAL_FEE_RATE = 0.36  # 36% APR cap for certain loan types
    MIN_REVENUE_REQUIREMENT = 50000  # Minimum annual revenue
    MAX_NSF_RATIO = 0.05  # Max 5% NSF ratio for CA compliance
    
    # CA specific thresholds
    REVENUE_VERIFICATION_THRESHOLD = 100000  # Above this requires additional verification
    HIGH_RISK_NSF_THRESHOLD = 8  # NSF count that triggers high-risk classification


class UnderwritingGuardrails:
    """Core underwriting rules and business logic."""
    
    def __init__(self):
        self.rules = {
            # Revenue requirements
            "min_monthly_revenue": {"threshold": 15000, "severity": ViolationSeverity.CRITICAL},
            "min_annual_revenue": {"threshold": 180000, "severity": ViolationSeverity.CRITICAL},
            
            # NSF limits
            "max_nsf_3m": {"threshold": 5, "severity": ViolationSeverity.CRITICAL},
            "max_nsf_ratio": {"threshold": 0.03, "severity": ViolationSeverity.WARNING},
            
            # Balance requirements
            "min_avg_balance": {"threshold": 5000, "severity": ViolationSeverity.WARNING},
            "balance_to_revenue_ratio": {"threshold": 0.05, "severity": ViolationSeverity.WARNING},
            
            # Negative balance limits
            "max_negative_days_3m": {"threshold": 15, "severity": ViolationSeverity.CRITICAL},
            "max_consecutive_negative_days": {"threshold": 7, "severity": ViolationSeverity.WARNING},
            
            # CA specific rules
            "ca_min_revenue": {"threshold": CAComplianceRules.MIN_REVENUE_REQUIREMENT, "severity": ViolationSeverity.CRITICAL},
            "ca_max_nsf_ratio": {"threshold": CAComplianceRules.MAX_NSF_RATIO, "severity": ViolationSeverity.CRITICAL},
            
            # Risk concentration limits
            "max_daily_payment_ratio": {"threshold": 0.15, "severity": ViolationSeverity.WARNING},  # 15% of daily revenue
            "max_total_exposure": {"threshold": 2.0, "severity": ViolationSeverity.WARNING},  # 2x monthly revenue
        }
    
    def evaluate_metrics(
        self, 
        metrics: Dict,
        state: str = "CA",
        deal_amount: Optional[float] = None
    ) -> UnderwritingResult:
        """Evaluate financial metrics against underwriting rules."""
        
        violations = []
        reasons = []
        risk_score = 0.3  # Base risk score
        
        # Extract metrics
        monthly_revenue = metrics.get("avg_monthly_revenue", 0)
        annual_revenue = monthly_revenue * 12
        daily_balance = metrics.get("avg_daily_balance_3m", 0)
        nsf_count = metrics.get("total_nsf_3m", 0)
        negative_days = metrics.get("total_days_negative_3m", 0)
        
        # Calculate derived metrics
        nsf_ratio = nsf_count / 90 if nsf_count > 0 else 0  # NSF per day ratio
        balance_to_revenue_ratio = daily_balance / monthly_revenue if monthly_revenue > 0 else 0
        
        # Check revenue requirements
        if monthly_revenue < self.rules["min_monthly_revenue"]["threshold"]:
            violations.append(RuleViolation(
                rule_id="min_monthly_revenue",
                description="Monthly revenue below minimum threshold",
                severity=self.rules["min_monthly_revenue"]["severity"],
                actual_value=monthly_revenue,
                threshold_value=self.rules["min_monthly_revenue"]["threshold"],
                field_name="avg_monthly_revenue"
            ))
            risk_score += 0.3
        
        if annual_revenue < self.rules["min_annual_revenue"]["threshold"]:
            violations.append(RuleViolation(
                rule_id="min_annual_revenue",
                description="Annual revenue below minimum threshold",
                severity=self.rules["min_annual_revenue"]["severity"],
                actual_value=annual_revenue,
                threshold_value=self.rules["min_annual_revenue"]["threshold"],
                field_name="annual_revenue"
            ))
        
        # Check NSF limits
        if nsf_count > self.rules["max_nsf_3m"]["threshold"]:
            violations.append(RuleViolation(
                rule_id="max_nsf_3m",
                description="NSF count exceeds maximum threshold",
                severity=self.rules["max_nsf_3m"]["severity"],
                actual_value=nsf_count,
                threshold_value=self.rules["max_nsf_3m"]["threshold"],
                field_name="total_nsf_3m"
            ))
            risk_score += 0.25
        
        if nsf_ratio > self.rules["max_nsf_ratio"]["threshold"]:
            violations.append(RuleViolation(
                rule_id="max_nsf_ratio",
                description="NSF ratio too high",
                severity=self.rules["max_nsf_ratio"]["severity"],
                actual_value=nsf_ratio,
                threshold_value=self.rules["max_nsf_ratio"]["threshold"],
                field_name="nsf_ratio"
            ))
            risk_score += 0.15
        
        # Check balance requirements
        if daily_balance < self.rules["min_avg_balance"]["threshold"]:
            violations.append(RuleViolation(
                rule_id="min_avg_balance",
                description="Average daily balance too low",
                severity=self.rules["min_avg_balance"]["severity"],
                actual_value=daily_balance,
                threshold_value=self.rules["min_avg_balance"]["threshold"],
                field_name="avg_daily_balance_3m"
            ))
            risk_score += 0.2
        
        if balance_to_revenue_ratio < self.rules["balance_to_revenue_ratio"]["threshold"]:
            violations.append(RuleViolation(
                rule_id="balance_to_revenue_ratio",
                description="Balance to revenue ratio too low",
                severity=self.rules["balance_to_revenue_ratio"]["severity"],
                actual_value=balance_to_revenue_ratio,
                threshold_value=self.rules["balance_to_revenue_ratio"]["threshold"],
                field_name="balance_to_revenue_ratio"
            ))
            risk_score += 0.15
        
        # Check negative balance limits
        if negative_days > self.rules["max_negative_days_3m"]["threshold"]:
            violations.append(RuleViolation(
                rule_id="max_negative_days_3m",
                description="Too many negative balance days",
                severity=self.rules["max_negative_days_3m"]["severity"],
                actual_value=negative_days,
                threshold_value=self.rules["max_negative_days_3m"]["threshold"],
                field_name="total_days_negative_3m"
            ))
            risk_score += 0.3
        
        # CA-specific compliance checks
        ca_compliant = True
        if state == "CA":
            if annual_revenue < CAComplianceRules.MIN_REVENUE_REQUIREMENT:
                violations.append(RuleViolation(
                    rule_id="ca_min_revenue",
                    description="Does not meet CA minimum revenue requirement",
                    severity=ViolationSeverity.CRITICAL,
                    actual_value=annual_revenue,
                    threshold_value=CAComplianceRules.MIN_REVENUE_REQUIREMENT,
                    field_name="annual_revenue"
                ))
                ca_compliant = False
            
            if nsf_ratio > CAComplianceRules.MAX_NSF_RATIO:
                violations.append(RuleViolation(
                    rule_id="ca_max_nsf_ratio",
                    description="NSF ratio exceeds CA compliance limit",
                    severity=ViolationSeverity.CRITICAL,
                    actual_value=nsf_ratio,
                    threshold_value=CAComplianceRules.MAX_NSF_RATIO,
                    field_name="nsf_ratio"
                ))
                ca_compliant = False
            
            if nsf_count >= CAComplianceRules.HIGH_RISK_NSF_THRESHOLD:
                reasons.append("High NSF count triggers CA high-risk classification")
                risk_score += 0.2
        
        # Determine decision
        critical_violations = [v for v in violations if v.severity == ViolationSeverity.CRITICAL]
        warning_violations = [v for v in violations if v.severity == ViolationSeverity.WARNING]
        
        if critical_violations or not ca_compliant:
            decision = UnderwritingDecision.DECLINED
            reasons.append("Critical underwriting violations or compliance issues")
            max_offer_amount = None
        elif len(warning_violations) >= 3 or risk_score > 0.8:
            decision = UnderwritingDecision.MANUAL_REVIEW
            reasons.append("Multiple warnings or high risk score requires manual review")
            max_offer_amount = monthly_revenue * 0.5  # Conservative cap
        elif risk_score > 0.6:
            decision = UnderwritingDecision.CONDITIONAL
            reasons.append("Moderate risk - conditional approval with limits")
            max_offer_amount = monthly_revenue * 0.8
        else:
            decision = UnderwritingDecision.APPROVED
            reasons.append("Meets all underwriting requirements")
            max_offer_amount = monthly_revenue * 1.2
        
        # Cap risk score
        risk_score = min(risk_score, 1.0)
        
        return UnderwritingResult(
            decision=decision,
            violations=violations,
            max_offer_amount=max_offer_amount,
            risk_score=risk_score,
            reasons=reasons,
            ca_compliant=ca_compliant
        )
    
    def validate_deal_terms(
        self,
        deal_amount: float,
        fee_rate: float,
        term_days: int,
        monthly_revenue: float,
        state: str = "CA"
    ) -> Tuple[bool, List[str]]:
        """Validate specific deal terms against compliance requirements."""
        
        issues = []
        
        # Calculate daily payment
        total_payback = deal_amount * fee_rate
        daily_payment = total_payback / term_days
        daily_revenue = monthly_revenue / 30
        payment_ratio = daily_payment / daily_revenue if daily_revenue > 0 else 0
        
        # Check payment ratio
        if payment_ratio > self.rules["max_daily_payment_ratio"]["threshold"]:
            issues.append(f"Daily payment ratio ({payment_ratio:.2%}) exceeds limit ({self.rules['max_daily_payment_ratio']['threshold']:.2%})")
        
        # Check total exposure
        exposure_ratio = deal_amount / monthly_revenue if monthly_revenue > 0 else 0
        if exposure_ratio > self.rules["max_total_exposure"]["threshold"]:
            issues.append(f"Total exposure ratio ({exposure_ratio:.1f}x) exceeds limit ({self.rules['max_total_exposure']['threshold']:.1f}x)")
        
        # CA specific fee rate check
        if state == "CA":
            # Convert fee rate to approximate APR for comparison
            approx_apr = ((fee_rate - 1) * 365) / term_days
            if approx_apr > CAComplianceRules.MAX_ANNUAL_FEE_RATE:
                issues.append(f"Fee rate may exceed CA APR limits (approx {approx_apr:.2%} APR)")
        
        return len(issues) == 0, issues


# Global instance
underwriting_guardrails = UnderwritingGuardrails()