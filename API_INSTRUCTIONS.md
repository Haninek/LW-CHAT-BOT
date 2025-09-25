# UW Wizard - Comprehensive API Instructions

## 🎯 Overview

The UW Wizard API is a comprehensive FastAPI-powered underwriting platform designed for cash advance lending operations. This document provides detailed instructions for all API endpoints, request/response formats, and integration patterns.

## 🔐 Authentication

All API endpoints require bearer token authentication unless otherwise specified:

```bash
Authorization: Bearer <your-api-key>
```

**Development Mode**: Use `Bearer dev` for testing
**Production**: Obtain API keys from platform administration

## 🚀 Quick Start Workflow

### 1. Complete Cash Advance Analysis Pipeline

```bash
# Step 1: Upload and analyze bank statements
curl -X POST "http://localhost:8000/api/analysis/run" \
  -H "Authorization: Bearer dev" \
  -F "merchant_id=demo-merchant" \
  -F "deal_id=demo-deal" \
  -F "remit=daily" \
  -F "files=@statement1.pdf" \
  -F "files=@statement2.pdf" \
  -F "files=@statement3.pdf"

# Step 2: Review generated offers
# (Included in analysis response)

# Step 3: Accept an offer
curl -X POST "http://localhost:8000/api/deals/demo-deal/accept" \
  -H "Authorization: Bearer dev" \
  -H "Content-Type: application/json"
```

## 📊 Core API Endpoints

### Health & Status

#### GET /api/healthz
**Purpose**: Service health check
```bash
curl http://localhost:8000/api/healthz
```
**Response**:
```json
{
  "status": "OK",
  "service": "Underwriting Wizard API",
  "timestamp": "2025-09-25T14:30:00Z",
  "version": "1.0.0"
}
```

#### GET /api/readyz
**Purpose**: Service readiness with dependency checks
```bash
curl http://localhost:8000/api/readyz
```

### Merchant Management

#### GET /api/merchants/
**Purpose**: Search merchants by name, phone, or email
```bash
curl "http://localhost:8000/api/merchants/?search=ABC%20Company" \
  -H "Authorization: Bearer dev"
```

#### POST /api/merchants/create
**Purpose**: Create new merchant or reuse existing based on EIN/email/phone
```bash
curl -X POST "http://localhost:8000/api/merchants/create" \
  -H "Authorization: Bearer dev" \
  -H "Content-Type: application/json" \
  -d '{
    "legal_name": "ABC Company LLC",
    "phone": "+1234567890",
    "email": "contact@abccompany.com",
    "ein": "12-3456789",
    "state": "CA"
  }'
```

### Deal Management

#### POST /api/deals/start
**Purpose**: Create or find existing deal with merchant matching
```bash
curl -X POST "http://localhost:8000/api/deals/start" \
  -H "Authorization: Bearer dev" \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_hint": {
      "legal_name": "ABC Company LLC",
      "phone": "+1234567890"
    }
  }'
```

#### GET /api/public/deals
**Purpose**: List deals with filtering and search
```bash
# List all deals
curl "http://localhost:8000/api/public/deals" \
  -H "Authorization: Bearer dev"

# Filter by status
curl "http://localhost:8000/api/public/deals?status=open&limit=10" \
  -H "Authorization: Bearer dev"

# Search by merchant info
curl "http://localhost:8000/api/public/deals?q=ABC%20Company" \
  -H "Authorization: Bearer dev"
```

#### GET /api/public/deals/{deal_id}
**Purpose**: Get comprehensive deal details
```bash
curl "http://localhost:8000/api/public/deals/demo-deal" \
  -H "Authorization: Bearer dev"
```

### Document Processing

#### POST /api/documents/bank/upload
**Purpose**: Upload 3-12 bank statement PDFs with instant analysis
```bash
curl -X POST "http://localhost:8000/api/documents/bank/upload?merchant_id=demo&deal_id=test" \
  -H "Authorization: Bearer dev" \
  -F "files=@statement1.pdf" \
  -F "files=@statement2.pdf" \
  -F "files=@statement3.pdf"
```

**Requirements**:
- Minimum 3 PDF files (3+ months of statements)
- Maximum 12 PDF files (12 months max)
- Each file max 12MB
- Only PDF format accepted
- Automatic virus scanning

**Response**:
```json
{
  "ok": true,
  "documents": [
    {"id": "doc-123", "filename": "statement1.pdf"}
  ],
  "metrics": {
    "avg_monthly_revenue": 85000,
    "total_nsf_3m": 2,
    "avg_daily_balance_3m": 15000
  }
}
```

#### POST /api/documents/bank/parse
**Purpose**: Parse PDFs without storing (immediate analysis)
```bash
curl -X POST "http://localhost:8000/api/documents/bank/parse" \
  -F "files=@statement1.pdf" \
  -F "files=@statement2.pdf" \
  -F "files=@statement3.pdf"
```

### Statement Analysis

#### POST /api/statements/parse
**Purpose**: Parse stored statements for a deal
```bash
curl -X POST "http://localhost:8000/api/statements/parse?merchant_id=demo&deal_id=test" \
  -H "Authorization: Bearer dev" \
  -H "Idempotency-Key: unique-key-123"
```

#### GET /api/statements/monthly
**Purpose**: Get monthly summary metrics
```bash
curl "http://localhost:8000/api/statements/monthly?deal_id=test" \
  -H "Authorization: Bearer dev"
```

#### GET /api/statements/monthly.csv
**Purpose**: Download monthly data as CSV
```bash
curl "http://localhost:8000/api/statements/monthly.csv?deal_id=test" \
  -H "Authorization: Bearer dev" \
  -o monthly_data.csv
```

### Offer Generation

#### POST /api/offers/simple
**Purpose**: Generate cash advance offers directly from metrics
```bash
curl -X POST "http://localhost:8000/api/offers/simple" \
  -H "Content-Type: application/json" \
  -d '{
    "metrics": {
      "avg_monthly_revenue": 85000,
      "avg_daily_balance_3m": 15000,
      "total_nsf_3m": 2,
      "total_days_negative_3m": 5
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "offers": [
      {
        "id": "offer-123",
        "tier": 1,
        "type": "Cash Advance",
        "amount": 68000,
        "factor": 0.8,
        "fee": 1.12,
        "payback_amount": 76160,
        "term_days": 120,
        "daily_payment": 634,
        "risk_score": 0.3,
        "qualification_score": 85
      }
    ],
    "underwriting_decision": "approved"
  }
}
```

#### POST /api/offers/
**Purpose**: Generate offers for specific deal based on stored metrics
```bash
curl -X POST "http://localhost:8000/api/offers/" \
  -H "Authorization: Bearer dev" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-offer-key" \
  -d '{
    "deal_id": "demo-deal"
  }'
```

### Advanced Analysis Pipeline

#### POST /api/analysis/run
**Purpose**: Complete PDF→analysis→offers→risk assessment pipeline
```bash
curl -X POST "http://localhost:8000/api/analysis/run" \
  -H "Authorization: Bearer dev" \
  -F "merchant_id=demo" \
  -F "deal_id=test" \
  -F "remit=daily" \
  -F "files=@statement1.pdf" \
  -F "files=@statement2.pdf" \
  -F "files=@statement3.pdf"
```

**Response**:
```json
{
  "ok": true,
  "monthly_rows": [...],
  "risk": {
    "eligibility": "approve",
    "risk_score": 0.25,
    "reasons": ["Strong revenue pattern", "Low NSF count"]
  },
  "cash_pnl": {...},
  "offers": [...],
  "snapshot": {...},
  "downloads": {
    "clean_scrub_pdf_path": "/tmp/CLEAN_SCRUB_SNAPSHOT.pdf"
  }
}
```

### Background Checks

#### POST /api/background/check
**Purpose**: Initiate comprehensive background verification
```bash
curl -X POST "http://localhost:8000/api/background/check" \
  -H "Authorization: Bearer dev" \
  -H "Content-Type: application/json" \
  -d '{
    "deal_id": "demo-deal",
    "ssn": "123-45-6789",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

#### GET /api/background/jobs/{job_id}
**Purpose**: Check background verification status
```bash
curl "http://localhost:8000/api/background/jobs/job-123" \
  -H "Authorization: Bearer dev"
```

### E-Signature Integration

#### POST /api/sign/send
**Purpose**: Send documents for electronic signature
```bash
curl -X POST "http://localhost:8000/api/sign/send" \
  -H "Authorization: Bearer dev" \
  -H "Content-Type: application/json" \
  -d '{
    "deal_id": "demo-deal",
    "signer_email": "customer@example.com",
    "signer_name": "John Doe",
    "document_name": "Cash Advance Agreement"
  }'
```

### SMS Campaign Management

#### POST /api/sms/cherry/send
**Purpose**: Send SMS campaigns with rate limiting (2000/min per tenant)
```bash
curl -X POST "http://localhost:8000/api/sms/cherry/send" \
  -H "Authorization: Bearer dev" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890",
    "message": "Your funding application has been approved!",
    "tenant_id": "demo-tenant"
  }'
```

## 🔧 Advanced Features

### Idempotency Protection

Critical POST endpoints support idempotency to prevent duplicate operations:

```bash
curl -X POST "http://localhost:8000/api/offers/" \
  -H "Authorization: Bearer dev" \
  -H "Idempotency-Key: unique-operation-123" \
  -H "Content-Type: application/json" \
  -d '{"deal_id": "demo-deal"}'
```

**Protected Endpoints**:
- `/api/statements/parse`
- `/api/offers/`
- `/api/documents/bank/upload`
- All deal action endpoints

### Rate Limiting

**SMS**: 2000 messages/minute per tenant
**API**: Standard rate limits with graceful degradation

### Error Handling

All endpoints return consistent error formats:

```json
{
  "detail": "Descriptive error message",
  "error_code": "VALIDATION_ERROR",
  "status_code": 400
}
```

### File Upload Requirements

**Bank Statements**:
- Format: PDF only
- Size: Max 12MB per file
- Count: 3-12 files (months)
- Virus scanning: Automatic
- Analysis: Immediate upon upload

## 🚨 Compliance & Security

### California Compliance
- Automatic regulatory requirement enforcement
- 200-day maximum term limit enforcement
- Fee cap validation
- Risk scoring with violation tracking

### Security Features
- HMAC webhook verification
- Encrypted connector configurations
- Rate limiting with memory fallback
- Comprehensive audit trail

### Underwriting Guardrails
- Multi-factor risk assessment
- Automated approval/decline/manual review workflows
- Deal term validation for regulatory compliance
- California-specific underwriting rules

## 📈 Response Formats

### Success Response Pattern
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ }
}
```

### Error Response Pattern
```json
{
  "detail": "Error description",
  "status_code": 400,
  "error_type": "VALIDATION_ERROR"
}
```

### Pagination Pattern
```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "limit": 50
}
```

## 🧪 Testing & Development

### Health Check Sequence
```bash
# 1. Basic health
curl http://localhost:8000/api/healthz

# 2. Service readiness
curl http://localhost:8000/api/readyz

# 3. AI service health
curl http://localhost:8000/api/analysis/llm-health
```

### Complete Test Workflow
```bash
# 1. Create merchant
MERCHANT=$(curl -X POST "http://localhost:8000/api/merchants/create" \
  -H "Authorization: Bearer dev" \
  -H "Content-Type: application/json" \
  -d '{"legal_name": "Test Company", "phone": "+1234567890"}')

# 2. Start deal
DEAL=$(curl -X POST "http://localhost:8000/api/deals/start" \
  -H "Authorization: Bearer dev" \
  -H "Content-Type: application/json" \
  -d '{"merchant_hint": {"legal_name": "Test Company"}}')

# 3. Run full analysis
curl -X POST "http://localhost:8000/api/analysis/run" \
  -H "Authorization: Bearer dev" \
  -F "merchant_id=test-merchant" \
  -F "deal_id=test-deal" \
  -F "files=@statements.pdf"
```

## 🔗 Integration Patterns

### Webhook Integration
Set up webhooks for e-signature completion and SMS responses:

```bash
# Configure webhook endpoints
POST /api/sign/webhook    # DocuSign/Dropbox Sign
POST /api/sms/cherry/webhook  # SMS responses
```

### External Service Integration
Configure secure integrations through the connector system:

```bash
# Save connector configuration
curl -X POST "http://localhost:8000/api/connectors/" \
  -H "Authorization: Bearer dev" \
  -d '{
    "tenant_id": "demo",
    "name": "docusign",
    "config": {"api_key": "encrypted_key"}
  }'
```

---

**📞 Support**: For integration assistance, refer to interactive API documentation at `/docs` when running in development mode.