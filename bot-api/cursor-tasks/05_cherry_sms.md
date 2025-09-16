# Task 05: Cherry SMS Integration

## Goal
Cherry SMS integration.

## Steps

### 1. POST /sms/cherry/send: send templated message to group_id
- Accept group_id, message template, and optional client_ids
- Include "Reply STOP to opt out." in all messages
- Use Cherry SMS API to send bulk messages
- Return message_id and sent_count

### 2. POST /sms/cherry/webhook: parse inbound STOP/HELP
- Handle inbound webhook from Cherry SMS
- Parse STOP and HELP responses
- Update client consent state in database
- Return 200 to acknowledge receipt

### 3. Add minimal persistence: clients table
Create database schema:
```sql
CREATE TABLE clients (
  id VARCHAR(255) PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255),
  consent_sms BOOLEAN DEFAULT true,
  consent_email BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 4. Implement Cherry SMS service
Create `/src/services/cherry-sms.ts`:
- `sendBulkMessage(groupId: string, message: string, clientIds?: string[])`
- `handleWebhook(payload: CherryWebhookPayload)`
- Validate webhook signatures if provided by Cherry

### 5. Add consent management
- Track SMS consent status per client
- Honor STOP requests immediately
- Log consent changes for audit

## Environment variables
```env
CHERRY_API_KEY=your-cherry-api-key
CHERRY_BASE_URL=https://api.cherrysms.com
CHERRY_WEBHOOK_SECRET=your-webhook-secret
```

## Tests
- [ ] Send mocked success response
- [ ] Webhook STOP flips consent to false
- [ ] Webhook HELP returns help message
- [ ] Invalid webhook signature rejected
- [ ] Bulk send with group_id
- [ ] Bulk send with specific client_ids
- [ ] Consent state persistence

## Example send request
```bash
curl -X POST http://localhost:8080/sms/cherry/send \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": "group-123",
    "message": "Your loan application has been approved! Reply STOP to opt out.",
    "client_ids": ["client-1", "client-2"]
  }'
```

## Example send response
```json
{
  "message_id": "msg-456",
  "sent_count": 2
}
```

## Example webhook payload
```json
{
  "phone": "+1234567890",
  "message": "STOP",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Webhook response
```json
{
  "status": "processed",
  "action": "consent_revoked"
}
```

## Deliverables
- [ ] Cherry SMS service implementation
- [ ] Send bulk messages endpoint
- [ ] Webhook handler for STOP/HELP
- [ ] Client consent tracking
- [ ] Database schema and migrations
- [ ] Comprehensive test suite
- [ ] Updated .env.example
- [ ] README with curl examples