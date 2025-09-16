# Task 02: Plaid and OpenAI Integration

## Goal
Integrate Plaid and OpenAI clients (no business logic yet).

## Steps

### 1. Add Plaid client library and functions
Create `/src/services/plaid.ts` with:
- `createLinkToken(clientId: string)` - Generate link token for Plaid Link
- `exchangePublicToken(publicToken: string, clientId: string)` - Exchange for access token
- `getTransactions(accessToken: string, startDate: string, endDate: string)` - Get transactions
- `listStatements(accessToken: string, accountId: string)` - List available statements
- `downloadStatement(accessToken: string, statementId: string)` - Download statement PDF

### 2. Add OpenAI client with helper
Create `/src/services/openai.ts` with:
- `analyzeStatements(files: Buffer[])` - Send 3 PDFs to Responses API
- Use strict JSON schema for Metrics response
- Return normalized numbers with proper typing
- Handle API errors gracefully

### 3. Add environment variables
Update `.env.example` with:
```env
# Plaid
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_ENV=sandbox
PLAID_PRODUCTS=transactions,statements

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL_PARSE=gpt-4o-mini
OPENAI_MODEL_REASON=gpt-4o-mini
```

### 4. Add validation on boot
- Validate all required environment variables on server startup
- Fail fast if any required vars are missing
- Log which services are configured

### 5. Unit tests
Create tests in `/src/__tests__/`:
- Mock Plaid API responses
- Mock OpenAI API responses
- Test error handling scenarios
- Test data transformation logic

## Deliverables
- [ ] Plaid service with all required functions
- [ ] OpenAI service with PDF analysis capability
- [ ] Environment validation on startup
- [ ] Unit tests with mocked responses
- [ ] TypeScript interfaces for all data structures
- [ ] Error handling for API failures

## Example usage
```typescript
// Plaid
const linkToken = await plaidService.createLinkToken('client-123');
const accessToken = await plaidService.exchangePublicToken('public-token', 'client-123');

// OpenAI
const metrics = await openaiService.analyzeStatements([pdf1, pdf2, pdf3]);
```

## Dependencies to add
```json
{
  "plaid": "^12.0.0",
  "openai": "^4.0.0"
}
```