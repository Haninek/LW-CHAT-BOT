"""Offer model for generated funding offers."""

from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from core.database import Base


class Offer(Base):
    """Generated funding offer."""
    __tablename__ = "offers"
    
    id = Column(String, primary_key=True)
    merchant_id = Column(String, ForeignKey("merchants.id"), nullable=False, index=True)
    payload_json = Column(Text, nullable=False)  # JSON offer details
    status = Column(String, default="pending")  # pending, accepted, declined, expired
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    merchant = relationship("Merchant", back_populates="offers")