"""Event model for activity tracking."""

from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from datetime import datetime

from core.database import Base


class Event(Base):
    """System events for activity tracking."""
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(String, nullable=False, index=True)  # e.g. merchant.created, offer.generated
    merchant_id = Column(String, ForeignKey("merchants.id"), index=True)
    data_json = Column(Text)  # JSON event data
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    merchant = relationship("Merchant", back_populates="events")