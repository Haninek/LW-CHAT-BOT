# Task 01: Scaffold API

## Goal
Create baseline API skeleton that matches openapi.yaml.

## Steps

### 1. Read openapi.yaml and generate router files/stubs for every path
- Create route files in `/src/routes/` for each endpoint group:
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
  - `health.ts` - /healthz, /readyz, /metrics

### 2. Implement /auth/token (API key → short-lived JWT)
- Create JWT service in `/src/services/auth.ts`
- Validate API key against environment variable
- Generate JWT with 30-minute expiration
- Return Bearer token format

### 3. Add middleware
- **CORS**: Allow https://app.lendwizely.com, credentials: true
- **Rate limiter**: 100 requests per 15 minutes per IP
- **Request logging**: Log method, path, status, duration, IP
- **Idempotency-Key**: Handle for POST requests, store in memory/Redis

### 4. Add health endpoints
- `GET /healthz`: Return {ok: true}
- `GET /readyz`: Check database connectivity, return {ready: true/false}
- `GET /metrics`: Basic Prometheus metrics (request count, duration, 4xx/5xx)

### 5. Add test harness and one smoke test
- Setup Jest/Vitest configuration
- Create test for `/healthz` returning 200
- Add npm scripts: `dev`, `build`, `test`

## Deliverables
- [ ] Compiling server with all route stubs
- [ ] JWT authentication working
- [ ] All middleware configured
- [ ] Health endpoints responding
- [ ] Test suite with smoke test
- [ ] README with run instructions + curl health check

## Example curl test
```bash
curl -X GET http://localhost:8080/healthz
# Expected: {"ok":true}
```

## Environment variables needed
```env
JWT_SECRET=your-secret-key
JWT_ISSUER=lw-bot
JWT_TTL_MIN=30
API_KEY_PARTNER=replace_me
```