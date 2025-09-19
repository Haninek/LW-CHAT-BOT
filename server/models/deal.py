"""Deal model for funding opportunities."""

from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base


class Deal(Base):
    """Deal entity - central funding opportunity that everything attaches to."""
    __tablename__ = "deals"
    
    id = Column(String, primary_key=True, index=True)
    merchant_id = Column(String, ForeignKey("merchants.id"), nullable=False, index=True)
    status = Column(String, default="open", nullable=False)
    funding_amount = Column(Float)  # If funded
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Relationships - everything should attach to deal_id per roadmap
    merchant = relationship("Merchant", back_populates="deals")
    documents = relationship("Document", back_populates="deal", cascade="all, delete-orphan")
    metrics_snapshots = relationship("MetricsSnapshot", back_populates="deal", cascade="all, delete-orphan")
    offers = relationship("Offer", back_populates="deal", cascade="all, delete-orphan")
    # TODO: Update these models to use deal_id instead of merchant_id
    # agreements = relationship("Agreement", back_populates="deal", cascade="all, delete-orphan")
    # background_jobs = relationship("BackgroundJob", back_populates="deal", cascade="all, delete-orphan")
    # events = relationship("Event", back_populates="deal", cascade="all, delete-orphan")