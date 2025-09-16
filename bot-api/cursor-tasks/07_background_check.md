# Task 07: Background Check

## Goal
Background check placeholder with async completion.

## Steps

### 1. POST /background/check: accept person payload; enqueue a job; return 202
- Accept client_id, first_name, last_name, ssn, date_of_birth
- Validate input with Zod schema
- Enqueue background check job
- Return 202 with check_id and status: "pending"

### 2. Worker simulates provider call, writes summarized flags
- Create background worker process
- Simulate call to CLEAR or other provider
- Write results to database with format:
  ```typescript
  {
    decision: "approved" | "declined",
    notes: string,
    raw: object // provider-specific data
  }
  ```

### 3. Fire webhook event background.completed
- Send webhook to LENDWIZELY_WEBHOOK_URL if configured
- Include check_id, client_id, decision, and notes
- Retry webhook on failure with exponential backoff

### 4. Implement background check service
Create `/src/services/background-check.ts`:
- `initiateCheck(request: BackgroundCheckRequest)` - Enqueue job
- `processCheck(checkId: string)` - Worker function
- `getCheckStatus(checkId: string)` - Get current status

### 5. Add job queue and worker
- Use Bull/BullMQ for job processing
- Implement worker with retry logic
- Add job status tracking

### 6. Database schema
```sql
CREATE TABLE background_checks (
  id VARCHAR(255) PRIMARY KEY,
  client_id VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  ssn_hash VARCHAR(255) NOT NULL, -- Hashed SSN for security
  date_of_birth DATE NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  decision ENUM('approved', 'declined') NULL,
  notes TEXT NULL,
  raw_data JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL
);
```

## Environment variables
```env
# Background check provider (placeholder)
CLEAR_API_KEY=your-clear-api-key
CLEAR_BASE_URL=https://api.clear.com

# Job queue
REDIS_URL=redis://localhost:6379

# Webhooks
LENDWIZELY_WEBHOOK_URL=https://app.lendwizely.com/api/bot-events
```

## Tests
- [ ] Job flow: initiate → process → complete
- [ ] Summary formatting logic
- [ ] Webhook firing on completion
- [ ] Error handling for failed checks
- [ ] SSN hashing for security
- [ ] Job retry logic
- [ ] Status tracking

## Example initiate request
```bash
curl -X POST http://localhost:8080/background/check \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "client-123",
    "first_name": "John",
    "last_name": "Doe",
    "ssn": "123-45-6789",
    "date_of_birth": "1990-01-15"
  }'
```

## Example initiate response
```json
{
  "check_id": "check-456",
  "status": "pending"
}
```

## Example status check
```bash
curl -X GET http://localhost:8080/background/check/check-456 \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## Example status response
```json
{
  "check_id": "check-456",
  "status": "completed",
  "decision": "approved",
  "notes": "No criminal history found. Identity verified.",
  "completed_at": "2024-01-15T10:30:00Z"
}
```

## Example webhook payload
```json
{
  "event": "background.completed",
  "data": {
    "check_id": "check-456",
    "client_id": "client-123",
    "decision": "approved",
    "notes": "No criminal history found. Identity verified."
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Worker simulation logic
```typescript
// Simulate provider call with realistic delays
async function simulateProviderCall(data: BackgroundCheckRequest) {
  await new Promise(resolve => setTimeout(resolve, 5000)); // 5s delay
  
  // Simulate different outcomes based on data
  const random = Math.random();
  if (random < 0.1) {
    return { decision: "declined", notes: "Criminal history found" };
  } else if (random < 0.2) {
    return { decision: "declined", notes: "Identity verification failed" };
  } else {
    return { decision: "approved", notes: "No issues found. Identity verified." };
  }
}
```

## Deliverables
- [ ] Background check initiation endpoint
- [ ] Job queue with Bull/BullMQ
- [ ] Worker process with simulation logic
- [ ] Status checking endpoint
- [ ] Webhook integration
- [ ] Database schema with SSN hashing
- [ ] Comprehensive test suite
- [ ] Updated .env.example
- [ ] README with examples