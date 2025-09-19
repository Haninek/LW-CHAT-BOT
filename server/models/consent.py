"""Consent model for SMS and other communications."""

from sqlalchemy import Column, String, DateTime
from datetime import datetime
from .base import Base


class Consent(Base):
    """Consent tracking for SMS and other communications."""
    __tablename__ = "consents"
    
    id = Column(String, primary_key=True, index=True)
    merchant_id = Column(String, nullable=True)
    phone = Column(String, nullable=False, index=True)
    channel = Column(String, nullable=False)  # sms, email, etc.
    status = Column(String, nullable=False)   # opt_in, opt_out
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)