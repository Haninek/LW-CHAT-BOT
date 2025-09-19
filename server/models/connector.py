"""Connector model for external service integrations."""

from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class Connector(Base):
    """External service connector configurations (encrypted, tenant-scoped)."""
    __tablename__ = "connectors"
    
    tenant_id = Column(String, ForeignKey("tenants.id"), primary_key=True, nullable=False, index=True)
    name = Column(String, primary_key=True, nullable=False)  # docusign, plaid, clear, cherry_sms, dropbox_sign
    encrypted_config = Column(Text, nullable=False)  # Fernet encrypted JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", backref="connectors")