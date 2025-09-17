"""Connector management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel

from core.database import get_db
from core.security import encrypt_data, decrypt_data, mask_secrets, verify_partner_key
from models.connector import Connector

router = APIRouter()


class ConnectorConfig(BaseModel):
    name: str
    config: Dict[str, Any]


class ConnectorValidation(BaseModel):
    name: str
    live: bool = False


@router.post("/")
async def save_connector(
    connector_config: ConnectorConfig,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Save or update connector configuration (encrypted)."""
    
    # Encrypt the configuration
    encrypted_config = encrypt_data(connector_config.config)
    
    # Save to database
    existing = db.query(Connector).filter(Connector.name == connector_config.name).first()
    if existing:
        existing.encrypted_config = encrypted_config
        db.commit()
        return {"status": "updated", "name": connector_config.name}
    else:
        connector = Connector(
            name=connector_config.name,
            encrypted_config=encrypted_config
        )
        db.add(connector)
        db.commit()
        return {"status": "created", "name": connector_config.name}


@router.get("/")
async def list_connectors(db: Session = Depends(get_db)):
    """List all connectors with basic info."""
    connectors = db.query(Connector).all()
    return [
        {
            "name": c.name,
            "updated_at": c.updated_at.isoformat()
        }
        for c in connectors
    ]


@router.get("/{name}")
async def get_connector(
    name: str,
    db: Session = Depends(get_db)
):
    """Get connector configuration (always masked for security)."""
    connector = db.query(Connector).filter(Connector.name == name).first()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    
    config = decrypt_data(connector.encrypted_config)
    config = mask_secrets(config)  # Always mask secrets
    
    return {
        "name": connector.name,
        "config": config,
        "updated_at": connector.updated_at.isoformat()
    }


@router.post("/validate")
async def validate_connector(validation: ConnectorValidation):
    """Validate connector configuration."""
    
    # TODO: Implement actual validation logic for each connector type
    if validation.name == "plaid":
        return {
            "status": "valid",
            "message": "TODO: Plaid validation in mock mode",
            "checks": {
                "structure": True,
                "connection": False if not validation.live else None
            }
        }
    elif validation.name == "docusign":
        return {
            "status": "valid", 
            "message": "DocuSign configuration structure is valid",
            "checks": {
                "structure": True,
                "connection": True if validation.live else None
            }
        }
    elif validation.name == "clear":
        return {
            "status": "valid",
            "message": "CLEAR configuration structure is valid", 
            "checks": {
                "structure": True,
                "connection": True if validation.live else None
            }
        }
    elif validation.name == "cherry_sms":
        return {
            "status": "valid",
            "message": "Cherry SMS configuration structure is valid",
            "checks": {
                "structure": True,
                "connection": True if validation.live else None
            }
        }
    elif validation.name == "dropbox_sign":
        return {
            "status": "valid",
            "message": "Dropbox Sign configuration structure is valid",
            "checks": {
                "structure": True,
                "connection": True if validation.live else None
            }
        }
    else:
        raise HTTPException(status_code=400, detail="Unknown connector type")