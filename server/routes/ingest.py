"""CRM ingestion endpoints for multi-tenant field mapping."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import uuid

from core.database import get_db
from core.security import verify_partner_key
from models.tenant import Tenant, Mapping
from models.merchant import Merchant, FieldState
from models.event import Event

router = APIRouter()


class CRMRecord(BaseModel):
    """Single CRM record for ingestion."""
    external_id: str
    data: Dict[str, Any]


class IngestRequest(BaseModel):
    """CRM ingestion request."""
    tenant_id: str
    mapping_id: int
    records: List[CRMRecord]


class FieldStatus(BaseModel):
    """Field status for ask-only-what's-missing."""
    field_id: str
    status: str  # present, missing, expired
    value: Optional[str] = None
    last_verified_at: Optional[str] = None
    confidence: float = 0.0
    source: str = "unknown"


class MerchantSnapshot(BaseModel):
    """Normalized merchant snapshot."""
    merchant_id: str
    fields: Dict[str, Any]
    field_status: List[FieldStatus]


@router.post("/crm")
async def ingest_crm_data(
    request: IngestRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Ingest CRM data using tenant's field mapping."""
    
    # Validate tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == request.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Validate mapping exists and is active
    mapping = db.query(Mapping).filter(
        Mapping.id == request.mapping_id,
        Mapping.tenant_id == request.tenant_id,
        Mapping.status == "active"
    ).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Active mapping not found")
    
    # Load mapping specification
    import json
    try:
        mapping_spec = json.loads(mapping.spec_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid mapping specification")
    
    processed_merchants = []
    
    for record in request.records:
        # Apply field mapping transformation
        normalized_fields = apply_field_mapping(record.data, mapping_spec)
        
        # Upsert merchant
        merchant_id = f"crm_{request.tenant_id}_{record.external_id}"
        merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
        
        if not merchant:
            # Create new merchant
            merchant = Merchant(
                id=merchant_id,
                legal_name=normalized_fields.get("business.legal_name", "Unknown"),
                dba=normalized_fields.get("business.dba"),
                phone=normalized_fields.get("contact.phone"),
                email=normalized_fields.get("contact.email"),
                ein=normalized_fields.get("business.ein"),
                address=normalized_fields.get("business.address"),
                city=normalized_fields.get("business.city"),
                state=normalized_fields.get("business.state"),
                zip=normalized_fields.get("business.zip"),
                status="existing"
            )
            db.add(merchant)
        else:
            # Update existing merchant
            if "business.legal_name" in normalized_fields:
                merchant.legal_name = normalized_fields["business.legal_name"]
            if "business.dba" in normalized_fields:
                merchant.dba = normalized_fields["business.dba"]
            # ... update other fields
        
        # Update field states
        field_status_list = []
        for field_id, value in normalized_fields.items():
            if value is not None:
                # Find existing field state or create new one
                field_state = db.query(FieldState).filter(
                    FieldState.merchant_id == merchant_id,
                    FieldState.field_id == field_id
                ).first()
                
                if field_state:
                    field_state.value = str(value)
                    field_state.last_verified_at = datetime.utcnow()
                    field_state.source = "crm"
                    field_state.confidence = mapping_spec.get("fields", {}).get(field_id, {}).get("confidence", 0.9)
                else:
                    field_state = FieldState(
                        merchant_id=merchant_id,
                        field_id=field_id,
                        value=str(value),
                        source="crm",
                        last_verified_at=datetime.utcnow(),
                        confidence=mapping_spec.get("fields", {}).get(field_id, {}).get("confidence", 0.9)
                    )
                    db.add(field_state)
                
                # Determine field status for ask-only-what's-missing
                expires_days = mapping_spec.get("fields", {}).get(field_id, {}).get("expires_days", 365)
                is_expired = field_state.last_verified_at < datetime.utcnow() - timedelta(days=expires_days)
                
                field_status_list.append(FieldStatus(
                    field_id=field_id,
                    status="expired" if is_expired else "present",
                    value=field_state.value,
                    last_verified_at=field_state.last_verified_at.isoformat(),
                    confidence=field_state.confidence,
                    source=field_state.source
                ))
        
        # Check for missing required fields
        required_fields = mapping_spec.get("required_fields", [])
        present_fields = set(normalized_fields.keys())
        
        for required_field in required_fields:
            if required_field not in present_fields:
                field_status_list.append(FieldStatus(
                    field_id=required_field,
                    status="missing"
                ))
        
        # Create merchant snapshot
        merchant_snapshot = MerchantSnapshot(
            merchant_id=merchant_id,
            fields=normalized_fields,
            field_status=field_status_list
        )
        
        processed_merchants.append(merchant_snapshot)
    
    db.commit()
    
    return {
        "status": "success",
        "processed_count": len(processed_merchants),
        "merchants": processed_merchants
    }


def apply_field_mapping(crm_data: Dict[str, Any], mapping_spec: Dict[str, Any]) -> Dict[str, Any]:
    """Apply field mapping transformation to CRM data."""
    
    normalized = {}
    field_mappings = mapping_spec.get("field_mappings", {})
    
    for canonical_field, mapping_rule in field_mappings.items():
        if isinstance(mapping_rule, str):
            # Simple field mapping: "contact.email": "Email_Address__c"
            if mapping_rule in crm_data:
                normalized[canonical_field] = crm_data[mapping_rule]
        
        elif isinstance(mapping_rule, dict):
            # Complex mapping with transformations
            source_field = mapping_rule.get("source_field")
            transform = mapping_rule.get("transform")
            
            if source_field and source_field in crm_data:
                value = crm_data[source_field]
                
                # Apply transformations
                if transform == "phone_normalize":
                    # Remove non-digits and format as 10-digit phone
                    digits = ''.join(c for c in str(value) if c.isdigit())
                    if len(digits) == 10:
                        normalized[canonical_field] = f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
                elif transform == "uppercase":
                    normalized[canonical_field] = str(value).upper()
                elif transform == "lowercase":
                    normalized[canonical_field] = str(value).lower()
                else:
                    normalized[canonical_field] = value
    
    return normalized


@router.post("/mapping")
async def create_field_mapping(
    tenant_id: str,
    name: str,
    spec: Dict[str, Any],
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Create a new field mapping for a tenant."""
    
    # Validate tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Create mapping
    mapping = Mapping(
        tenant_id=tenant_id,
        name=name,
        spec_json=json.dumps(spec),
        status="draft"
    )
    
    db.add(mapping)
    db.commit()
    
    return {
        "mapping_id": mapping.id,
        "status": "created",
        "name": name
    }


@router.put("/mapping/{mapping_id}/activate")
async def activate_mapping(
    mapping_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Activate a field mapping."""
    
    mapping = db.query(Mapping).filter(Mapping.id == mapping_id).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    
    # Deactivate other mappings for this tenant
    db.query(Mapping).filter(
        Mapping.tenant_id == mapping.tenant_id,
        Mapping.status == "active"
    ).update({"status": "archived"})
    
    # Activate this mapping
    mapping.status = "active"
    db.commit()
    
    return {"status": "activated"}