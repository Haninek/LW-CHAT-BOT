# LendWisely Chat Bot API - Replit Setup

## Project Overview
A production-ready Express + TypeScript API for LendWisely's chat bot functionality, including bank statement analysis, offer generation, SMS notifications, and e-signature workflows. This project has been successfully configured to run in the Replit environment.

## Current Status
✅ **Project is fully configured and running**
- Node.js Express API server running on port 5000
- All dependencies installed and working
- Database connected and tables created
- Health and readiness endpoints functional
- Deployment configuration set up

## Architecture
The project consists of two main components:
1. **Node.js Express API** (primary service) - Financial services API
2. **Python FastAPI** (supporting service) - Additional functionality

### Node.js Express API (Port 5000)
- **Status**: ✅ Running successfully
- **URL**: http://0.0.0.0:5000
- **Health Check**: `/healthz` - Returns server health status
- **Readiness Check**: `/readyz` - Returns service readiness (shows false for external services without real API keys)

### Available API Endpoints
- `/healthz` - Health check
- `/readyz` - Readiness check  
- `/api/bank/parse` - Bank statement analysis
- `/api/offers` - Offer generation
- `/api/plaid/link-token` - Plaid integration
- `/api/sms/cherry/webhook` - SMS webhooks
- `/api/sign/webhook` - E-signature webhooks
- `/api/background/check` - Background checks
- `/api/events` - Events feed

### Python FastAPI (Port 8081)
- **Status**: ✅ Configured but not actively running
- **Configuration**: Available to run on port 8081 if needed
- **Purpose**: Supporting service for additional functionality

## Environment Configuration
The project uses environment variables for configuration with safe defaults for development:

### Development Defaults (No API keys required)
- `PORT=5000` - Server runs on port 5000 for Replit frontend
- `NODE_ENV=development` - Development mode
- `CORS_ORIGIN=*` - Allow all origins for development
- `API_KEY_PARTNER=development-key` - Development API key
- All external service API keys have placeholder values

### Database
- Currently using SQLite database for development 
- Replit PostgreSQL database is available and can be configured
- Tables automatically created on startup
- Database connection is configurable via DATABASE_URL environment variable

## Recent Setup Changes (September 2025)
1. **Port Configuration**: Changed from 8080 to 5000 for Replit frontend compatibility
2. **Host Binding**: Configured to bind to 0.0.0.0 for proper Replit access
3. **Environment Flexibility**: Made external API keys optional for development
4. **Rate Limiter**: Fixed proxy trust configuration for proper client IP handling
5. **Dependencies**: All Node.js and Python dependencies installed successfully
6. **Deployment**: Configured for autoscale deployment with build steps

## User Preferences & Setup Notes
- Development environment prioritizes ease of setup over production security
- External API integrations (OpenAI, Plaid, DocuSign, Cherry SMS) are optional for basic functionality
- Server logs are comprehensive and show all available endpoints on startup
- Rate limiting is configured but allows generous limits for development

## How to Use
1. **Server is already running** - The Express API is live on port 5000
2. **Test endpoints**: Use `/healthz` for basic health checks
3. **API functionality**: Most endpoints will work with placeholder data, but full functionality requires real API keys
4. **Adding API keys**: Use the secrets management system for production API keys

## Dependencies Status
- ✅ Node.js 20 installed
- ✅ Python 3.11 available  
- ✅ All npm packages installed
- ✅ All Python packages installed
- ✅ TypeScript compilation working
- ✅ Database connection established

## Project Structure
```
src/                    # Node.js/TypeScript source
├── lib/               # Core utilities (env, db)
├── middleware/        # Express middleware
├── models/           # Data models  
├── repositories/     # Data access layer
├── routes/           # API endpoints
├── services/         # External service integrations
└── types/            # TypeScript type definitions

app/                   # Python FastAPI source
├── core/             # Core configuration
└── routes/           # API routes

scripts/              # Utility scripts
tests/                # Test files
```

This setup provides a robust development environment that can be easily extended with real API keys for full production functionality.