"""Background check endpoints with CLEAR, NYSCEF, and ownership verification."""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import uuid
import json
import asyncio

from core.database import get_db
from core.config import get_settings
from core.idempotency import capture_body, require_idempotency, store_idempotent

settings = get_settings()
from core.auth import require_bearer, require_partner
from models.background_job import BackgroundJob
from services.background_checks import (
    background_check_orchestrator,
    PersonIdentity,
    BusinessIdentity,
    CheckType
)

router = APIRouter(tags=["background"])


class PersonData(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: Optional[str] = None
    ssn_last4: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class BusinessData(BaseModel):
    legal_name: str
    ein: Optional[str] = None
    state: Optional[str] = None
    formation_date: Optional[str] = None


class BackgroundCheckRequest(BaseModel):
    merchant_id: str
    person: PersonData
    business: BusinessData
    check_types: Optional[List[str]] = None  # Specific checks to run


@router.post("/check", dependencies=[Depends(capture_body)])
async def start_comprehensive_background_check(
    req: Request,
    request: BackgroundCheckRequest,
    db: Session = Depends(get_db),
    tenant_id=Depends(require_idempotency),
    _: bool = Depends(require_bearer), __: bool = Depends(require_partner)
):
    """Start comprehensive background check with CLEAR, NYSCEF, and ownership verification."""
    
    if getattr(req.state, "idem_cached", None):
        return req.state.idem_cached
    
    job_id = str(uuid.uuid4())
    
    # Create job record
    job = BackgroundJob(
        merchant_id=request.merchant_id,
        status="pending"
    )
    db.add(job)
    db.commit()
    
    # Convert request data to service objects
    person = PersonIdentity(
        first_name=request.person.first_name,
        last_name=request.person.last_name,
        date_of_birth=request.person.date_of_birth,
        ssn_last4=request.person.ssn_last4,
        email=request.person.email,
        phone=request.person.phone
    )
    
    business = BusinessIdentity(
        legal_name=request.business.legal_name,
        ein=request.business.ein,
        state=request.business.state,
        formation_date=request.business.formation_date
    )
    
    # Determine which checks to run
    check_types = None
    if request.check_types:
        check_types = []
        for check_type_str in request.check_types:
            try:
                check_types.append(CheckType(check_type_str))
            except ValueError:
                pass  # Skip invalid check types
    
    try:
        # Run comprehensive background checks
        results = await background_check_orchestrator.run_comprehensive_check(
            person=person,
            business=business,
            check_types=check_types
        )
        
        # Aggregate flag-only results
        aggregated = background_check_orchestrator.aggregate_flags(results)
        
        # Update job with flag-only results
        job.status = "completed"
        job.result_json = json.dumps(aggregated)
        
        # Log background result event
        from models.event import Event
        db.add(Event(
            tenant_id=None,  # TODO: get from header when multi-tenant is wired
            merchant_id=request.merchant_id,
            deal_id=None,  # TODO: add deal_id to request when available
            type="background.result",
            data_json=json.dumps({"status": aggregated.get("overall_flag", "unknown"), "reasons": aggregated})
        ))
        
        db.commit()
        
        resp = {
            "job_id": job.id,
            "status": "completed",
            "result": aggregated,
            "message": "Background checks completed with flag-only results for compliance"
        }
        await store_idempotent(req, resp)
        return resp
    
    except Exception as e:
        # Update job with error status
        job.status = "error"
        job.result_json = json.dumps({"error": str(e)})
        db.commit()
        
        resp = {
            "job_id": job.id,
            "status": "error",
            "error": str(e),
            "message": "Background check failed"
        }
        await store_idempotent(req, resp)
        return resp


@router.get("/jobs/{job_id}")
async def get_background_job(
    job_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(require_bearer), __: bool = Depends(require_partner)
):
    """Get background check job status and flag-only results."""
    
    job = db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    result = None
    if job.result_json:
        result = json.loads(job.result_json)
    
    return {
        "job_id": job.id,
        "merchant_id": job.merchant_id,
        "status": job.status,
        "result": result,
        "created_at": job.created_at.isoformat(),
        "compliance_note": "Results contain flag-only indicators for compliance purposes"
    }


@router.post("/check-types")
async def get_available_check_types(_: bool = Depends(require_bearer), __: bool = Depends(require_partner)):
    """Get available background check types."""
    
    return {
        "available_checks": [
            {
                "type": CheckType.CLEAR_IDENTITY.value,
                "description": "CLEAR identity verification",
                "provider": "CLEAR"
            },
            {
                "type": CheckType.CLEAR_CRIMINAL.value,
                "description": "CLEAR criminal background check",
                "provider": "CLEAR"
            },
            {
                "type": CheckType.NYSCEF_COURT.value,
                "description": "New York State court records",
                "provider": "NYSCEF"
            },
            {
                "type": CheckType.EIN_OWNERSHIP.value,
                "description": "EIN ownership verification",
                "provider": "Ownership Verification Service"
            },
            {
                "type": CheckType.SSN_OWNERSHIP.value,
                "description": "SSN ownership verification",
                "provider": "Ownership Verification Service"
            }
        ],
        "flag_types": [
            {
                "flag": "clear",
                "description": "Check passed with no issues"
            },
            {
                "flag": "review_required",
                "description": "Manual review recommended"
            },
            {
                "flag": "declined", 
                "description": "Check failed - decline recommended"
            },
            {
                "flag": "error",
                "description": "Check could not be completed"
            }
        ]
    }