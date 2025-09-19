"""Agreement model for contracts."""

from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class Agreement(Base):
    """Contract agreement via DocuSign/Dropbox Sign."""
    __tablename__ = "agreements"
    
    id = Column(String, primary_key=True)
    merchant_id = Column(String, ForeignKey("merchants.id"), nullable=False, index=True)
    provider = Column(String, nullable=False)  # docusign, dropbox_sign, local
    status = Column(String, default="pending")  # pending, sent, completed, declined, voided
    envelope_id = Column(String)  # External provider envelope ID
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Relationships
    merchant = relationship("Merchant", back_populates="agreements")