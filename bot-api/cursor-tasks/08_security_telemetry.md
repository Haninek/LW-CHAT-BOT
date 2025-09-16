# Task 08: Security & Telemetry

## Goal
Security & observability.

## Steps

### 1. Add audit logging
- Create audit table and helper functions
- Log all sensitive operations (auth, payments, data access)
- Include user_id, action, resource, timestamp, IP address
- Never log PII or sensitive data values

### 2. Add basic metrics
- Request count, latency, 4xx/5xx responses
- Expose via /metrics endpoint (Prometheus format)
- Track business metrics (offers generated, checks completed)
- Add health check metrics

### 3. Add request size limits
- Limit request body size to 2MB
- Limit file uploads to 25MB
- Add timeout handling for long requests
- Sanitize error messages (no stack traces in production)

### 4. Add CI pipeline
- Run tests on PR
- Block if coverage < 70%
- Run security scans
- Deploy to staging on merge

### 5. Security hardening
- Add request ID to all logs
- Implement proper CORS headers
- Add security headers (HSTS, CSP, etc.)
- Rate limiting per endpoint
- Input sanitization

## Database schema
```sql
CREATE TABLE audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE metrics (
  id VARCHAR(255) PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  labels JSON,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Environment variables
```env
# Security
NODE_ENV=production
LOG_LEVEL=info
REQUEST_TIMEOUT_MS=30000

# Monitoring
PROMETHEUS_PORT=9090
HEALTH_CHECK_INTERVAL=30

# CI/CD
GITHUB_TOKEN=your-github-token
```

## Metrics to track
```typescript
// HTTP metrics
http_requests_total{method, endpoint, status}
http_request_duration_seconds{method, endpoint}

// Business metrics
offers_generated_total{client_id}
background_checks_completed_total{decision}
sms_messages_sent_total{group_id}
documents_signed_total{status}

// System metrics
memory_usage_bytes
cpu_usage_percent
database_connections_active
```

## Security headers middleware
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

## Audit logging helper
```typescript
function auditLog(action: string, resource: string, userId?: string) {
  const logEntry = {
    id: generateId(),
    user_id: userId,
    action,
    resource,
    ip_address: req.ip,
    user_agent: req.get('User-Agent'),
    request_id: req.id,
    created_at: new Date()
  };
  
  // Store in database
  auditService.log(logEntry);
  
  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('AUDIT:', logEntry);
  }
}
```

## Tests
- [ ] Audit logging for sensitive operations
- [ ] Metrics collection and export
- [ ] Request size limits enforced
- [ ] Error message sanitization
- [ ] Security headers present
- [ ] Rate limiting works
- [ ] CI pipeline runs tests
- [ ] Coverage threshold enforced

## Example metrics endpoint
```bash
curl -X GET http://localhost:8080/metrics
```

```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",endpoint="/healthz",status="200"} 42
http_requests_total{method="POST",endpoint="/offers",status="200"} 15

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",endpoint="/healthz",le="0.1"} 40
http_request_duration_seconds_bucket{method="GET",endpoint="/healthz",le="0.5"} 42
```

## CI configuration (.github/workflows/ci.yml)
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run lint
      - run: npm run security:scan
```

## Deliverables
- [ ] Audit logging system
- [ ] Prometheus metrics endpoint
- [ ] Request size limits and timeouts
- [ ] Security headers middleware
- [ ] Error message sanitization
- [ ] CI/CD pipeline
- [ ] Coverage reporting
- [ ] Security scanning
- [ ] Updated documentation