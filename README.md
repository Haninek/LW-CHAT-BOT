# LendWisely Chat Bot API

A production-ready Express + TypeScript API for LendWisely's chat bot functionality, including bank statement analysis, offer generation, SMS notifications, and e-signature workflows.

## Features

- 🏦 **Bank Statement Analysis** - Upload PDFs, extract financial metrics via OpenAI
- 💰 **Offer Generation** - Deterministic calculations with AI-powered rationales  
- 📱 **SMS Integration** - Cherry SMS with TCPA-compliant consent tracking
- ✍️ **E-Signature** - Switchable DocuSign/Dropbox Sign integration
- 📊 **Event Tracking** - Comprehensive audit trail and webhook processing
- 🔐 **Security** - API key auth, rate limiting, input validation
- 🧪 **Testing** - Comprehensive test suite with mocks
- 📋 **OpenAPI** - Full API documentation

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone and setup
git clone <your-repo-url>
cd lw-chat-bot
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys and configuration

# Run development server
npm run dev

# Test the API
curl http://localhost:8080/healthz
```

## Environment Configuration

### Required Variables

```bash
# Core Configuration
PORT=8080
CORS_ORIGIN=https://app.lendwizely.com
API_KEY_PARTNER=your-secure-api-key

# OpenAI (required for bank analysis & offer rationales)
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL_PARSE=gpt-4o-mini

# Plaid (required for bank data integration)
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_ENV=sandbox
```

### Optional Integrations

```bash
# SMS (Cherry)
CHERRY_API_KEY=your-cherry-api-key

# E-Signature (choose one provider)
SIGN_PROVIDER=docusign  # or dropboxsign

# DocuSign
DOCUSIGN_ACCOUNT_ID=your-account-id
DOCUSIGN_TOKEN=your-integration-key

# Dropbox Sign
DROPBOX_SIGN_API_KEY=your-api-key

# Database (defaults to SQLite)
DATABASE_URL=sqlite:///./data.db
```

## API Endpoints

### Health & Status

```bash
# Health check
curl http://localhost:8080/healthz

# Readiness check
curl http://localhost:8080/readyz
```

### Bank Statement Analysis

```bash
# Upload 3 PDFs for analysis
curl -X POST http://localhost:8080/api/bank/parse \
  -H "X-API-Key: your-api-key" \
  -F "files=@statement1.pdf" \
  -F "files=@statement2.pdf" \
  -F "files=@statement3.pdf"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "months": [
      {
        "statement_month": "2024-01",
        "total_deposits": 85000.00,
        "avg_daily_balance": 12500.00,
        "ending_balance": 15000.00,
        "nsf_count": 0,
        "days_negative": 0
      }
    ],
    "avg_monthly_revenue": 85000.00,
    "avg_daily_balance_3m": 12500.00,
    "total_nsf_3m": 0,
    "total_days_negative_3m": 0
  }
}
```

### Offer Generation

```bash
# Generate offers from metrics
curl -X POST http://localhost:8080/api/offers \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "avg_monthly_revenue": 80000,
    "avg_daily_balance_3m": 12000,
    "total_nsf_3m": 1,
    "total_days_negative_3m": 2
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "offers": [
      {
        "amount": 57600.00,
        "fee": 1.25,
        "term_days": 120,
        "payback": 72000.00,
        "est_daily": 600.00,
        "rationale": "• Competitive 120-day term aligns with cash flow\n• Lower fee rate rewards strong banking history\n• Daily payments spread manageable amounts"
      }
    ]
  }
}
```

### SMS Integration

```bash
# Send SMS blast
curl -X POST http://localhost:8080/api/sms/cherry/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "numbers": ["+19171234567", "+17325550123"],
    "message": "Your working capital pre-approval is ready. Review: https://your.link"
  }'

# SMS webhook (for provider callbacks)
curl -X POST http://localhost:8080/api/sms/cherry/webhook \
  -H "Content-Type: application/json" \
  -d '{"from": "+19171234567", "message": "STOP"}'
```

### E-Signature

```bash
# Send agreement for signature
curl -X POST http://localhost:8080/api/sign/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "client_id": "client_123",
    "email": "business@example.com",
    "name": "Business Owner",
    "pdf_base64": "<base64-encoded-pdf>",
    "subject": "Working Capital Agreement",
    "message": "Please review and sign your funding agreement."
  }'

# Signature webhook (for provider callbacks)
curl -X POST http://localhost:8080/api/sign/webhook \
  -H "Content-Type: application/json" \
  -d '{"envelope_id": "env_12345", "status": "completed", "client_id": "client_123"}'

# Poll events
curl "http://localhost:8080/api/events?since=2024-01-01T00:00:00Z&limit=50" \
  -H "X-API-Key: your-api-key"
```

### Background Checks

```bash
# Start background check (async)
curl -X POST http://localhost:8080/api/background/check \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "client_id": "client_123",
    "person": {
      "first": "John",
      "last": "Doe",
      "dob": "1990-01-01",
      "ssn4": "1234",
      "email": "john.doe@example.com",
      "phone": "+15551234567",
      "address": "123 Main St, City, ST 12345"
    }
  }'

# Poll job status
curl http://localhost:8080/api/background/jobs/<job_id> \
  -H "X-API-Key: your-api-key"

# Get all jobs for a client
curl http://localhost:8080/api/background/client/<client_id>/jobs \
  -H "X-API-Key: your-api-key"
```

**Background Check Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "job_123",
    "status": "completed",
    "result": {
      "decision": "OK",
      "notes": ["No material adverse findings"],
      "raw": {
        "records": {
          "criminal": [],
          "liens_judgments": [],
          "OFAC": []
        },
        "identity": {
          "name_match": true,
          "dob_match": true,
          "address_match": true
        }
      }
    }
  }
}
```

## Business Logic

### Offer Calculation

Offers use deterministic math with guardrails:

```typescript
// Base calculation
base = min(avg_monthly_revenue * 1.2, avg_daily_balance_3m * 20)

// Tiers with factors, fees, and terms
tiers = [
  { factor: 0.6, fee: 1.25, term_days: 120 },
  { factor: 0.8, fee: 1.30, term_days: 140 },
  { factor: 1.0, fee: 1.35, term_days: 160 }
]

// Guardrails
- Reject if total_nsf_3m > 3 OR total_days_negative_3m > 6
- Cap if (payback / avg_monthly_revenue) > 0.25
- Round amounts to nearest $100
```

### SMS Compliance

- Auto-appends "Reply STOP to opt out" to all messages
- Tracks consent in database with timestamps
- Handles STOP/HELP keywords automatically
- TCPA-compliant opt-out processing

### E-Signature Providers

Switchable between DocuSign and Dropbox Sign:

```bash
# Use DocuSign
SIGN_PROVIDER=docusign
DOCUSIGN_ACCOUNT_ID=your-account
DOCUSIGN_TOKEN=your-token

# Use Dropbox Sign  
SIGN_PROVIDER=dropboxsign
DROPBOX_SIGN_API_KEY=your-key
```

### Background Check Logic

Async processing with deterministic decision logic:

```typescript
// Decision priority (highest to lowest)
1. OFAC/Sanctions Hit → "Decline" (immediate)
2. Criminal Records → "Review" 
3. Liens/Judgments → "Review"
4. Identity Mismatch → "Review"
5. Clean Results → "OK"

// Webhook notification sent to LENDWIZELY_WEBHOOK_URL on completion
// PII handling: only last 4 SSN digits stored, DOB sanitized in logs
```

## Development

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npm run lint         # Lint code
npm run lint:fix     # Fix linting issues
npm run format       # Format code with Prettier
```

### Testing

Comprehensive test suite with mocks for external services:

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --testPathPattern=offers

# Run with coverage
npm run test:coverage
```

### Database

Uses SQLite by default with automatic table creation:

- `clients` - SMS consent tracking
- `agreements` - E-signature status  
- `background_jobs` - Async background check processing
- `events` - Audit trail for all actions

## Security Features

- **API Key Authentication** - Required for all API endpoints
- **Rate Limiting** - 100 requests per 15 minutes per IP
- **Input Validation** - Zod schemas for all inputs
- **CORS Protection** - Configurable allowed origins
- **Error Sanitization** - No sensitive data in error responses
- **Idempotency Support** - UUID-based request deduplication

## Production Deployment

### Environment Setup

```bash
# Production environment
NODE_ENV=production
PORT=8080

# Use production API endpoints
PLAID_ENV=production
DOCUSIGN_BASE=https://www.docusign.net
```

### Health Monitoring

Monitor these endpoints:

- `GET /healthz` - Basic health check
- `GET /readyz` - Dependency readiness check

### Webhook Security

In production, implement proper webhook verification:

- DocuSign: HMAC signature verification with Connect Key
- Dropbox Sign: HMAC signature verification with API key
- Cherry SMS: Provider-specific signature verification

## Architecture

```
src/
├── lib/
│   ├── env.ts              # Environment validation
│   └── db/
│       └── connection.ts   # Database connection
├── middleware/
│   ├── auth.ts            # API key authentication
│   ├── error.ts           # Error handling
│   └── idempotency.ts     # Request deduplication
├── models/
│   ├── client.ts          # Client data model
│   ├── agreement.ts       # Agreement data model
│   └── event.ts           # Event data model
├── repositories/
│   ├── client-repository.ts      # Client data access
│   ├── agreement-repository.ts   # Agreement data access
│   └── event-repository.ts       # Event data access
├── services/
│   ├── openai.ts          # OpenAI integration
│   ├── plaid.ts           # Plaid integration
│   ├── cherry-client.ts   # Cherry SMS integration
│   ├── signing.ts         # E-signature integration
│   ├── clear-client.ts    # Background check provider (CLEAR stub)
│   ├── background-service.ts # Background job processing
│   └── offers-engine.ts   # Offer calculation logic
├── routes/
│   ├── health.ts          # Health endpoints
│   ├── bank.ts            # Bank analysis endpoints
│   ├── offers.ts          # Offer generation endpoints
│   ├── sms.ts             # SMS endpoints
│   ├── sign.ts            # E-signature endpoints
│   └── background.ts      # Background check endpoints
├── types/
│   ├── global.d.ts        # Global type definitions
│   ├── metrics.ts         # Bank metrics types
│   ├── offers.ts          # Offer types
│   ├── sms.ts             # SMS types
│   ├── signing.ts         # E-signature types
│   └── background.ts      # Background check types
└── __tests__/             # Test files
```

## API Documentation

Full OpenAPI 3.0 specification available at `/openapi.yaml` with:

- All endpoint definitions
- Request/response schemas  
- Authentication requirements
- Error response formats

## Support

For issues or questions:

1. Check the test files for usage examples
2. Review the OpenAPI specification
3. Verify environment configuration
4. Check logs for detailed error information

## License

MIT License - see LICENSE file for details.