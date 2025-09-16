# LendWizely AI Bot API

A REST API for SMS outreach, intake, bank parsing, offer generation, background checks, and e-sign functionality.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm 9+
- MySQL 8+
- Redis 6+

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd bot-api
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Verify the API is running:**
   ```bash
   curl http://localhost:8080/healthz
   # Expected: {"ok": true}
   ```

## 📋 Environment Variables

Copy `.env.example` to `.env` and configure:

### Required Variables
- `JWT_SECRET` - Secret key for JWT tokens (min 32 characters)
- `API_KEY_PARTNER` - Partner API key for authentication
- `OPENAI_API_KEY` - OpenAI API key for PDF parsing
- `PLAID_CLIENT_ID` - Plaid client ID
- `PLAID_SECRET` - Plaid secret key
- `CHERRY_API_KEY` - Cherry SMS API key

### Optional Variables
- `PORT` - Server port (default: 8080)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_URL` - MySQL connection string
- `REDIS_URL` - Redis connection string

See `.env.example` for complete list.

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run test:coverage # Run tests with coverage
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Project Structure

```
bot-api/
├── src/
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic services
│   ├── lib/            # Shared utilities
│   └── server.ts       # Main server file
├── cursor-tasks/       # Cursor AI task definitions
├── openapi.yaml        # API specification
├── .cursorrules        # Cursor AI behavior rules
└── package.json
```

## 🔧 Using Cursor AI

This project is designed to work with Cursor AI. Each task is defined in the `cursor-tasks/` directory:

1. **Open a task file** (e.g., `cursor-tasks/01_scaffold_api.md`)
2. **Click "Run" (Agent)** in Cursor
3. **Review and merge** the generated PR
4. **Move to the next task**

### Task Sequence

1. `01_scaffold_api.md` - Create baseline API skeleton
2. `02_plaid_and_openai.md` - Integrate Plaid and OpenAI clients
3. `03_pdf_parse_endpoint.md` - Implement PDF parsing endpoint
4. `04_offers_logic.md` - Implement offer generation logic
5. `05_cherry_sms.md` - Cherry SMS integration
6. `06_signing_webhooks.md` - E-sign provider integration
7. `07_background_check.md` - Background check system
8. `08_security_telemetry.md` - Security and monitoring

## 📚 API Documentation

### Authentication

Get a JWT token by exchanging your API key:

```bash
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"api_key": "your-partner-api-key"}'
```

Use the returned token in subsequent requests:

```bash
curl -H "Authorization: Bearer <jwt-token>" \
  http://localhost:8080/clients
```

### Key Endpoints

#### Health Check
```bash
curl http://localhost:8080/healthz
```

#### Bank Statement Parsing
```bash
curl -X POST http://localhost:8080/bank/parse \
  -H "Authorization: Bearer <jwt-token>" \
  -F "files=@statement1.pdf" \
  -F "files=@statement2.pdf" \
  -F "files=@statement3.pdf"
```

#### Generate Offers
```bash
curl -X POST http://localhost:8080/offers \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "client-123",
    "metrics": {
      "avg_monthly_revenue": 10000,
      "avg_daily_balance_3m": 5000,
      "total_nsf_3m": 1,
      "total_days_negative_3m": 2
    }
  }'
```

### Complete API Reference

See `openapi.yaml` for the complete API specification. You can view it using:
- [Swagger Editor](https://editor.swagger.io/)
- [Redoc](https://redoc.ly/)
- Or any OpenAPI-compatible tool

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Structure

- Unit tests: `src/**/*.test.ts`
- Integration tests: `src/**/*.integration.test.ts`
- Test utilities: `src/__tests__/`

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Environment Setup

1. Set `NODE_ENV=production`
2. Configure production database and Redis
3. Set up SSL certificates
4. Configure reverse proxy (nginx/Apache)
5. Set up monitoring and logging

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 8080
CMD ["npm", "start"]
```

## 🔒 Security

- JWT-based authentication
- Rate limiting per IP
- CORS protection
- Input validation with Zod
- Request size limits
- Security headers (HSTS, CSP, etc.)
- Audit logging for sensitive operations

## 📊 Monitoring

- Health check endpoints (`/healthz`, `/readyz`)
- Prometheus metrics (`/metrics`)
- Structured logging with Winston
- Request/response logging
- Error tracking

## 🤝 Contributing

1. Follow the coding standards in `.cursorrules`
2. Write tests for new features
3. Update documentation
4. Ensure all tests pass
5. Follow the task-based development approach

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- Check the `cursor-tasks/` directory for implementation guidance
- Review `openapi.yaml` for API specifications
- See `.cursorrules` for coding standards
- Open an issue for bugs or feature requests

---

**Built with ❤️ for LendWizely**