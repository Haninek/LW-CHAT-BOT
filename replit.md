# UW Wizard - Underwriting Platform (Pilot Ready)

## Project Overview
A comprehensive multi-tenant automated lending operations platform featuring Chad (AI funding representative chatbot), SMS campaign management, professional templates, and modern responsive design. The platform implements "minimum automation" with a deal-centric architecture where all actions attach to deal_id rather than merchant_id, with comprehensive underwriting guardrails and California compliance requirements.

## Current Status
✅ **Pilot-ready deployment on Replit**
- Python FastAPI backend running on port 8000
- React frontend with Vite running on port 5000 
- Complete idempotency system with Redis fallback to memory
- Local storage fallback (no S3 required in dev)
- Comprehensive underwriting guardrails with CA compliance
- All critical POST routes protected with idempotency
- SMS rate limiting with in-memory fallback
- Webhook signature verification enforced
- Event standardization with data_json fields

## Architecture

### Backend: Python FastAPI (Port 8000)
- **Status**: ✅ Running successfully  
- **URL**: http://0.0.0.0:8000
- **Features**: Complete lending operations with underwriting, document processing, SMS campaigns, e-signatures
- **Security**: Idempotency protection, rate limiting, webhook verification
- **Database**: SQLite fallback with PostgreSQL production capability
- **Storage**: Local filesystem with S3 upgrade path

### Frontend: React + Vite (Port 5000) 
- **Status**: ✅ Configured for development
- **URL**: http://0.0.0.0:5000  
- **Purpose**: Modern responsive UI for Chad chatbot and deal management

## Core Features

### Deal-Centric Operations
- All actions attach to `deal_id` for proper multi-tenant isolation
- Comprehensive audit trail through Event system
- Status tracking: open → processing → approved/declined

### Underwriting Guardrails
- California compliance requirements enforced
- Risk scoring with multiple violation levels  
- Automated approval/decline/manual review workflows
- Deal term validation for regulatory compliance

### Document Processing
- Hardened 3-PDF bank statement upload with size/type validation
- Antivirus scanning with graceful fallback
- Automated metrics extraction and snapshot generation
- Private document storage with presigned access URLs

### SMS Campaign Management  
- Rate limiting: 2000 messages/minute per tenant
- Automatic STOP opt-out compliance
- Campaign tracking with delivery confirmation
- Consent management for regulatory compliance

### E-Signature Integration
- DocuSign and Dropbox Sign webhook support
- HMAC signature verification for security
- Background check gating (force override available)
- Contract completion tracking with audit events

### Background Checks
- CLEAR identity and criminal verification
- NYSCEF court records integration  
- Business ownership verification
- Flag-only results for compliance purposes

## Environment Configuration

### Development Defaults (Replit Ready)
```
APP_NAME=UW Wizard
DEBUG=true
PORT=8000
DATABASE_URL=sqlite:///./uwizard.db
REDIS_URL=memory://local
CORS_ORIGINS=*
MOCK_MODE=true
```

### Production Secrets (Optional)
```
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=uwizard-private
DOCUSIGN_WEBHOOK_SECRET=
DROPBOXSIGN_WEBHOOK_SECRET=
CHERRY_API_KEY=
```

## Complete API Reference

### Health & Status
- `GET /api/healthz` - Service health check
- `GET /api/readyz` - Service readiness check
- `GET /debug` - Debug configuration info

### Merchant Management
- `GET /api/merchants/` - Search merchants (query parameters)
- `POST /api/merchants/create` - Create or reuse merchant
- `GET /api/merchants/resolve` - Resolve merchant by identifiers

### Deal Management
- `POST /api/deals/start` - Create/find deal with merchant matching
- `GET /api/public/deals` - List deals (status, search filters)
- `GET /api/public/deals/{id}` - Get comprehensive deal details
- `GET /api/public/deals/merchant/{id}` - Get deals for merchant
- `POST /api/deals/{id}/accept` - Accept deal offer
- `POST /api/deals/{id}/decline` - Decline deal
- `POST /api/deals/{id}/status` - Update deal status

### Document Processing & Analysis
- `POST /api/documents/bank/upload` - Upload 3-12 PDFs with instant analysis
- `POST /api/documents/bank/parse` - Parse PDFs without storing
- `POST /api/statements/parse` - Parse statements for deal
- `GET /api/statements/monthly` - Get monthly metrics
- `GET /api/statements/transactions` - Get parsed transactions
- `GET /api/statements/monthly.csv` - Download monthly data as CSV

### Advanced Analysis Pipeline
- `POST /api/analysis/run` - Complete PDF→analysis→offers→risk pipeline
- `GET /api/analysis/llm-health` - Check AI analysis service health

### Offer Generation
- `POST /api/offers/simple` - Generate offers from metrics directly
- `POST /api/offers/` - Generate offers for specific deal
- `POST /api/offers/deals/{id}/accept` - Accept offer for deal
- `POST /api/offers/deals/{id}/decline` - Decline offer for deal

### Background Checks
- `POST /api/background/check` - Initiate background verification
- `GET /api/background/jobs/{job_id}` - Check background job status

### E-Signature Integration
- `POST /api/sign/send` - Send documents for signing
- `POST /api/sign/webhook` - Handle signature completion webhooks

### SMS Campaign Management
- `POST /api/sms/cherry/send` - Send SMS campaigns (rate limited)
- `POST /api/sms/cherry/webhook` - Handle inbound SMS and STOP commands

### Integration Management
- `POST /api/connectors/` - Save connector config (encrypted)
- `GET /api/connectors/{tenant_id}` - List tenant connectors
- `GET /api/connectors/{tenant_id}/{name}` - Get specific connector
- `POST /api/connectors/validate` - Validate connector configuration

### Plaid Integration
- `POST /api/plaid/link-token` - Create Plaid Link token
- `POST /api/plaid/exchange` - Exchange public token
- `POST /api/plaid/metrics` - Fetch account metrics

### Admin & Queue Management
- `POST /api/queue/parse` - Queue parsing job
- `POST /api/queue/background` - Queue background check
- `POST /api/queue/sms` - Queue SMS job
- `POST /api/queue/offers` - Queue offer generation
- `GET /api/queue/status/{job_id}` - Check job status
- `GET /api/admin/background/review` - Review background checks
- `POST /api/admin/deals/{id}/force-action` - Force deal action

### Event Timeline
- `GET /api/events` - Get event timeline data

## Security Features

### Idempotency Protection
- All critical POST routes protected with Idempotency-Key headers
- Redis-first with in-memory fallback for Replit environment
- Request body hashing for payload verification
- Automatic response caching and replay

### Rate Limiting
- SMS: 2000 messages/minute per tenant with memory fallback
- Token bucket algorithm with sliding window
- Graceful degradation when Redis unavailable

### Webhook Security  
- HMAC signature verification for DocuSign/Dropbox Sign
- Signature verification always enforced (no debug bypass)
- Webhook deduplication via Redis/memory store
- Automatic event ID generation for tracking

## Recent Updates (September 2025)
1. **Complete API Documentation**: Updated README and created comprehensive API_INSTRUCTIONS.md
2. **Enhanced Analysis Pipeline**: Added /api/analysis/run for complete PDF→offers workflow
3. **Comprehensive Endpoint Coverage**: All 50+ API endpoints documented with examples
4. **Idempotency Complete**: All critical routes protected with fallback mechanisms
5. **Advanced Statement Analysis**: Enhanced parsing with monthly summaries and CSV export
6. **California Compliance**: Full underwriting guardrails with 200-day term enforcement
7. **Security Hardening**: SMS rate limiting, webhook signatures, encrypted connectors

## Development Workflow

### Startup Commands
```bash
# Backend (Terminal 1)
cd server && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (Terminal 2) 
cd web && npm run dev
```

### Project Structure
```
server/                 # Python FastAPI backend
├── core/              # Configuration, database, security
├── models/            # SQLAlchemy data models
├── routes/            # API endpoint handlers  
├── services/          # External service integrations
└── main.py           # FastAPI application entry

web/                   # React frontend
├── src/              # React components and logic
├── public/           # Static assets
└── package.json      # Frontend dependencies
```

## User Preferences & Notes
- Development environment optimized for Replit deployment
- External API integrations gracefully degrade without real keys
- Comprehensive logging for debugging and monitoring
- Deal-centric architecture ensures proper multi-tenant isolation
- All compliance and security guardrails active by default

This platform provides a production-ready lending operations solution with comprehensive automation, security, and compliance features suitable for pilot deployment.