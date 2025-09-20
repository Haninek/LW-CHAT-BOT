# UW Wizard - Cash Advance Platform

A modern automated lending platform specialized for **cash advance products** with immediate bank statement analysis, beautiful offer displays, and comprehensive underwriting automation.

## 🎯 Overview

UW Wizard is a production-ready cash advance lending platform featuring:

- **💰 Cash Advance Focus**: Specialized for cash advance products with max 200-day terms
- **⚡ Instant Analysis**: Drop 3 bank statements → immediate analysis → beautiful offers 
- **🤖 Chad AI Assistant**: GPT-powered funding representative for customer interaction
- **🛡️ CA Compliance**: Automated California regulatory compliance and risk assessment
- **📱 SMS Campaigns**: Rate-limited bulk messaging with STOP compliance
- **📝 E-Signatures**: DocuSign/Dropbox Sign integration with webhook verification
- **🏢 Multi-tenant**: Complete tenant isolation with secure API management

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+

### Installation

```bash
# Start Backend
cd server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Start Frontend (new terminal)
cd web
npm install
npm run dev -- --host 0.0.0.0 --port 5000
```

### Access Points
- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 💎 Core Features

### 📊 Offers Lab
- **Beautiful UI**: Professional cash advance offer cards with animations
- **Instant Analysis**: Drop 3 PDFs → immediate metrics extraction → tiered offers
- **Proper Display**: Fee rates, payback amounts, daily payments, revenue factors
- **Max 200 Days**: Enforced term limits for compliance

### 🤖 Chad AI Assistant  
- **Smart Qualification**: GPT-powered deal assessment
- **Customer Interaction**: Intelligent conversation management
- **Real-time Responses**: Immediate customer support

### 📋 Deal Management
- **Pipeline Tracking**: Complete deal lifecycle management
- **Status Progression**: Open → Processing → Approved/Declined
- **Audit Trail**: Comprehensive event tracking

### 🔌 Integrations
- **Bank Analysis**: Real NSF counts, negative balance tracking
- **Background Checks**: CLEAR, NYSCEF verification
- **E-Signatures**: Contract completion tracking
- **SMS Campaigns**: Bulk messaging with compliance

## 🏗️ Tech Stack

**Backend**:
- Python FastAPI with SQLAlchemy ORM
- PostgreSQL with SQLite fallback
- Redis caching with memory fallback
- Comprehensive idempotency protection

**Frontend**:
- React + TypeScript
- TailwindCSS with beautiful animations
- Vite build system
- Responsive design

**Security**:
- HMAC webhook verification
- Rate limiting with graceful degradation
- Enhanced error handling ("TypeError: Failed to fetch" → clear error messages)

## 📱 Core Modules

| Module | Purpose | Status |
|--------|---------|--------|
| **Offers Lab** | Cash advance offer generation | ✅ Active |
| **Chat** | Chad AI assistant | ✅ Active |
| **Merchants** | Merchant management | ✅ Active |
| **Deals** | Deal pipeline tracking | ✅ Active |
| **Campaigns** | SMS campaign management | ✅ Active |
| **Connectors** | Integration management | ✅ Active |
| **Background** | Background verification | ✅ Active |
| **Sign** | E-signature workflows | ✅ Active |
| **Settings** | Platform configuration | ✅ Active |

## 🔧 Environment Configuration

**Development Ready (Default)**:
```env
APP_NAME=UW Wizard
DEBUG=true
PORT=8000
DATABASE_URL=sqlite:///./uwizard.db
REDIS_URL=memory://local
CORS_ORIGINS=*
MOCK_MODE=true
AUTH_OPTIONAL=true
```

**Production Secrets (Optional)**:
```env
OPENAI_API_KEY=sk-...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
DOCUSIGN_WEBHOOK_SECRET=...
CHERRY_API_KEY=...
```

## 🔄 Cash Advance Workflow

1. **Upload**: Drop 3 bank statement PDFs
2. **Analysis**: Instant metrics extraction (NSF, balance, revenue)
3. **Underwriting**: CA-compliant risk assessment 
4. **Offers**: Generate tiered cash advance offers (max 200 days)
5. **Display**: Beautiful offer cards with proper field mapping
6. **Selection**: Customer chooses preferred offer
7. **Contracts**: E-signature workflow
8. **Funding**: Deal completion

## 🛡️ Security & Compliance

### Underwriting Guardrails
- **California Compliance**: Regulatory requirement enforcement
- **200-Day Max**: Term limit enforcement
- **Risk Scoring**: Multi-factor violation tracking
- **Deal Validation**: Fee caps, amount restrictions

### Error Handling Improvements
- **✅ Fixed**: "TypeError: Failed to fetch" → clear error messages
- **✅ Added**: `/api/statements/parse` endpoint for reliable parsing
- **✅ Enhanced**: API client with proper JSON error handling
- **✅ Improved**: FormData uploads without manual Content-Type

### Rate Limiting
- **SMS**: 2000 messages/minute per tenant
- **API**: Configurable limits with memory fallback
- **Graceful**: Degradation when Redis unavailable

## 📊 API Endpoints

### Core Operations
```bash
# Upload bank statements
POST /api/documents/bank/upload?merchant_id=123&deal_id=456
Content-Type: multipart/form-data

# Parse statements (new endpoint)
POST /api/statements/parse?merchant_id=123&deal_id=456

# Generate offers (simplified)
POST /api/offers/simple
{"metrics": {"avg_monthly_revenue": 85000, ...}}

# Create deal
POST /api/deals/start
{"merchant_hint": {"phone": "+1234567890", "legal_name": "Business LLC"}}
```

## 🧪 Testing

### Quick Test Sequence
```bash
# Health check
curl http://localhost:8000/api/healthz

# Test new parse endpoint
curl -X POST "http://localhost:8000/api/statements/parse?merchant_id=demo&deal_id=test" \
  -H "Authorization: Bearer dev" \
  -H "Content-Type: application/json" -d '{}'

# Test offers endpoint
curl -X POST http://localhost:8000/api/offers/simple \
  -H "Content-Type: application/json" \
  -d '{"metrics":{"avg_monthly_revenue":85000,"total_nsf_3m":2}}'
```

## 📈 Recent Updates

### ✅ Fixed Issues
- **TypeError Resolution**: Replaced "Failed to fetch" with clear error messages
- **API Contract**: Fixed frontend-backend communication issues
- **Error Handling**: Added proper JSON parsing and error display
- **Endpoint Addition**: Created `/api/statements/parse` for reliable parsing

### ✅ Code Cleanup  
- **Removed Unused Files**: Cleaned up 15+ unused components, pages, and libs
- **TypeScript Config**: Improved configuration to reduce LSP errors
- **File Organization**: Streamlined project structure
- **Documentation**: Updated README to reflect current functionality

### ✅ Cash Advance Enhancements
- **Proper Display**: Fee rates, payback amounts, daily payments, revenue factors
- **Tier Structure**: Multiple offer tiers with qualification scoring
- **200-Day Enforcement**: Maximum term compliance built-in
- **Beautiful UI**: Professional animations and responsive design

## 🚀 Architecture Highlights

- **Deal-Centric**: All operations attach to deal_id for proper isolation
- **Cash Advance Specialized**: Proper field semantics (fee rates, factors, daily payments)
- **Immediate Workflow**: Drop PDFs → instant analysis → beautiful offers
- **Graceful Degradation**: SQLite, memory fallbacks for all external services
- **Enhanced Error Handling**: Real error messages instead of generic failures

## 📞 Support

- **Issues**: Clear error messages now show exact HTTP status and details
- **Testing**: Use provided test sequences for verification
- **Development**: All services include fallbacks for smooth development

---

**UW Wizard** - Powering modern cash advance lending with beautiful UX and enterprise reliability.