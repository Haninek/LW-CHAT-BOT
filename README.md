# Underwriting Wizard

A comprehensive multi-tenant automated lending operations platform featuring Chad (an AI funding representative chatbot), with SMS campaign management, professional templates, and modern responsive design.

## 🎯 Overview

The Underwriting Wizard is a deal-centric platform where all actions attach to `deal_id` rather than `merchant_id`, implementing automated lending workflows with comprehensive underwriting guardrails and California compliance requirements. The platform includes comprehensive deals management system with admin tools, background job processing, CRM integration, and secure public API endpoints with proper PII redaction.

## 🏗️ Architecture

### Core Components
- **Backend API**: Python FastAPI server (Port 8000)
- **Frontend**: React with TypeScript and Tailwind CSS (Port 5000)
- **Database**: SQLite for development, PostgreSQL support for production
- **Background Jobs**: Python worker processes
- **Security**: JWT authentication, API key validation, PII redaction

### Key Features
- **Chad AI Chatbot**: Intelligent funding representative for customer interactions
- **Deals Management**: Comprehensive deal tracking and processing
- **SMS Campaigns**: Automated campaign management and tracking
- **Background Checks**: Integrated identity verification and risk assessment
- **Document Processing**: Automated document analysis and parsing
- **Secure APIs**: Public endpoints with PII redaction for frontend access
- **Admin Tools**: Background review, merchant management, and system monitoring

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- SQLite (for development)

### Installation

1. **Backend Setup**
```bash
cd server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

2. **Frontend Setup**
```bash
cd web
npm install
npm run dev
```

### Access Points
- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:8000
- **API Health Check**: http://localhost:8000/api/healthz
- **API Documentation**: http://localhost:8000/docs (FastAPI auto-generated)

## 📊 API Endpoints

### Public Endpoints (PII Redacted)
- `GET /api/public/deals` - List deals with masked merchant data
- `GET /api/healthz` - Health check
- `GET /api/readyz` - Readiness check

### Authenticated Endpoints
- `GET /api/public/deals/{deal_id}` - Get detailed deal information
- `POST /api/deals/{deal_id}/accept` - Accept deal offer
- `POST /api/deals/{deal_id}/decline` - Decline deal offer
- `GET /api/admin/background-review` - Admin background review interface
- `GET /api/merchants` - Merchant management
- `POST /api/background/check` - Initiate background checks

### Security Features
- **PII Redaction**: Phone numbers masked to last 4 digits, emails masked, addresses removed
- **Authentication**: API key validation for sensitive endpoints
- **Route Separation**: Public read-only vs authenticated endpoints
- **Data Protection**: Sensitive fields automatically redacted in public responses

## 💼 Use Cases

### Primary Workflows
1. **Deal Processing**: Complete lending workflow from application to funding
2. **Risk Assessment**: Automated underwriting with configurable guardrails
3. **Customer Communication**: AI-powered chat interactions with Chad
4. **Document Management**: Automated parsing and verification
5. **Compliance**: California lending compliance and regulatory requirements

### Admin Functions
- Background check review and approval
- Merchant status management
- Deal pipeline monitoring
- System configuration and settings

## 🗂️ Project Structure

```
├── server/              # Python FastAPI backend
│   ├── core/           # Core configuration and middleware
│   ├── models/         # Database models
│   ├── routes/         # API endpoints
│   ├── services/       # Business logic services
│   └── main.py         # Application entry point
├── web/                # React frontend
│   ├── src/
│   │   ├── components/ # Reusable React components
│   │   ├── pages/      # Page components
│   │   ├── lib/        # Utilities and API client
│   │   └── state/      # State management
│   └── package.json    # Frontend dependencies
├── worker/             # Background job processing
├── scripts/            # Utility scripts
└── README.md           # This file
```

## 🔧 Configuration

### Environment Variables
- `DATABASE_URL` - Database connection string
- `API_KEY_PARTNER` - Partner API authentication key
- `CORS_ORIGIN` - Allowed CORS origins (default: *)

### Development Defaults
- All external API integrations have safe placeholder values
- Database tables auto-created on startup
- Comprehensive logging enabled
- Rate limiting configured with generous development limits

## 🛡️ Security

### Data Protection
- **PII Redaction**: Automatic masking of sensitive personal information
- **Authentication**: Multi-layer security with API keys and JWT tokens
- **Route Security**: Clear separation between public and authenticated endpoints
- **Input Validation**: Comprehensive data validation and sanitization

### Compliance
- California lending regulation compliance
- Secure document handling and storage
- Audit trail for all deal activities
- Privacy-first data handling practices

## 🔄 Deployment

The platform is configured for production deployment with:
- **Autoscale**: Serverless deployment for cost efficiency
- **Health Monitoring**: Built-in health and readiness checks
- **Database Migration**: Automatic schema management
- **Environment Configuration**: Production-ready defaults

## 📝 Contributing

1. Follow existing code structure and patterns
2. Ensure all security measures are maintained
3. Test both public and authenticated endpoints
4. Maintain PII redaction in all public responses
5. Update documentation for any API changes

## 📄 License

MIT License - see LICENSE file for details

---

**Underwriting Wizard** - Streamlining lending operations with intelligent automation and comprehensive security.