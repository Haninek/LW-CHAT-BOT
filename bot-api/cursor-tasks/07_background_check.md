# Task 07: Background Check

## Goal
Background check placeholder with async completion.

## Steps

### 1. POST /background/check: accept person payload
- Accept client_id and person_data (name, SSN, DOB)
- Enqueue background check job
- Return 202 with check_id
- Store request in database

### 2. Worker simulates provider call
- Create background worker process
- Simulate CLEAR or other provider API call
- Write summarized flags: {decision, notes, raw}
- Update database with results

### 3. Fire webhook event
- Send `background.completed` event to LendWizely callback
- Include decision, notes, and client_id
- Use configured webhook URL

### 4. Database schema
Add background_checks table:
```sql
CREATE TABLE background_checks (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, completed, failed
  decision TEXT, -- approved, declined, manual_review
  notes TEXT,
  raw_data TEXT, -- JSON of full provider response
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
```

### 5. GET /background/check/{check_id}
- Return current status and results
- Include decision and notes when completed
- Handle not found cases

### 6. Tests
- Job flow: enqueue → process → complete
- Summary formatting logic
- Webhook event firing
- Status updates

## Deliverables
- [ ] POST /background/check endpoint
- [ ] GET /background/check/{check_id} endpoint
- [ ] Background worker process
- [ ] Database schema and migrations
- [ ] Webhook event firing
- [ ] Comprehensive test coverage

## Environment variables
```env
# Background check provider (placeholder)
CLEAR_API_KEY=your-clear-api-key
CLEAR_BASE_URL=https://api.clear.com

# Webhooks
LENDWIZELY_WEBHOOK_URL=https://app.lendwizely.com/api/bot-events
```

## Example request
```bash
curl -X POST http://localhost:8080/background/check \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "client-123",
    "person_data": {
      "first_name": "John",
      "last_name": "Doe",
      "ssn": "123-45-6789",
      "date_of_birth": "1990-01-15"
    }
  }'
```

## Example response (202)
```json
{
  "check_id": "check-123",
  "status": "pending"
}
```

## Example status response
```json
{
  "check_id": "check-123",
  "status": "completed",
  "decision": "approved",
  "notes": "Clean background check. No criminal history found.",
  "completed_at": "2024-01-15T10:30:00Z"
}
```

## Background worker logic
```typescript
// Simulate provider call
const result = await clearProvider.checkBackground(personData);

// Summarize results
const summary = {
  decision: result.criminalHistory ? 'declined' : 'approved',
  notes: result.criminalHistory 
    ? 'Criminal history found' 
    : 'Clean background check',
  raw: result
};

// Update database
await updateBackgroundCheck(checkId, summary);

// Fire webhook
await fireWebhook('background.completed', {
  client_id,
  check_id: checkId,
  decision: summary.decision,
  notes: summary.notes
});
```

## Webhook event payload
```json
{
  "event": "background.completed",
  "client_id": "client-123",
  "check_id": "check-123",
  "decision": "approved",
  "notes": "Clean background check. No criminal history found.",
  "timestamp": "2024-01-15T10:30:00Z"
}
```