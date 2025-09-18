"""Document upload and management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime
import random

from core.database import get_db
from core.security import verify_partner_key
from core.config import settings
from models.deal import Deal
from models.document import Document
from models.metrics_snapshot import MetricsSnapshot

router = APIRouter(prefix="/api/docs", tags=["documents"])


class UploadDocumentRequest(BaseModel):
    deal_id: str
    document_type: str = "bank_statement"


@router.post("/bank/upload")
async def upload_bank_statements(
    deal_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Upload bank statements and persist to database for a deal."""
    
    # Verify deal exists
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Validate PDF files
    if len(files) != 3:
        raise HTTPException(status_code=400, detail="Exactly 3 PDF files required")
    
    for file in files:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="All files must be PDF format")
    
    uploaded_documents = []
    
    # Process each file
    for file in files:
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Create document record
        document_id = str(uuid.uuid4())
        document = Document(
            id=document_id,
            deal_id=deal_id,
            type="bank_statement",
            filename=file.filename,
            file_size=file_size,
            mime_type="application/pdf",
            file_data=file_content,
            parsing_status="pending",
            parsing_confidence=0.0,
            created_at=datetime.utcnow()
        )
        
        db.add(document)
        uploaded_documents.append({
            "document_id": document_id,
            "filename": file.filename,
            "file_size": file_size,
            "status": "uploaded"
        })
        
        # Reset file pointer for potential reuse
        await file.seek(0)
    
    db.commit()
    
    return {
        "status": "success",
        "deal_id": deal_id,
        "files_uploaded": len(files),
        "documents": uploaded_documents,
        "message": "Bank statements uploaded successfully. Use /api/deals/{deal_id}/metrics/recompute to calculate metrics."
    }


@router.get("/deal/{deal_id}")
async def get_deal_documents(
    deal_id: str,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Get all documents for a deal."""
    
    documents = db.query(Document).filter(Document.deal_id == deal_id).all()
    
    return [
        {
            "document_id": doc.id,
            "type": doc.type,
            "filename": doc.filename,
            "file_size": doc.file_size,
            "parsing_status": doc.parsing_status,
            "parsing_confidence": doc.parsing_confidence,
            "created_at": doc.created_at.isoformat()
        }
        for doc in documents
    ]