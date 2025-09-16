# LendWizely AI Bot API

A REST API that LendWizely calls to run SMS outreach, intake, bank parsing (Plaid OR PDF via OpenAI), offer generation, background checks, and e-sign.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- SQLite (for development)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd bot-api

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your API keys
# See Environment Variables section below

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

The API will be available at `http://localhost:8080`

### Health Check

```bash
# Basic health check
curl http://localhost:8080/healthz
# Expected: {"ok":true}

# Readiness check
curl http://localhost:8080/readyz
# Expected: {"ready":true}
```

## 🎯 How to Run Cursor Tasks

This project uses Cursor AI with structured task files. Each task builds upon the previous one:

### Phase 1: Project Setup ✅
- [x] OpenAPI specification
- [x] Cursor rules and task framework
- [x] Basic project structure

### Phase 2: Core Features
Open each task file in Cursor and click "Run (Agent)":

1. **Task 01**: `cursor-tasks/01_scaffold_api.md` - API skeleton (already done)
2. **Task 02**: `cursor-tasks/02_plaid_and_openai.md` - Provider integrations
3. **Task 03**: `cursor-tasks/03_pdf_parse_endpoint.md` - PDF parsing
4. **Task 04**: `cursor-tasks/04_offers_logic.md` - Offer generation
5. **Task 05**: `cursor-tasks/05_cherry_sms.md` - SMS integration
6. **Task 06**: `cursor-tasks/06_signing_webhooks.md` - E-signature
7. **Task 07**: `cursor-tasks/07_background_check.md` - Background checks
8. **Task 08**: `cursor-tasks/08_security_telemetry.md` - Security & monitoring

### Quick Commands for Cursor

Copy these one-liners into Cursor's chat:

```bash
# Execute each task in order
"Execute cursor-tasks/02_plaid_and_openai.md"
"Execute cursor-tasks/03_pdf_parse_endpoint.md"
"Execute cursor-tasks/04_offers_logic.md"
"Execute cursor-tasks/05_cherry_sms.md"
"Execute cursor-tasks/06_signing_webhooks.md"
"Execute cursor-tasks/07_background_check.md"
"Execute cursor-tasks/08_security_telemetry.md"
```

## 📋 API Endpoints

### Authentication
- `POST /auth/token` - Exchange API key for JWT

### Health & Monitoring
- `GET /healthz` - Basic health check
- `GET /readyz` - Readiness check
- `GET /metrics` - Prometheus metrics

### Client Management
- `GET /clients` - List clients
- `POST /clients` - Create client
- `GET /clients/{id}` - Get client details
- `PUT /clients/{id}` - Update client

### SMS Integration
- `POST /sms/cherry/send` - Send SMS via Cherry
- `POST /sms/cherry/webhook` - Handle inbound SMS

### Intake & Banking
- `POST /intake` - Process client intake
- `POST /plaid/link/token` - Create Plaid link token
- `POST /plaid/exchange` - Exchange public token
- `GET /plaid/transactions` - Get transaction data
- `GET /plaid/statements` - List bank statements
- `GET /plaid/statements/{id}/download` - Download statement
- `POST /bank/parse` - Parse PDF statements with OpenAI

### Business Logic
- `POST /offers` - Generate loan offers
- `POST /background/check` - Initiate background check
- `GET /background/check/{id}` - Get check status
- `POST /sign/send` - Send document for e-signature
- `POST /sign/webhook` - Handle e-signature events
- `GET /events` - Poll for completion events

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure:

### Required Variables
```env
# Server
PORT=8080
JWT_SECRET=your-secret-key

# API Keys
API_KEY_PARTNER=your-partner-key
OPENAI_API_KEY=sk-your-openai-key
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
CHERRY_API_KEY=your-cherry-key

# Webhooks
PUBLIC_BASE_URL=https://api.yourbot.com
LENDWIZELY_WEBHOOK_URL=https://app.lendwizely.com/api/bot-events
```

### Optional Variables
```env
# E-Signature (choose one)
DOCUSIGN_ACCOUNT_ID=your-account-id
DOCUSIGN_TOKEN=your-token
# OR
DROPBOX_SIGN_API_KEY=your-api-key

# Background Checks
CLEAR_API_KEY=your-clear-key

# Security
REQUEST_SIZE_LIMIT=10mb
FILE_SIZE_LIMIT=25mb
RATE_LIMIT_MAX_REQUESTS=100
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format
```

## 🏗️ Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run database migrations
npm run migrate

# Seed database with test data
npm run seed
```

## 📊 API Examples

### Authentication
```bash
# Get JWT token
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"api_key": "your-partner-key"}'

# Use token in requests
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:8080/clients
```

### PDF Parsing
```bash
# Parse 3 bank statements
curl -X POST http://localhost:8080/bank/parse \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "files=@statement1.pdf" \
  -F "files=@statement2.pdf" \
  -F "files=@statement3.pdf"
```

### Generate Offers
```bash
# Generate loan offers
curl -X POST http://localhost:8080/offers \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "client-123",
    "metrics": {
      "avg_monthly_revenue": 15000,
      "avg_daily_balance_3m": 5000,
      "total_nsf_3m": 1,
      "total_days_negative_3m": 3
    }
  }'
```

## 🔒 Security Features

- JWT authentication with short-lived tokens
- Rate limiting (100 requests per 15 minutes)
- CORS protection (only allow https://app.lendwizely.com)
- Request size limits (10MB global, 25MB files)
- Input validation with Zod schemas
- Audit logging for sensitive operations
- Error message sanitization
- Security headers (HSTS, CSP, etc.)

## 📈 Monitoring

- Prometheus metrics at `/metrics`
- Health checks at `/healthz` and `/readyz`
- Structured logging with Winston
- Audit trail for all sensitive operations
- Request/response logging with correlation IDs

## 🏛️ Architecture

```
src/
├── routes/          # Express route handlers
├── services/        # Business logic services
├── lib/            # Utilities and helpers
└── server.ts       # Main application entry point
```

### Key Services
- **AuthService**: JWT token management
- **PlaidService**: Bank data integration
- **OpenAIService**: PDF parsing and rationale generation
- **CherryService**: SMS sending and webhooks
- **SignService**: E-signature integration
- **BackgroundService**: Background check processing
- **OffersService**: Deterministic offer calculation

## 🤝 Contributing

1. Follow the coding standards in `.cursorrules`
2. Add tests for new features
3. Update OpenAPI spec for new endpoints
4. Ensure 70%+ test coverage
5. Run linting and formatting before commits

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For questions or issues:
- Check the OpenAPI spec in `openapi.yaml`
- Review the cursor-tasks files for implementation details
- Contact the LendWizely development team