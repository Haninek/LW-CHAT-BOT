"""Intake session model."""

from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class Intake(Base):
    """Intake session for merchant onboarding."""
    __tablename__ = "intakes"
    
    id = Column(String, primary_key=True)
    merchant_id = Column(String, ForeignKey("merchants.id"), nullable=False, index=True)
    status = Column(String, default="active")  # active, completed, abandoned
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    merchant = relationship("Merchant", back_populates="intakes")