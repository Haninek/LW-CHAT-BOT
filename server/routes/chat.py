"""OpenAI-powered funding assistant chat endpoint."""

import os
import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel

from core.database import get_db
from models.deal import Deal
from models.merchant import Merchant
from models.metrics_snapshot import MetricsSnapshot

# OpenAI integration
try:
    from openai import OpenAI
    _OPENAI = OpenAI(api_key=os.getenv("OPENAI_API_KEY")) if os.getenv("OPENAI_API_KEY") else None
except Exception:
    _OPENAI = None

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_history: List[ChatMessage] = []
    merchant_id: Optional[str] = None
    deal_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    suggested_actions: List[str] = []
    requires_documents: bool = False
    next_steps: List[str] = []

SYSTEM_PROMPT = """You are Chad, an AI funding assistant for a business lending platform. You help business owners:

1. **Apply for funding** - Guide them through merchant registration and deal creation
2. **Upload documents** - Help with bank statement uploads and document requirements  
3. **Understand analysis** - Explain financial health reports and risk assessments
4. **Review funding offers** - Help them understand loan terms and options
5. **Complete applications** - Guide through background checks and contract signing

**Available Actions You Can Suggest:**
- Upload bank statements (3+ months required)
- Start a new funding application 
- Review financial analysis results
- View available funding offers
- Complete background verification
- Sign funding agreements

**Key Platform Features:**
- Bank statement analysis using AI
- Real-time underwriting decisions
- Flexible funding offers based on cash flow
- Integrated background checks
- Digital contract signing

Be helpful, professional, and guide them step-by-step. If they need to upload documents or take specific actions, clearly explain what they need to do. Always prioritize getting them the funding they need for their business.

If they ask about technical details or specific amounts, explain that you'll need to analyze their financial documents to provide accurate information.
"""

@router.post("/message")
async def chat_message(
    request: ChatRequest,
    db: Session = Depends(get_db)
) -> ChatResponse:
    """Send a message to the AI funding assistant."""
    
    if not _OPENAI:
        return ChatResponse(
            response="I'm sorry, the AI assistant is currently unavailable. Please contact support for assistance with your funding application.",
            suggested_actions=["Contact Support"],
            next_steps=["Email support@fundingplatform.com for immediate assistance"]
        )
    
    try:
        # Build context about merchant/deal if provided
        context = ""
        if request.merchant_id and request.deal_id:
            # Get merchant and deal info
            merchant = db.get(Merchant, request.merchant_id)
            deal = db.get(Deal, request.deal_id)
            
            if merchant and deal:
                context += f"\\nMerchant: {merchant.legal_name}"
                context += f"\\nDeal Status: {deal.status}"
                context += f"\\nFunding Amount: ${deal.funding_amount:,.2f}" if deal.funding_amount else ""
                
                # Get latest metrics if available
                latest_metrics = db.query(MetricsSnapshot).filter(
                    MetricsSnapshot.deal_id == request.deal_id
                ).order_by(MetricsSnapshot.created_at.desc()).first()
                
                if latest_metrics:
                    context += f"\\nMonthly Revenue: ${latest_metrics.avg_monthly_revenue:,.2f}" if latest_metrics.avg_monthly_revenue else ""
                    context += f"\\nAverage Daily Balance: ${latest_metrics.avg_daily_balance_3m:,.2f}" if latest_metrics.avg_daily_balance_3m else ""
                    context += "\\n[Financial analysis available]"
        
        # Prepare conversation for OpenAI
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + context}
        ]
        
        # Add conversation history
        for msg in request.conversation_history[-10:]:  # Last 10 messages for context
            messages.append({"role": msg.role, "content": msg.content})
        
        # Add current user message
        messages.append({"role": "user", "content": request.message})
        
        # Call OpenAI
        response = _OPENAI.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        
        ai_response = response.choices[0].message.content
        
        # Analyze response to suggest actions
        suggested_actions = []
        next_steps = []
        requires_documents = False
        
        response_lower = ai_response.lower()
        
        if "bank statement" in response_lower or "financial document" in response_lower:
            suggested_actions.append("Upload Bank Statements")
            requires_documents = True
            next_steps.append("Upload 3+ months of bank statements")
        
        if "application" in response_lower or "apply" in response_lower:
            suggested_actions.append("Start Application")
            next_steps.append("Begin your funding application")
        
        if "offer" in response_lower or "funding" in response_lower:
            suggested_actions.append("View Offers")
            next_steps.append("Review available funding options")
        
        if "background" in response_lower or "verification" in response_lower:
            suggested_actions.append("Complete Verification")
            next_steps.append("Complete background verification process")
        
        return ChatResponse(
            response=ai_response,
            suggested_actions=suggested_actions,
            requires_documents=requires_documents,
            next_steps=next_steps
        )
        
    except Exception as e:
        return ChatResponse(
            response="I apologize, but I'm having trouble processing your request right now. Let me help you with the basics: Would you like to start a funding application or upload financial documents?",
            suggested_actions=["Start Application", "Upload Documents"],
            next_steps=["I can guide you through either process step by step."]
        )

@router.post("/analyze-document")
async def analyze_document(
    file: UploadFile = File(...),
    message: str = Form("Please analyze this document"),
    merchant_id: Optional[str] = Form(None),
    deal_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
) -> ChatResponse:
    """Analyze an uploaded document and provide AI insights."""
    
    if not _OPENAI:
        return ChatResponse(
            response="Document analysis is currently unavailable. Please upload your documents through the main upload section.",
            suggested_actions=["Upload via Documents Section"]
        )
    
    try:
        # Read file content
        content = await file.read()
        
        if file.content_type == "application/pdf":
            # Extract text from PDF
            pdf_text = ""
            try:
                import io
                import pdfplumber
                
                with pdfplumber.open(io.BytesIO(content)) as pdf:
                    # Extract text from first few pages (limit for token count)
                    pages_to_read = min(3, len(pdf.pages))
                    for i in range(pages_to_read):
                        page_text = pdf.pages[i].extract_text()
                        if page_text:
                            pdf_text += page_text + "\\n\\n"
                
                # Limit text length for OpenAI (roughly 2000 characters)
                if len(pdf_text) > 2000:
                    pdf_text = pdf_text[:2000] + "... [truncated]"
                    
            except Exception as pdf_error:
                print(f"PDF extraction error: {pdf_error}")
                pdf_text = "[Unable to extract text from PDF]"
            
            # Analyze the document with OpenAI
            if pdf_text and pdf_text.strip() and pdf_text != "[Unable to extract text from PDF]":
                try:
                    analysis_prompt = f"""Analyze this document and provide helpful insights for a business funding application. 

Document filename: {file.filename}
Document content (first few pages):
{pdf_text}

Please provide:
1. What type of document this appears to be
2. Key information extracted
3. How this relates to business funding/lending
4. What the user should do next with this document
5. Any red flags or important items to note

Be helpful and specific about funding applications."""

                    response = _OPENAI.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[
                            {"role": "system", "content": "You are Chad, an AI funding assistant. Analyze documents to help with business lending applications."},
                            {"role": "user", "content": analysis_prompt}
                        ],
                        temperature=0.7,
                        max_tokens=600
                    )
                    
                    ai_analysis = response.choices[0].message.content
                    
                    # Determine suggested actions based on document type
                    suggested_actions = []
                    next_steps = []
                    requires_documents = False
                    
                    analysis_lower = ai_analysis.lower()
                    filename_lower = file.filename.lower()
                    
                    if "bank" in analysis_lower or "statement" in analysis_lower or "bank" in filename_lower:
                        suggested_actions = ["Upload for Full Bank Analysis", "View Financial Metrics"]
                        next_steps = ["Use the dedicated bank statement upload for complete analysis"]
                        requires_documents = True
                    elif "contract" in analysis_lower or "agreement" in filename_lower:
                        suggested_actions = ["Review Contract Terms", "Get Legal Guidance"]
                        next_steps = ["Review the contract terms with your legal advisor"]
                    elif "financial" in analysis_lower or "income" in analysis_lower:
                        suggested_actions = ["Upload Financial Documents", "Complete Application"]
                        next_steps = ["Add this to your funding application documents"]
                        requires_documents = True
                    else:
                        suggested_actions = ["Get Document Guidance", "Continue Application"]
                        next_steps = ["Let me know if you need help with other documents"]
                    
                    return ChatResponse(
                        response=ai_analysis,
                        suggested_actions=suggested_actions,
                        requires_documents=requires_documents,
                        next_steps=next_steps
                    )
                    
                except Exception as openai_error:
                    print(f"OpenAI analysis error: {openai_error}")
                    # Fallback response
                    pass
            
            # Fallback response if text extraction failed or OpenAI error
            if "statement" in file.filename.lower() or "bank" in file.filename.lower():
                response_text = f"I can see you've uploaded '{file.filename}' which appears to be a bank statement. While I couldn't fully analyze the content, I recommend uploading this through our dedicated bank statement analysis system for complete financial insights including cash flow analysis, transaction categorization, and funding recommendations."
                suggested_actions = ["Upload to Bank Analysis", "Get Help"]
                next_steps = ["Use the document upload section for detailed bank statement analysis"]
                requires_documents = True
            elif "contract" in file.filename.lower() or "agreement" in file.filename.lower():
                response_text = f"I can see you've uploaded '{file.filename}' which appears to be a contract or agreement. This type of document is important for your funding application. Make sure to review all terms carefully and have it reviewed by legal counsel if needed."
                suggested_actions = ["Review Terms", "Legal Review"]
                next_steps = ["Review contract terms and conditions carefully"]
                requires_documents = False
            else:
                response_text = f"I can see you've uploaded '{file.filename}'. While I couldn't fully analyze the content, I can help guide you on what to do with this document for your funding application. What specific information are you looking for?"
                suggested_actions = ["Get Document Guidance", "Upload Different Format"]
                next_steps = ["Tell me what you'd like to know about this document"]
                requires_documents = False
        else:
            response_text = f"I can see you've uploaded '{file.filename}'. For the best analysis, our system works best with PDF documents. Would you like guidance on what documents we need for your funding application?"
            suggested_actions = ["Document Requirements", "Convert to PDF"]
            next_steps = ["Learn about required documents for funding"]
            requires_documents = True
        
        return ChatResponse(
            response=response_text,
            suggested_actions=suggested_actions,
            requires_documents=requires_documents,
            next_steps=next_steps
        )
        
    except Exception as e:
        print(f"Document analysis error: {e}")
        return ChatResponse(
            response="I had trouble analyzing that document. For the most accurate analysis, please use our dedicated document upload system. I can guide you through the process if you'd like.",
            suggested_actions=["Upload Guidance", "Document Help"],
            next_steps=["Let me walk you through the document upload process"]
        )

@router.get("/suggestions")
async def get_suggestions(
    merchant_id: Optional[str] = None,
    deal_id: Optional[str] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get contextual suggestions based on merchant/deal status."""
    
    suggestions = {
        "quick_actions": [
            "How do I apply for funding?",
            "What documents do I need?",
            "How long does approval take?",
            "What are your rates?"
        ],
        "help_topics": [
            "Application Process",
            "Document Requirements", 
            "Funding Options",
            "Approval Timeline"
        ]
    }
    
    if merchant_id and deal_id:
        deal = db.get(Deal, request.deal_id)
        if deal:
            if deal.status == "open":
                suggestions["contextual"] = [
                    "Upload your bank statements",
                    "Complete your application",
                    "What's the next step?"
                ]
            elif deal.status == "offer":
                suggestions["contextual"] = [
                    "Explain my funding offers",
                    "What are the terms?",
                    "How do I accept an offer?"
                ]
            elif deal.status == "accepted":
                suggestions["contextual"] = [
                    "What's next after acceptance?",
                    "When will I receive funds?",
                    "Complete verification process"
                ]
    
    return suggestions
