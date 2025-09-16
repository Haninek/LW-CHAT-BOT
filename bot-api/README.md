# LendWizely AI Bot API

REST API for LendWizely's AI-powered lending workflow automation, including SMS outreach, bank statement parsing, offer generation, background checks, and e-signatures.

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Validation**: Zod
- **Testing**: Jest
- **Code Quality**: ESLint + Prettier

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Environment variables (see `.env.example`)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd bot-api

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your actual API keys

# Run in development mode
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Building for Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## API Documentation

Full API specification is available in `openapi.yaml`. The API follows RESTful conventions with JWT authentication.

### Authentication

All endpoints except health checks and webhooks require Bearer token authentication:

```bash
# Get JWT token
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"api_key": "your-api-key"}'

# Use token in subsequent requests
curl http://localhost:8080/clients \
  -H "Authorization: Bearer <jwt-token>"
```

### Key Endpoints

#### Health Checks
```bash
# Basic health check
curl http://localhost:8080/healthz

# Readiness check (includes service dependencies)
curl http://localhost:8080/readyz
```

#### Bank Statement Parsing
```bash
# Parse 3 PDF bank statements
curl -X POST http://localhost:8080/bank/parse \
  -H "Authorization: Bearer <token>" \
  -F "files=@statement1.pdf" \
  -F "files=@statement2.pdf" \
  -F "files=@statement3.pdf" \
  -F "client_id=client123"
```

#### Generate Offers
```bash
# Generate offers based on metrics
curl -X POST http://localhost:8080/offers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "avg_monthly_revenue": 50000,
    "avg_daily_balance_3m": 15000,
    "total_nsf_3m": 2,
    "total_days_negative_3m": 5
  }'
```

## Development Workflow

This project is optimized for Cursor AI development. Use the task files in `/cursor-tasks` to implement features:

1. Open a task file (e.g., `cursor-tasks/01_scaffold_api.md`)
2. Click "Run" in Cursor to execute the task
3. Review and merge the generated code
4. Move to the next task

### Task Sequence

1. **01_scaffold_api.md** - Create API skeleton
2. **02_plaid_and_openai.md** - Integrate external services
3. **03_pdf_parse_endpoint.md** - Implement PDF parsing
4. **04_offers_logic.md** - Add offer generation
5. **05_cherry_sms.md** - SMS integration
6. **06_signing_webhooks.md** - E-signature support
7. **07_background_check.md** - Background checks
8. **08_security_telemetry.md** - Security & monitoring

## Security Features

- **Rate Limiting**: Per-IP rate limits on all endpoints
- **CORS**: Restricted to `https://app.lendwizely.com`
- **Input Validation**: Zod schemas for all inputs
- **File Validation**: PDF-only, 25MB max, exactly 3 files
- **JWT Authentication**: Short-lived tokens (30 min)
- **Idempotency**: POST request deduplication
- **Audit Logging**: All sensitive operations logged

## Environment Variables

See `.env.example` for all required variables:

- **API Keys**: OpenAI, Plaid, Cherry SMS, DocuSign/Dropbox Sign
- **JWT Config**: Issuer, TTL
- **Service URLs**: Webhook endpoints, API bases
- **Feature Flags**: Enable/disable specific integrations

## Architecture

```
/bot-api
├── src/
│   ├── server.ts          # Express app entry point
│   ├── routes/            # API route handlers
│   ├── services/          # External service clients
│   └── lib/               # Shared utilities
├── openapi.yaml           # API specification
├── cursor-tasks/          # Cursor AI task definitions
└── tests/                 # Test suites
```

## Contributing

1. Follow the coding standards in `.cursorrules`
2. Update `openapi.yaml` for any API changes
3. Write tests for new features
4. Ensure 70%+ test coverage
5. Run linter before committing

## License

Proprietary - LendWizely

## Support

For issues or questions, contact the LendWizely engineering team.