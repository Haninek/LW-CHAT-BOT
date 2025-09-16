# Task 08: Security & Telemetry

## Goal
Security hardening and observability.

## Steps

### 1. Add audit logging
Create audit table and helper:
```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

- Log all sensitive operations (auth, offers, background checks, signing)
- Include user_id, action, resource, IP, user_agent
- Never log PII or sensitive data

### 2. Add basic metrics
- **Request metrics**: count, duration, 4xx/5xx rates
- **Endpoint**: GET /metrics (Prometheus format)
- **Health metrics**: database connectivity, external API health
- **Business metrics**: offers generated, background checks completed

### 3. Add request size limits
- Global request size limit: 10MB
- File upload limit: 25MB per file
- JSON payload limit: 2MB
- Reject oversized requests with 413

### 4. Sanitize error messages
- Never expose internal errors to clients
- Return generic error messages for 5xx
- Log full errors server-side only
- Include request_id for debugging

### 5. Add CI coverage gate
- Run tests on every PR
- Block merge if coverage < 70%
- Generate coverage reports
- Fail fast on linting errors

## Deliverables
- [ ] Audit logging system
- [ ] Prometheus metrics endpoint
- [ ] Request size limits
- [ ] Error message sanitization
- [ ] CI pipeline with coverage gate
- [ ] Security headers (HSTS, CSP, etc.)

## Environment variables
```env
# Security
REQUEST_SIZE_LIMIT=10mb
FILE_SIZE_LIMIT=25mb
JSON_SIZE_LIMIT=2mb

# Metrics
METRICS_ENABLED=true
METRICS_PORT=9090

# Audit
AUDIT_LOG_LEVEL=info
AUDIT_RETENTION_DAYS=90
```

## Example metrics endpoint
```bash
curl http://localhost:8080/metrics
```

Response:
```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",endpoint="/healthz",status="200"} 42

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="POST",endpoint="/offers",le="0.1"} 5
http_request_duration_seconds_bucket{method="POST",endpoint="/offers",le="0.5"} 12
http_request_duration_seconds_bucket{method="POST",endpoint="/offers",le="1.0"} 15

# HELP business_offers_generated_total Total offers generated
# TYPE business_offers_generated_total counter
business_offers_generated_total{decision="approved"} 25
business_offers_generated_total{decision="declined"} 8
```

## Security headers
```typescript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

## Audit logging example
```typescript
await auditLogger.log({
  user_id: clientId,
  action: 'offer_generated',
  resource_type: 'offer',
  resource_id: offerId,
  ip_address: req.ip,
  user_agent: req.get('User-Agent'),
  request_id: req.id
});
```

## CI configuration
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run test:coverage
      - run: npm run build
      - uses: codecov/codecov-action@v3
        with:
          fail_ci_if_error: true
          threshold: 70%
```

## Error sanitization
```typescript
// Before: Internal error exposed
res.status(500).json({ error: "Database connection failed: ECONNREFUSED" });

// After: Sanitized error
res.status(500).json({ 
  error: "Internal server error",
  request_id: req.id 
});
// Log full error server-side
logger.error("Database connection failed", { error: err, request_id: req.id });
```