# LendWizely Frontend Integration

This guide shows how to set up the React frontend to work with your Express + TypeScript API.

## 🚀 Quick Setup

### 1. Create React App with Vite

```bash
# Create new React app
npm create vite@latest lw-chat-frontend -- --template react
cd lw-chat-frontend
npm install

# Install additional dependencies for styling
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 2. Configure Tailwind CSS

Update `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Update `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 3. Set Up Environment

Create `.env` file:

```bash
VITE_API_BASE=http://localhost:8080
```

### 4. Replace App Component

Replace `src/App.jsx`:

```javascript
import LendWizelyBot from "./LendWizelyBot.jsx";

export default function App() {
  return <LendWizelyBot />;
}
```

### 5. Add the LendWizely Component

Save the provided React component as `src/LendWizelyBot.jsx` (copy the full component code from the canvas).

### 6. Update Your API Configuration

Make sure your Express server has the following endpoints configured:

- ✅ `POST /api/bank/parse` - Upload PDFs for analysis
- ✅ `POST /api/offers` - Generate offers from metrics
- ✅ `POST /api/plaid/link-token` - Create Plaid Link token
- ✅ `POST /api/plaid/exchange` - Exchange public token
- ✅ `POST /api/plaid/transactions` - Get transactions
- ✅ `POST /api/connectors` - Store connector configurations

### 7. Start Both Servers

Terminal 1 (API):
```bash
cd lw-chat-bot
npm run dev
```

Terminal 2 (Frontend):
```bash
cd lw-chat-frontend
npm run dev
```

### 8. Test the Integration

1. Open http://localhost:5173 (Vite default port)
2. Upload 3 PDF files using the file input
3. Click "Analyze Statements"
4. Click "Generate Offers" once analysis completes
5. Test Plaid integration (requires valid Plaid credentials)

## 🔧 API Endpoint Details

### Bank Analysis (`POST /api/bank/parse`)

**Request:** FormData with 3 PDF files
**Response:** 
```json
{
  "avg_monthly_revenue": 80000,
  "avg_daily_balance_3m": 12000,
  "total_nsf_3m": 1,
  "total_days_negative_3m": 2
}
```

### Offers Generation (`POST /api/offers`)

**Request:**
```json
{
  "avg_monthly_revenue": 80000,
  "avg_daily_balance_3m": 12000,
  "total_nsf_3m": 1,
  "total_days_negative_3m": 2,
  "overrides": {
    "tiers": [...],
    "caps": {...},
    "thresholds": {...}
  }
}
```

**Response:**
```json
{
  "offers": [
    {
      "amount": 57600,
      "fee": 1.25,
      "term_days": 120,
      "payback": 72000,
      "est_daily": 600,
      "rationale": "• Competitive terms\n• Flexible repayment\n• Quick funding"
    }
  ]
}
```

### Plaid Link Token (`POST /api/plaid/link-token`)

**Request:**
```json
{
  "user_id": "optional_user_id"
}
```

**Response:**
```json
{
  "link_token": "link-sandbox-...",
  "expiration": "2024-01-01T12:00:00Z",
  "request_id": "req_..."
}
```

### Connectors (`POST /api/connectors`)

**Request:**
```json
{
  "name": "plaid",
  "config": {
    "client_id": "your_client_id",
    "secret": "your_secret"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "plaid",
    "status": "configured"
  }
}
```

## 🔐 Authentication

The API requires an `X-API-Key` header for all requests. Set this in your `.env`:

```bash
API_KEY_PARTNER=your-secure-api-key
```

The frontend will need to include this in requests. For development, you can temporarily disable auth or create a test key.

## 🎯 Frontend Features

The React component provides:

1. **Chat Interface** - Conversational UI for testing
2. **File Upload** - Drag & drop 3 PDFs for analysis  
3. **Metrics Display** - Shows parsed financial data
4. **Offers Generation** - Server-side or client-side rule testing
5. **Rules Editor** - Customize offer calculation parameters
6. **Connectors Panel** - Configure API keys for integrations
7. **Plaid Integration** - Connect bank accounts directly

## 🚨 Security Notes

- **Never store real API keys in the frontend** in production
- The connectors panel is for development/testing only
- Use environment variables for sensitive configuration
- Implement proper authentication for production use

## 🐛 Troubleshooting

**CORS Issues:**
- Ensure `CORS_ORIGIN` in your API `.env` includes your frontend URL
- For development, you might need `http://localhost:5173`

**File Upload Issues:**
- Check file size limits (25MB per PDF)
- Ensure exactly 3 PDF files are selected
- Verify `multer` is properly configured

**Plaid Integration:**
- Requires valid Plaid sandbox/development credentials
- Check that Plaid script loads properly
- Verify link token endpoint is working

**API Connection:**
- Verify API is running on the expected port
- Check network tab for request/response details
- Ensure API key authentication is working

## 📝 Next Steps

1. **Add Authentication** - Implement proper user auth
2. **Enhanced Error Handling** - Better error messages and retry logic  
3. **Real-time Updates** - WebSocket integration for job status
4. **Production Deployment** - Environment-specific configurations
5. **Testing** - Add frontend tests with React Testing Library

The frontend is now fully integrated with your Express + TypeScript API! 🎉