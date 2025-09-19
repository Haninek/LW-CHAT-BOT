"""Tenant and Mapping models for multi-tenant architecture."""

from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class Tenant(Base):
    """Tenant entity for multi-tenant system."""
    __tablename__ = "tenants"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    mappings = relationship("Mapping", back_populates="tenant", cascade="all, delete-orphan")


class Mapping(Base):
    """Field mapping configuration for CRM integration."""
    __tablename__ = "mappings"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String, nullable=False)  # e.g. "Salesforce Lead Mapping v2"
    version = Column(Integer, default=1)
    status = Column(String, default="draft")  # draft, active, archived
    spec_json = Column(Text, nullable=False)  # JSON mapping specification
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="mappings")