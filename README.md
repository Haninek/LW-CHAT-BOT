# LendWizely Chat Bot API

A production-ready FastAPI application for LendWizely's chat bot services, providing financial analysis, loan offers, and integration with external services.

## Features

- **Bank Statement Analysis**: Upload and analyze bank statements using OpenAI
- **Loan Offers**: Generate deterministic loan offers based on financial metrics
- **Plaid Integration**: Connect to bank accounts and retrieve transaction data
- **Health Checks**: Comprehensive health and readiness endpoints
- **Type Safety**: Full TypeScript-equivalent type checking with Pydantic v2
- **Testing**: Comprehensive test suite with pytest
- **CI/CD**: GitHub Actions workflow for automated testing and linting

## Quick Start

### Prerequisites

- Python 3.11 or higher
- pip or uv package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd lw-chat-bot
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`:
```bash
# Required for OpenAI integration
OPENAI_API_KEY=your_openai_api_key_here

# Required for Plaid integration
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret

# Other optional configurations...
```

4. Install dependencies:
```bash
pip install -e ".[dev]"
```

### Running the Application

Start the development server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

The API will be available at:
- API: http://localhost:8080
- Documentation: http://localhost:8080/docs
- Alternative docs: http://localhost:8080/redoc

### Health Checks

Test the health endpoints:
```bash
# Basic health check
curl http://localhost:8080/healthz

# Readiness check with dependency validation
curl http://localhost:8080/readyz
```

## Development

### Code Quality

Run linting and formatting:
```bash
# Lint with ruff
ruff check .

# Format with black
black .

# Type checking with mypy
mypy .
```

### Testing

Run the test suite:
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_health.py -v
```

### Project Structure

```
app/
├── core/           # Core application modules
│   ├── config.py   # Configuration and settings
│   ├── errors.py   # Error handling
│   └── security.py # Authentication and security
├── routes/         # API route handlers
│   └── health.py   # Health check endpoints
├── schemas/        # Pydantic models
│   ├── metrics.py  # Bank statement metrics
│   └── offers.py   # Loan offer schemas
├── services/       # External service clients
│   ├── openai_client.py  # OpenAI integration
│   └── plaid_client.py   # Plaid integration
└── main.py         # FastAPI application factory
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `8080` | No |
| `DEBUG` | Debug mode | `false` | No |
| `CORS_ORIGIN` | CORS allowed origin | `https://app.lendwizely.com` | No |
| `OPENAI_API_KEY` | OpenAI API key | - | Yes* |
| `OPENAI_MODEL_PARSE` | OpenAI model for parsing | `gpt-4o-mini` | No |
| `PLAID_CLIENT_ID` | Plaid client ID | - | Yes* |
| `PLAID_SECRET` | Plaid secret key | - | Yes* |
| `PLAID_ENV` | Plaid environment | `sandbox` | No |
| `CHERRY_API_KEY` | Cherry SMS API key | - | No |
| `DOCUSIGN_TOKEN` | DocuSign API token | - | No |
| `DROPBOX_SIGN_API_KEY` | Dropbox Sign API key | - | No |
| `LENDWIZELY_WEBHOOK_URL` | Webhook URL for events | `https://app.lendwizely.com/api/bot-events` | No |

*Required for full functionality

## API Endpoints

### Health Checks

- `GET /healthz` - Basic health check
- `GET /readyz` - Readiness check with dependency validation

### Future Endpoints (Phase 2+)

- `POST /bank/parse` - Upload and analyze bank statements
- `POST /offers` - Generate loan offers from metrics
- `POST /sms/cherry/send` - Send SMS messages
- `POST /sms/cherry/webhook` - Handle SMS webhooks
- `POST /sign/send` - Send documents for e-signature
- `POST /sign/webhook` - Handle e-signature webhooks
- `GET /events` - List recent events
- `POST /background/check` - Initiate background checks

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 style guidelines
- Add type hints to all functions
- Write tests for new functionality
- Update documentation as needed
- Ensure all tests pass before submitting PR

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions, please contact the development team or open an issue in the repository.