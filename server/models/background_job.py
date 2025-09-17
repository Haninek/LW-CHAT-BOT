"""Background job model for CLEAR checks."""

from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from datetime import datetime

from core.database import Base


class BackgroundJob(Base):
    """Background check job."""
    __tablename__ = "background_jobs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    merchant_id = Column(String, ForeignKey("merchants.id"), nullable=False, index=True)
    status = Column(String, default="pending")  # pending, running, completed, failed
    result_json = Column(Text)  # JSON result data
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    merchant = relationship("Merchant", back_populates="background_jobs")