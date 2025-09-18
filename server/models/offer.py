"""Offer model for generated funding offers."""

from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from core.database import Base


class Offer(Base):
    """Generated funding offer."""
    __tablename__ = "offers"
    
    id = Column(String, primary_key=True)
    deal_id = Column(String, ForeignKey("deals.id"), nullable=False, index=True)
    merchant_id = Column(String, ForeignKey("merchants.id"), nullable=True, index=True)  # Keep for compatibility
    payload_json = Column(Text, nullable=False)  # JSON offer details
    status = Column(String, default="pending")  # pending, accepted, declined, expired
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    deal = relationship("Deal", back_populates="offers")
    merchant = relationship("Merchant", back_populates="offers")