"""Background check services with flag-only responses for compliance."""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import json
import uuid
from datetime import datetime
import asyncio
import aiohttp


class BackgroundCheckFlag(Enum):
    """Flag types for background check results."""
    CLEAR = "clear"
    REVIEW_REQUIRED = "review_required"  
    DECLINED = "declined"
    ERROR = "error"
    PENDING = "pending"


class CheckType(Enum):
    """Types of background checks."""
    CLEAR_IDENTITY = "clear_identity"
    CLEAR_CRIMINAL = "clear_criminal"
    NYSCEF_COURT = "nyscef_court"
    EIN_OWNERSHIP = "ein_ownership"
    SSN_OWNERSHIP = "ssn_ownership"


@dataclass
class BackgroundCheckResult:
    """Flag-only result for compliance."""
    check_type: CheckType
    flag: BackgroundCheckFlag
    reference_id: str
    checked_at: datetime
    error_message: Optional[str] = None
    confidence: float = 1.0


@dataclass
class PersonIdentity:
    """Person identity for background checks."""
    first_name: str
    last_name: str
    date_of_birth: Optional[str] = None
    ssn_last4: Optional[str] = None
    full_ssn: Optional[str] = None  # Only for ownership verification
    email: Optional[str] = None
    phone: Optional[str] = None


@dataclass
class BusinessIdentity:
    """Business identity for ownership verification."""
    legal_name: str
    ein: Optional[str] = None
    state: Optional[str] = None
    formation_date: Optional[str] = None


class ClearService:
    """CLEAR identity and criminal background check service."""
    
    def __init__(self, api_key: Optional[str] = None, base_url: str = "https://api.clear.com/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.mock_mode = api_key is None or api_key == "development-key"
    
    async def identity_verification(self, person: PersonIdentity) -> BackgroundCheckResult:
        """Verify identity through CLEAR."""
        reference_id = str(uuid.uuid4())
        
        if self.mock_mode:
            # Mock identity verification logic
            if person.first_name.lower() == "test" or person.last_name.lower() == "declined":
                flag = BackgroundCheckFlag.DECLINED
            elif person.first_name.lower() == "review":
                flag = BackgroundCheckFlag.REVIEW_REQUIRED
            else:
                flag = BackgroundCheckFlag.CLEAR
            
            return BackgroundCheckResult(
                check_type=CheckType.CLEAR_IDENTITY,
                flag=flag,
                reference_id=reference_id,
                checked_at=datetime.utcnow(),
                confidence=0.95
            )
        
        # Real CLEAR API integration (flag-only response)
        try:
            payload = {
                "first_name": person.first_name,
                "last_name": person.last_name,
                "date_of_birth": person.date_of_birth,
                "ssn_last4": person.ssn_last4,
                "email": person.email,
                "phone": person.phone
            }
            
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {self.api_key}"}
                async with session.post(
                    f"{self.base_url}/identity/verify", 
                    json=payload, 
                    headers=headers
                ) as response:
                    result = await response.json()
                    
                    # Map CLEAR response to flag-only format
                    if response.status == 200:
                        if result.get("verified", False):
                            flag = BackgroundCheckFlag.CLEAR
                        else:
                            flag = BackgroundCheckFlag.REVIEW_REQUIRED
                    else:
                        flag = BackgroundCheckFlag.ERROR
                    
                    return BackgroundCheckResult(
                        check_type=CheckType.CLEAR_IDENTITY,
                        flag=flag,
                        reference_id=result.get("reference_id", reference_id),
                        checked_at=datetime.utcnow(),
                        confidence=result.get("confidence", 0.0)
                    )
        
        except Exception as e:
            return BackgroundCheckResult(
                check_type=CheckType.CLEAR_IDENTITY,
                flag=BackgroundCheckFlag.ERROR,
                reference_id=reference_id,
                checked_at=datetime.utcnow(),
                error_message=str(e),
                confidence=0.0
            )
    
    async def criminal_background_check(self, person: PersonIdentity) -> BackgroundCheckResult:
        """Criminal background check through CLEAR."""
        reference_id = str(uuid.uuid4())
        
        if self.mock_mode:
            # Mock criminal background logic
            if person.last_name.lower() in ["criminal", "felon"]:
                flag = BackgroundCheckFlag.DECLINED
            elif person.last_name.lower() in ["minor", "misdemeanor"]:
                flag = BackgroundCheckFlag.REVIEW_REQUIRED
            else:
                flag = BackgroundCheckFlag.CLEAR
            
            return BackgroundCheckResult(
                check_type=CheckType.CLEAR_CRIMINAL,
                flag=flag,
                reference_id=reference_id,
                checked_at=datetime.utcnow(),
                confidence=0.92
            )
        
        # Real CLEAR criminal check (flag-only response)
        try:
            payload = {
                "first_name": person.first_name,
                "last_name": person.last_name,
                "date_of_birth": person.date_of_birth,
                "ssn_last4": person.ssn_last4
            }
            
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {self.api_key}"}
                async with session.post(
                    f"{self.base_url}/criminal/check", 
                    json=payload, 
                    headers=headers
                ) as response:
                    result = await response.json()
                    
                    # Map to flag-only format based on CLEAR results
                    if response.status == 200:
                        if result.get("clear", True):
                            flag = BackgroundCheckFlag.CLEAR
                        elif result.get("review_required", False):
                            flag = BackgroundCheckFlag.REVIEW_REQUIRED
                        else:
                            flag = BackgroundCheckFlag.DECLINED
                    else:
                        flag = BackgroundCheckFlag.ERROR
                    
                    return BackgroundCheckResult(
                        check_type=CheckType.CLEAR_CRIMINAL,
                        flag=flag,
                        reference_id=result.get("reference_id", reference_id),
                        checked_at=datetime.utcnow(),
                        confidence=result.get("confidence", 0.0)
                    )
        
        except Exception as e:
            return BackgroundCheckResult(
                check_type=CheckType.CLEAR_CRIMINAL,
                flag=BackgroundCheckFlag.ERROR,
                reference_id=reference_id,
                checked_at=datetime.utcnow(),
                error_message=str(e),
                confidence=0.0
            )


class NYSCEFService:
    """New York State court records check service."""
    
    def __init__(self, api_key: Optional[str] = None, base_url: str = "https://api.nyscef.gov/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.mock_mode = api_key is None or api_key == "development-key"
    
    async def court_records_check(self, person: PersonIdentity) -> BackgroundCheckResult:
        """Check NY state court records."""
        reference_id = str(uuid.uuid4())
        
        if self.mock_mode:
            # Mock NY court records logic
            if person.last_name.lower() in ["lawsuit", "litigation"]:
                flag = BackgroundCheckFlag.REVIEW_REQUIRED
            elif person.last_name.lower() in ["judgment", "bankruptcy"]:
                flag = BackgroundCheckFlag.DECLINED
            else:
                flag = BackgroundCheckFlag.CLEAR
            
            return BackgroundCheckResult(
                check_type=CheckType.NYSCEF_COURT,
                flag=flag,
                reference_id=reference_id,
                checked_at=datetime.utcnow(),
                confidence=0.88
            )
        
        # Real NYSCEF API integration (flag-only response)
        try:
            payload = {
                "first_name": person.first_name,
                "last_name": person.last_name,
                "date_of_birth": person.date_of_birth
            }
            
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {self.api_key}"}
                async with session.post(
                    f"{self.base_url}/records/search", 
                    json=payload, 
                    headers=headers
                ) as response:
                    result = await response.json()
                    
                    # Map to flag-only format
                    if response.status == 200:
                        record_count = result.get("record_count", 0)
                        if record_count == 0:
                            flag = BackgroundCheckFlag.CLEAR
                        elif record_count <= 2:
                            flag = BackgroundCheckFlag.REVIEW_REQUIRED
                        else:
                            flag = BackgroundCheckFlag.DECLINED
                    else:
                        flag = BackgroundCheckFlag.ERROR
                    
                    return BackgroundCheckResult(
                        check_type=CheckType.NYSCEF_COURT,
                        flag=flag,
                        reference_id=result.get("reference_id", reference_id),
                        checked_at=datetime.utcnow(),
                        confidence=result.get("confidence", 0.0)
                    )
        
        except Exception as e:
            return BackgroundCheckResult(
                check_type=CheckType.NYSCEF_COURT,
                flag=BackgroundCheckFlag.ERROR,
                reference_id=reference_id,
                checked_at=datetime.utcnow(),
                error_message=str(e),
                confidence=0.0
            )


class OwnershipVerificationService:
    """EIN/SSN ownership verification service."""
    
    def __init__(self, api_key: Optional[str] = None, base_url: str = "https://api.ownership-verify.com/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.mock_mode = api_key is None or api_key == "development-key"
    
    async def ein_ownership_check(self, person: PersonIdentity, business: BusinessIdentity) -> BackgroundCheckResult:
        """Verify EIN ownership."""
        reference_id = str(uuid.uuid4())
        
        if self.mock_mode:
            # Mock EIN ownership logic
            if business.ein and business.ein.endswith("0000"):
                flag = BackgroundCheckFlag.DECLINED
            elif not business.ein or len(business.ein) != 9:
                flag = BackgroundCheckFlag.REVIEW_REQUIRED
            else:
                flag = BackgroundCheckFlag.CLEAR
            
            return BackgroundCheckResult(
                check_type=CheckType.EIN_OWNERSHIP,
                flag=flag,
                reference_id=reference_id,
                checked_at=datetime.utcnow(),
                confidence=0.90
            )
        
        # Real EIN verification (flag-only response)
        try:
            payload = {
                "ein": business.ein,
                "business_name": business.legal_name,
                "owner_first_name": person.first_name,
                "owner_last_name": person.last_name,
                "owner_ssn_last4": person.ssn_last4
            }
            
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {self.api_key}"}
                async with session.post(
                    f"{self.base_url}/ein/verify", 
                    json=payload, 
                    headers=headers
                ) as response:
                    result = await response.json()
                    
                    # Map to flag-only format
                    if response.status == 200:
                        if result.get("verified", False):
                            flag = BackgroundCheckFlag.CLEAR
                        elif result.get("partial_match", False):
                            flag = BackgroundCheckFlag.REVIEW_REQUIRED
                        else:
                            flag = BackgroundCheckFlag.DECLINED
                    else:
                        flag = BackgroundCheckFlag.ERROR
                    
                    return BackgroundCheckResult(
                        check_type=CheckType.EIN_OWNERSHIP,
                        flag=flag,
                        reference_id=result.get("reference_id", reference_id),
                        checked_at=datetime.utcnow(),
                        confidence=result.get("confidence", 0.0)
                    )
        
        except Exception as e:
            return BackgroundCheckResult(
                check_type=CheckType.EIN_OWNERSHIP,
                flag=BackgroundCheckFlag.ERROR,
                reference_id=reference_id,
                checked_at=datetime.utcnow(),
                error_message=str(e),
                confidence=0.0
            )
    
    async def ssn_ownership_check(self, person: PersonIdentity, business: BusinessIdentity) -> BackgroundCheckResult:
        """Verify SSN ownership of business."""
        reference_id = str(uuid.uuid4())
        
        if self.mock_mode:
            # Mock SSN ownership logic
            if person.ssn_last4 and person.ssn_last4 in ["0000", "1234"]:
                flag = BackgroundCheckFlag.DECLINED
            elif not person.ssn_last4:
                flag = BackgroundCheckFlag.REVIEW_REQUIRED
            else:
                flag = BackgroundCheckFlag.CLEAR
            
            return BackgroundCheckResult(
                check_type=CheckType.SSN_OWNERSHIP,
                flag=flag,
                reference_id=reference_id,
                checked_at=datetime.utcnow(),
                confidence=0.85
            )
        
        # Real SSN verification (flag-only response)
        try:
            payload = {
                "ssn_last4": person.ssn_last4,
                "first_name": person.first_name,
                "last_name": person.last_name,
                "business_name": business.legal_name,
                "business_ein": business.ein
            }
            
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {self.api_key}"}
                async with session.post(
                    f"{self.base_url}/ssn/verify", 
                    json=payload, 
                    headers=headers
                ) as response:
                    result = await response.json()
                    
                    # Map to flag-only format
                    if response.status == 200:
                        if result.get("verified", False):
                            flag = BackgroundCheckFlag.CLEAR
                        elif result.get("partial_match", False):
                            flag = BackgroundCheckFlag.REVIEW_REQUIRED
                        else:
                            flag = BackgroundCheckFlag.DECLINED
                    else:
                        flag = BackgroundCheckFlag.ERROR
                    
                    return BackgroundCheckResult(
                        check_type=CheckType.SSN_OWNERSHIP,
                        flag=flag,
                        reference_id=result.get("reference_id", reference_id),
                        checked_at=datetime.utcnow(),
                        confidence=result.get("confidence", 0.0)
                    )
        
        except Exception as e:
            return BackgroundCheckResult(
                check_type=CheckType.SSN_OWNERSHIP,
                flag=BackgroundCheckFlag.ERROR,
                reference_id=reference_id,
                checked_at=datetime.utcnow(),
                error_message=str(e),
                confidence=0.0
            )


class BackgroundCheckOrchestrator:
    """Orchestrates multiple background check services."""
    
    def __init__(
        self, 
        clear_api_key: Optional[str] = None,
        nyscef_api_key: Optional[str] = None,
        ownership_api_key: Optional[str] = None
    ):
        self.clear_service = ClearService(clear_api_key)
        self.nyscef_service = NYSCEFService(nyscef_api_key)
        self.ownership_service = OwnershipVerificationService(ownership_api_key)
    
    async def run_comprehensive_check(
        self, 
        person: PersonIdentity, 
        business: BusinessIdentity,
        check_types: List[CheckType] = None
    ) -> List[BackgroundCheckResult]:
        """Run multiple background checks and return flag-only results."""
        
        if check_types is None:
            check_types = [
                CheckType.CLEAR_IDENTITY,
                CheckType.CLEAR_CRIMINAL,
                CheckType.NYSCEF_COURT,
                CheckType.EIN_OWNERSHIP,
                CheckType.SSN_OWNERSHIP
            ]
        
        tasks = []
        
        for check_type in check_types:
            if check_type == CheckType.CLEAR_IDENTITY:
                tasks.append(self.clear_service.identity_verification(person))
            elif check_type == CheckType.CLEAR_CRIMINAL:
                tasks.append(self.clear_service.criminal_background_check(person))
            elif check_type == CheckType.NYSCEF_COURT:
                tasks.append(self.nyscef_service.court_records_check(person))
            elif check_type == CheckType.EIN_OWNERSHIP:
                tasks.append(self.ownership_service.ein_ownership_check(person, business))
            elif check_type == CheckType.SSN_OWNERSHIP:
                tasks.append(self.ownership_service.ssn_ownership_check(person, business))
        
        # Run all checks concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions
        final_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                final_results.append(BackgroundCheckResult(
                    check_type=check_types[i],
                    flag=BackgroundCheckFlag.ERROR,
                    reference_id=str(uuid.uuid4()),
                    checked_at=datetime.utcnow(),
                    error_message=str(result),
                    confidence=0.0
                ))
            else:
                final_results.append(result)
        
        return final_results
    
    def aggregate_flags(self, results: List[BackgroundCheckResult]) -> Dict:
        """Aggregate flag-only results for decision making."""
        flag_counts = {flag.value: 0 for flag in BackgroundCheckFlag}
        total_confidence = 0.0
        check_count = 0
        
        for result in results:
            flag_counts[result.flag.value] += 1
            if result.flag != BackgroundCheckFlag.ERROR:
                total_confidence += result.confidence
                check_count += 1
        
        avg_confidence = total_confidence / check_count if check_count > 0 else 0.0
        
        # Determine overall decision
        if flag_counts["declined"] > 0:
            overall_decision = "declined"
        elif flag_counts["review_required"] > 0:
            overall_decision = "review_required"
        elif flag_counts["error"] > 0 and flag_counts["clear"] == 0:
            overall_decision = "error"
        else:
            overall_decision = "clear"
        
        return {
            "overall_decision": overall_decision,
            "flag_summary": flag_counts,
            "checks_completed": len(results),
            "average_confidence": round(avg_confidence, 2),
            "results": [
                {
                    "check_type": result.check_type.value,
                    "flag": result.flag.value,
                    "reference_id": result.reference_id,
                    "confidence": result.confidence,
                    "error_message": result.error_message
                }
                for result in results
            ]
        }


# Global instance
background_check_orchestrator = BackgroundCheckOrchestrator()