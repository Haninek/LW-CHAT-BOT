# Task 02: Plaid and OpenAI Integration

## Goal
Integrate Plaid and OpenAI clients (no business logic yet).

## Steps

### 1. Add Plaid client library and functions
Create `/src/services/plaid.ts` with:
- `createLinkToken(clientId: string)` - Generate link token for Plaid Link
- `exchangePublicToken(publicToken: string, clientId: string)` - Exchange for access token
- `getTransactions(accessToken: string, startDate: string, endDate: string)` - Get transaction data
- `listStatements(accessToken: string, accountId: string)` - List available statements
- `downloadStatement(accessToken: string, statementId: string)` - Download statement PDF

### 2. Add OpenAI client with helper
Create `/src/services/openai.ts` with:
- `analyzeStatements(files: Buffer[])` - Send 3 PDFs to Responses API
- Use strict JSON schema for Metrics response:
  ```typescript
  interface Metrics {
    avg_monthly_revenue: number;
    avg_daily_balance_3m: number;
    total_nsf_3m: number;
    total_days_negative_3m: number;
  }
  ```
- Return normalized numbers with proper error handling

### 3. Add environment variables
Update `.env.example` with:
```env
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL_PARSE=gpt-4o-mini
OPENAI_MODEL_REASON=gpt-4o-mini

# Plaid
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
PLAID_PRODUCTS=transactions,statements
```

### 4. Add validation on boot
- Check all required environment variables are present
- Test Plaid connection on startup
- Test OpenAI API key validity

### 5. Unit tests
Create `/src/services/__tests__/` with:
- Mock Plaid responses for each function
- Mock OpenAI responses for statement analysis
- Test error handling for invalid tokens/keys

## Deliverables
- [ ] Plaid client with all required functions
- [ ] OpenAI client with statement analysis
- [ ] Environment validation on startup
- [ ] Unit tests with mocked responses
- [ ] Updated .env.example

## Example usage
```typescript
// Plaid
const linkToken = await plaidService.createLinkToken('client-123');
const accessToken = await plaidService.exchangePublicToken('public-token', 'client-123');

// OpenAI
const metrics = await openaiService.analyzeStatements([pdf1, pdf2, pdf3]);
// Returns: { avg_monthly_revenue: 15000, avg_daily_balance_3m: 5000, ... }
```