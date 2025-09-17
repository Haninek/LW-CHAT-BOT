"""Merchant and field state models."""

from sqlalchemy import Column, String, DateTime, Integer, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from core.database import Base


class Merchant(Base):
    """Merchant entity with business information."""
    __tablename__ = "merchants"
    
    id = Column(String, primary_key=True, index=True)
    legal_name = Column(String, nullable=False)
    dba = Column(String)
    phone = Column(String, index=True)
    email = Column(String, index=True)
    ein = Column(String, index=True)
    address = Column(String)
    city = Column(String)
    state = Column(String)
    zip = Column(String)
    status = Column(String, default="new")  # new, existing, active, inactive
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    field_states = relationship("FieldState", back_populates="merchant", cascade="all, delete-orphan")
    intakes = relationship("Intake", back_populates="merchant", cascade="all, delete-orphan")
    offers = relationship("Offer", back_populates="merchant", cascade="all, delete-orphan")
    background_jobs = relationship("BackgroundJob", back_populates="merchant", cascade="all, delete-orphan")
    agreements = relationship("Agreement", back_populates="merchant", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="merchant", cascade="all, delete-orphan")


class FieldState(Base):
    """Field state tracking for ask-only-what's-missing logic."""
    __tablename__ = "field_states"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    merchant_id = Column(String, ForeignKey("merchants.id"), nullable=False, index=True)
    field_id = Column(String, nullable=False)  # e.g. "business.legal_name", "owner.ssn_last4"
    value = Column(Text)
    source = Column(String, nullable=False)  # intake, crm, manual, plaid, etc.
    last_verified_at = Column(DateTime, default=datetime.utcnow)
    confidence = Column(Float, default=1.0)  # 0.0 to 1.0
    
    # Relationships
    merchant = relationship("Merchant", back_populates="field_states")
    
    # Unique constraint on merchant + field
    __table_args__ = (
        {"extend_existing": True},
    )