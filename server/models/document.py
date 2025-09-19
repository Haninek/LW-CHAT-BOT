"""Document model for bank statements and other files."""

from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey, LargeBinary
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base


class Document(Base):
    """Document entity for bank statements and other uploaded files."""
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True, index=True)
    deal_id = Column(String, ForeignKey("deals.id"), nullable=False, index=True)
    type = Column(String, nullable=False, index=True)  # bank_statement, tax_return, voided_check, etc.
    filename = Column(String, nullable=False)
    file_size = Column(Integer)
    mime_type = Column(String)
    file_data = Column(LargeBinary)  # Store PDF/file content directly (deprecated)
    
    # S3 storage fields (new approach)
    storage_key = Column(String, nullable=True)  # S3 object key
    bucket = Column(String, nullable=True)       # S3 bucket name
    checksum = Column(String, nullable=True)     # SHA256 checksum
    
    parsed_data_json = Column(Text)  # Extracted data from parsing
    parsing_status = Column(String, default="pending")  # pending, completed, failed
    parsed = Column(String, default=False)       # Legacy field
    parsing_confidence = Column(Float, default=0.0)  # 0.0 to 1.0
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    deal = relationship("Deal", back_populates="documents")