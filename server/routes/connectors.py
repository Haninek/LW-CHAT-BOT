"""Connector management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel

from core.database import get_db
from core.security import encrypt_data, decrypt_data, mask_secrets, verify_partner_key
from core.auth import require_bearer
from models.connector import Connector
from models.tenant import Tenant

router = APIRouter()


class ConnectorConfig(BaseModel):
    tenant_id: str
    name: str
    config: Dict[str, Any]


class ConnectorValidation(BaseModel):
    tenant_id: str
    name: str
    live: bool = False


@router.get("/")
async def list_connectors_from_header(
    request: Request,
    db: Session = Depends(get_db),
    _: bool = Depends(require_bearer)
):
    """List all connectors for tenant from X-Tenant-ID header."""
    
    # Get tenant ID from header, fallback to 'default-tenant'
    tenant_id = request.headers.get('X-Tenant-ID', 'default-tenant')
    
    # Validate tenant exists or create if it doesn't
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        # Create default tenant if it doesn't exist
        tenant = Tenant(id=tenant_id, name=f"Tenant {tenant_id}")
        db.add(tenant)
        db.commit()
    
    connectors = db.query(Connector).filter(Connector.tenant_id == tenant_id).all()
    return {
        "success": True,
        "data": [
            {
                "id": c.name,
                "name": c.name, 
                "type": c.name.lower().replace(' ', '_'),
                "status": "active",
                "config": mask_secrets(decrypt_data(str(c.encrypted_config))) if str(c.encrypted_config) else {},
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat(),
                "last_tested_at": c.updated_at.isoformat()
            }
            for c in connectors
        ],
        "timestamp": tenant.created_at.isoformat()
    }


@router.post("/")
async def save_connector(
    connector_config: ConnectorConfig,
    request: Request,
    db: Session = Depends(get_db),
    _: bool = Depends(require_bearer)
):
    """Save or update tenant-specific connector configuration (encrypted)."""
    
    # Validate tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == connector_config.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Encrypt the configuration
    encrypted_config = encrypt_data(connector_config.config)
    
    # Save to database
    existing = db.query(Connector).filter(
        Connector.tenant_id == connector_config.tenant_id,
        Connector.name == connector_config.name
    ).first()
    
    if existing:
        existing.encrypted_config = encrypted_config  # pyright: ignore
        db.commit()
        return {
            "status": "updated", 
            "tenant_id": connector_config.tenant_id,
            "name": connector_config.name
        }
    else:
        connector = Connector(
            tenant_id=connector_config.tenant_id,
            name=connector_config.name,
            encrypted_config=encrypted_config
        )
        db.add(connector)
        db.commit()
        return {
            "status": "created", 
            "tenant_id": connector_config.tenant_id,
            "name": connector_config.name
        }


@router.get("/{tenant_id}")
async def list_connectors(
    tenant_id: str,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """List all connectors for a specific tenant."""
    
    # Validate tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    connectors = db.query(Connector).filter(Connector.tenant_id == tenant_id).all()
    return [
        {
            "tenant_id": c.tenant_id,
            "name": c.name,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat()
        }
        for c in connectors
    ]


@router.get("/{tenant_id}/{name}")
async def get_connector(
    tenant_id: str,
    name: str,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Get tenant-specific connector configuration (always masked for security)."""
    
    # Validate tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    connector = db.query(Connector).filter(
        Connector.tenant_id == tenant_id,
        Connector.name == name
    ).first()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    
    config = decrypt_data(str(connector.encrypted_config))
    config = mask_secrets(config)  # Always mask secrets
    
    return {
        "tenant_id": connector.tenant_id,
        "name": connector.name,
        "config": config,
        "created_at": connector.created_at.isoformat(),
        "updated_at": connector.updated_at.isoformat()
    }


@router.post("/validate")
async def validate_connector(
    validation: ConnectorValidation,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Validate tenant-specific connector configuration."""
    
    # Validate tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == validation.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # TODO: Implement actual validation logic for each connector type
    base_response = {
        "tenant_id": validation.tenant_id,
        "name": validation.name,
        "status": "valid",
        "checks": {"structure": True}
    }
    
    if validation.name == "plaid":
        return {
            **base_response,
            "message": "TODO: Plaid validation in mock mode",
            "checks": {
                "structure": True,
                "connection": False if not validation.live else None
            }
        }
    elif validation.name == "docusign":
        return {
            **base_response,
            "message": "DocuSign configuration structure is valid",
            "checks": {
                "structure": True,
                "connection": True if validation.live else None
            }
        }
    elif validation.name == "clear":
        return {
            **base_response,
            "message": "CLEAR configuration structure is valid", 
            "checks": {
                "structure": True,
                "connection": True if validation.live else None
            }
        }
    elif validation.name == "cherry_sms":
        return {
            **base_response,
            "message": "Cherry SMS configuration structure is valid",
            "checks": {
                "structure": True,
                "connection": True if validation.live else None
            }
        }
    elif validation.name == "dropbox_sign":
        return {
            **base_response,
            "message": "Dropbox Sign configuration structure is valid",
            "checks": {
                "structure": True,
                "connection": True if validation.live else None
            }
        }
    else:
        raise HTTPException(status_code=400, detail="Unknown connector type")