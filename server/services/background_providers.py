"""Background check providers with flag-only responses for compliance."""

from typing import Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)


def run_clear(merchant: Dict[str, Any], cfg: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    """
    CLEAR (Thomson Reuters) background check integration.
    Returns normalized flags only - no PII exposure.
    """
    # If no credentials configured, return manual-needed
    if not cfg or not cfg.get("api_key"):
        logger.info("CLEAR: No credentials configured, manual review required")
        return "manual", {"reason": "no_clear_credentials"}
    
    # In production, this would make actual CLEAR API call:
    # clear_client = CLEARClient(api_key=cfg["api_key"])
    # response = clear_client.search(
    #     business_name=merchant["legal_name"],
    #     owner_name=merchant.get("owner_name"),
    #     ein=merchant.get("ein")
    # )
    
    # For now, return mock flags based on business logic
    # Real implementation would parse CLEAR response and normalize to these flags
    flags = {
        "criminal": False,      # Criminal background found
        "civil": False,         # Civil litigation found  
        "bankruptcy": False,    # Bankruptcy filings found
        "tax_liens": False,     # Tax liens found
        "ucco": False,          # Uniform Commercial Code violations
        "aml": False,           # Anti-money laundering flags
        "sanctions": False      # OFAC/sanctions list matches
    }
    
    logger.info(f"CLEAR check completed for {merchant.get('legal_name', 'unknown')}")
    return "ok", flags


def run_nyscef(merchant: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    """
    NYSCEF (NY State Courts) name-only lookup.
    Advisory check - returns case count indicators only.
    """
    legal_name = merchant.get("legal_name", "")
    
    if not legal_name:
        return "manual", {"reason": "no_business_name"}
    
    # In production, this would query permitted NYSCEF data sources
    # following their terms of service for business screening
    # Example: search for business name in public court records
    
    # Mock response - real implementation would return actual case counts
    results = {
        "matches": 0,           # Number of potential case matches
        "recent_cases": 0,      # Cases in last 2 years
        "case_types": [],       # Types of cases found (general categories)
        "confidence": "high"    # Match confidence level
    }
    
    logger.info(f"NYSCEF check completed for {legal_name}")
    return "ok", results


def run_sos(merchant: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    """
    Secretary of State ownership verification.
    Checks business registration and ownership matching.
    """
    ein = merchant.get("ein")
    legal_name = merchant.get("legal_name", "")
    state = merchant.get("state", "")
    
    if not ein and not legal_name:
        return "manual", {"reason": "insufficient_business_info"}
    
    # In production, this would query state business registries
    # or use an aggregator service like Dun & Bradstreet
    # Example API calls to state SOS databases for business verification
    
    # Mock response - real implementation would verify against state records
    results = {
        "business_registered": True,    # Business found in state registry
        "status": "active",            # Registration status
        "owner_match": True,           # Reported owner matches filing
        "ein_match": True,             # EIN matches state records
        "address_match": "partial",    # Address verification level
        "filing_current": True         # Recent filings up to date
    }
    
    logger.info(f"SOS check completed for {legal_name} in {state}")
    return "ok", results


def decide_background_status(
    clear: Tuple[str, Dict[str, Any]], 
    court: Tuple[str, Dict[str, Any]], 
    sos: Tuple[str, Dict[str, Any]]
) -> Tuple[str, Dict[str, Any]]:
    """
    Combine all background check results into a single decision.
    
    Returns:
        - "OK": No significant flags, proceed
        - "REVIEW": Flags found requiring manual review  
        - "DECLINE": Hard stops requiring declination
    """
    reasons = {
        "clear": {"status": clear[0], "data": clear[1]},
        "nyscef": {"status": court[0], "data": court[1]},
        "sos": {"status": sos[0], "data": sos[1]}
    }
    
    status = "OK"
    
    # Check for manual review requirements
    if clear[0] == "manual" or court[0] == "manual" or sos[0] == "manual":
        status = "REVIEW"
    
    # Check CLEAR flags for review triggers
    clear_flags = clear[1]
    if isinstance(clear_flags, dict):
        if (clear_flags.get("criminal") or 
            clear_flags.get("bankruptcy") or 
            clear_flags.get("tax_liens") or
            clear_flags.get("sanctions")):
            status = "REVIEW"
    
    # Check court cases for review triggers
    court_data = court[1]
    if isinstance(court_data, dict):
        if court_data.get("matches", 0) > 3 or court_data.get("recent_cases", 0) > 1:
            status = "REVIEW"
    
    # Check SOS for review triggers
    sos_data = sos[1]
    if isinstance(sos_data, dict):
        if (not sos_data.get("business_registered") or 
            sos_data.get("status") != "active" or
            not sos_data.get("owner_match")):
            status = "REVIEW"
    
    # Add hard decline rules here if needed
    # Example: if clear_flags.get("sanctions"): status = "DECLINE"
    
    logger.info(f"Background decision: {status}")
    return status, reasons