# Task 01: Scaffold API

## Goal
Create baseline API skeleton that matches openapi.yaml.

## Steps

### 1. Read openapi.yaml and generate router files/stubs for every path
- Create route files in `/src/routes/` for each major endpoint group:
  - `auth.ts` - /auth/token
  - `clients.ts` - /clients, /clients/{id}
  - `sms.ts` - /sms/cherry/send, /sms/cherry/webhook
  - `intake.ts` - /intake
  - `plaid.ts` - /plaid/* endpoints
  - `bank.ts` - /bank/parse
  - `offers.ts` - /offers
  - `background.ts` - /background/check, /background/check/{id}
  - `sign.ts` - /sign/send, /sign/webhook
  - `events.ts` - /events
  - `health.ts` - /healthz, /readyz
  - `metrics.ts` - /metrics

### 2. Implement /auth/token (API key → short-lived JWT)
- Create JWT service in `/src/services/auth.ts`
- Implement token generation with configurable TTL
- Add API key validation against environment variable
- Return JWT with expiration time

### 3. Add middleware
- **CORS**: Allow https://app.lendwizely.com, credentials: true
- **Rate limiter**: Per IP, configurable limits
- **Request logging**: Structured JSON logs with request ID
- **Idempotency-Key**: Handle for POST requests, store in memory/Redis
- **Error handling**: Global error handler with structured responses

### 4. Add health endpoints
- `GET /healthz` - Simple health check (always 200)
- `GET /readyz` - Readiness check (check dependencies)

### 5. Add test harness and one smoke test
- Set up Jest or Vitest
- Create smoke test for `/healthz` endpoint
- Add test script to package.json

## Deliverables
- [ ] Compiling server with all route stubs
- [ ] Scripts: `dev`, `build`, `test`
- [ ] README: run instructions + curl health check
- [ ] All routes return appropriate HTTP status codes
- [ ] Basic middleware stack configured
- [ ] JWT authentication working
- [ ] At least one passing test

## Example curl test
```bash
curl -X GET http://localhost:8080/healthz
# Expected: {"ok": true}
```

## Environment variables needed
```env
PORT=8080
JWT_SECRET=your-secret-key
JWT_TTL_MIN=30
API_KEY_PARTNER=your-partner-api-key
```