# UW Wizard - Automated Lending Operations Platform

> **Pilot-Ready:** Comprehensive multi-tenant lending platform with AI-powered underwriting, SMS campaigns, and deal management.

## 🎯 Overview

UW Wizard is a production-ready automated lending operations platform featuring:

- **Chad AI Assistant** - Intelligent funding representative chatbot
- **Deal-Centric Architecture** - Multi-tenant isolation with comprehensive audit trails  
- **Underwriting Automation** - California-compliant risk assessment and offer generation
- **Document Processing** - Secure bank statement analysis with antivirus scanning
- **SMS Campaign Management** - Rate-limited bulk messaging with compliance controls
- **E-Signature Integration** - DocuSign/Dropbox Sign with webhook verification
- **Background Verification** - CLEAR, NYSCEF, and business ownership checks

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- Redis (optional - memory fallback included)

### Installation

```bash
# Clone and setup
git clone <repository>
cd uw-wizard

# Install backend dependencies
cd server
pip install -r requirements.txt

# Install frontend dependencies  
cd ../web
npm install

# Start services
cd ../server && uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
cd ../web && npm run dev
```

Access the application:
- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:8000  
- **API Docs**: http://localhost:8000/docs

## 📋 API Reference

### Authentication
All API requests require these headers:
```bash
X-Tenant-ID: <tenant_identifier>
Idempotency-Key: <unique_request_key>
Content-Type: application/json
```

### Core Endpoints

#### Deal Management
```bash
# Start a new deal or find existing
POST /api/deals/start
{
  "merchant_hint": {
    "phone": "+19735550188",
    "legal_name": "Maple Deli LLC"
  },
  "create_if_missing": true
}
```

#### Intake Process
```bash
# Initialize intake session
POST /api/intake/start  
{
  "merchant_id": "mer_123",
  "deal_id": "deal_456"
}

# Submit intake answers
POST /api/intake/answer
{
  "merchant_id": "mer_123", 
  "deal_id": "deal_456",
  "source": "intake",
  "answers": [
    {
      "field_id": "owner.ssn_last4",
      "value": "1234"
    }
  ]
}
```

#### Document Upload
```bash
# Upload exactly 3 PDF bank statements
POST /api/documents/bank/upload?merchant_id=mer_123&deal_id=deal_456
Content-Type: multipart/form-data

files: [statement1.pdf, statement2.pdf, statement3.pdf]
```

#### Offer Generation  
```bash
# Generate underwriting offers
POST /api/deals/{deal_id}/offers
{
  "avg_monthly_revenue": 80000,
  "avg_daily_balance_3m": 12000,
  "total_nsf_3m": 1,
  "total_days_negative_3m": 2
}
```

#### Background Checks
```bash
# Run comprehensive background verification
POST /api/background/check
{
  "merchant_id": "mer_123",
  "deal_id": "deal_456", 
  "person": {
    "first_name": "John",
    "last_name": "Smith",
    "date_of_birth": "1980-01-01",
    "ssn_last4": "1234",
    "email": "john@example.com",
    "phone": "+19735550188"
  },
  "business": {
    "legal_name": "Maple Deli LLC",
    "ein": "12-3456789", 
    "state": "CA",
    "formation_date": "2020-01-01"
  }
}

# Check background verification status
GET /api/background/jobs/{job_id}
```

#### E-Signatures
```bash
# Send document for signature  
POST /api/sign/send?deal_id=deal_456&recipient_email=owner@example.com&force=false

# Webhook endpoint (configured with provider)
POST /api/sign/webhook
```

#### SMS Campaigns
```bash
# Send SMS campaign (rate limited: 2000/minute/tenant)
POST /api/sms/cherry/send
{
  "campaignName": "Pilot Campaign",
  "messages": [
    {
      "to": "+19735550188",
      "body": "Hi from UW Wizard",
      "merchant_id": "mer_123"
    }
  ]
}

# Handle inbound SMS and STOP commands
POST /api/sms/cherry/webhook  
{
  "type": "inbound",
  "from": "+19735550188", 
  "text": "STOP"
}
```

### Response Format

#### Success Response
```json
{
  "status": "success",
  "data": { ... },
  "timestamp": "2025-09-19T18:42:00Z"
}
```

#### Error Response  
```json
{
  "error": "Validation failed",
  "detail": "Missing required field: merchant_id",
  "timestamp": "2025-09-19T18:42:00Z"
}
```

#### Underwriting Response
```json
{
  "offers": [
    {
      "id": "offer_789",
      "tier": 1,
      "amount": 64000,
      "factor": 0.8,
      "fee": 1.15,
      "payback_amount": 73600,
      "term_days": 90,
      "daily_payment": 818,
      "risk_score": 0.65,
      "underwriting_decision": "approved",
      "terms_compliant": true,
      "rationale": "Based on $80,000/month revenue, 90-day term"
    }
  ],
  "underwriting_decision": "approved",
  "underwriting_summary": {
    "approved": true,
    "risk_score": 0.65,
    "ca_compliant": true,
    "max_offer_amount": 100000
  }
}
```

## 🔒 Security Features

### Idempotency Protection
- All POST requests protected with `Idempotency-Key` headers
- Request body hashing prevents payload tampering
- Redis-first with in-memory fallback for high availability
- Automatic response caching and replay

### Rate Limiting
- **SMS**: 2000 messages per minute per tenant
- **API**: Configurable per-endpoint limits
- Token bucket algorithm with sliding window
- Memory fallback when Redis unavailable

### Webhook Security
- HMAC signature verification (HMAC-SHA256)
- DocuSign and Dropbox Sign support
- Webhook deduplication prevents replay attacks
- Required signatures (no debug bypass)

### Data Protection
- AES-256 encryption for sensitive data
- Antivirus scanning for uploaded documents  
- Private document storage with presigned URLs
- Comprehensive audit logging

## 🏗️ Architecture

### Deal-Centric Design
- All operations attach to `deal_id` for proper isolation
- Multi-tenant architecture with `tenant_id` tracking
- Comprehensive event audit trail
- Status progression: `open` → `processing` → `approved/declined`

### Underwriting Guardrails
- **California Compliance**: Regulatory requirement enforcement
- **Risk Scoring**: Multi-factor assessment with violation tracking
- **Automated Workflows**: Approval/decline/manual review routing
- **Deal Term Validation**: Fee caps, term limits, amount restrictions

### Fallback Systems
- **Database**: SQLite → PostgreSQL
- **Cache**: Memory → Redis  
- **Storage**: Local filesystem → S3
- **Rate Limiting**: Memory → Redis
- **Idempotency**: Memory → Redis

## 🧪 Testing

### Smoke Test Sequence
```bash
# Health check
curl -s http://localhost:8000/api/healthz

# Start deal (save MERCHANT_ID and DEAL_ID from response)
curl -s -X POST http://localhost:8000/api/deals/start \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: T1" \
  -H "Idempotency-Key: k1" \
  -d '{"merchant_hint":{"phone":"+19735550188","legal_name":"Maple Deli LLC"},"create_if_missing":true}'

# Submit intake answer  
curl -s -X POST http://localhost:8000/api/intake/answer \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: T1" \
  -H "Idempotency-Key: k2" \
  -d '{"merchant_id":"$MID","deal_id":"$DID","source":"intake","answers":[{"field_id":"owner.ssn_last4","value":"1234"}]}'

# Upload 3 PDFs
curl -s -X POST "http://localhost:8000/api/documents/bank/upload?merchant_id=$MID&deal_id=$DID" \
  -F "files=@one.pdf" -F "files=@two.pdf" -F "files=@three.pdf" \
  -H "X-Tenant-ID: T1" -H "Idempotency-Key: k3"

# Generate offers
curl -s -X POST "http://localhost:8000/api/deals/$DID/offers" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: T1" \
  -H "Idempotency-Key: k4" -d "{}"

# Test idempotency (repeat any request with same key → same response)
```

## 📊 Monitoring

### Health Endpoints
- `GET /api/healthz` - Basic health check
- `GET /api/readyz` - Readiness with dependency status

### Logging
- Structured JSON logs with correlation IDs
- Request/response tracking  
- Performance metrics
- Error alerting

### Metrics  
- Deal conversion rates
- Underwriting approval rates
- SMS delivery rates
- API response times
- Background check success rates

## 🚀 Deployment

### Environment Variables
```bash
# Required
APP_NAME=UW Wizard
PORT=8000
DATABASE_URL=postgresql://user:pass@host:5432/uwizard

# Optional (graceful fallbacks)
REDIS_URL=redis://localhost:6379/0
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=uwizard-private
DOCUSIGN_WEBHOOK_SECRET=your-webhook-secret
CHERRY_API_KEY=your-sms-api-key
```

### Production Checklist
- [ ] Set `DEBUG=false`
- [ ] Configure real Redis URL
- [ ] Set up PostgreSQL database
- [ ] Configure S3 bucket with proper IAM
- [ ] Set webhook secrets for e-signature providers
- [ ] Configure SMS provider API keys
- [ ] Set up monitoring and alerting
- [ ] Review CORS origins for security
- [ ] Test all idempotency scenarios
- [ ] Verify rate limiting enforcement

## 📞 Support

### Issues & Questions
- Create GitHub issues for bugs or feature requests
- Include request correlation ID for faster debugging
- Provide minimal reproduction steps

### API Integration Help
- Review API documentation at `/docs` endpoint  
- Check request/response examples above
- Verify header requirements (Tenant-ID, Idempotency-Key)
- Test with provided smoke test sequence

---

**UW Wizard** - Powering the future of automated lending operations with security, compliance, and reliability at scale.