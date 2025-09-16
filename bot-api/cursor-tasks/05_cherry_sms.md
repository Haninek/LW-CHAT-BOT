# Task 05: Cherry SMS Integration

## Goal
Cherry SMS integration.

## Steps

### 1. POST /sms/cherry/send: send templated message
- Accept group_id, template, and variables
- Send message via Cherry SMS API
- Include "Reply STOP to opt out" in all messages
- Return message_id and status

### 2. POST /sms/cherry/webhook: parse inbound STOP/HELP
- Handle inbound webhook from Cherry SMS
- Parse STOP/HELP messages
- Update client consent state in database
- Return 200 to acknowledge receipt

### 3. Add minimal persistence
Create clients table with:
- `id` (UUID, primary key)
- `phone` (string, unique)
- `consent_sms` (boolean, default false)
- `consent_email` (boolean, default false)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### 4. Database setup
- Use SQLite for development (easy setup)
- Add migration scripts
- Create client repository/service

### 5. Tests
- Mock Cherry SMS API responses
- Test webhook STOP flips consent to false
- Test webhook HELP sends info message
- Test send message with template variables

## Deliverables
- [ ] POST /sms/cherry/send endpoint
- [ ] POST /sms/cherry/webhook endpoint
- [ ] Client database table and migrations
- [ ] Cherry SMS service integration
- [ ] Comprehensive test coverage
- [ ] Updated .env.example with Cherry variables

## Environment variables
```env
CHERRY_API_KEY=your-cherry-api-key
CHERRY_BASE_URL=https://api.cherrysms.com
```

## Example send request
```bash
curl -X POST http://localhost:8080/sms/cherry/send \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": "group-123",
    "template": "Hi {{name}}, your loan offer of ${{amount}} is ready! Reply STOP to opt out.",
    "variables": {
      "name": "John",
      "amount": "15000"
    }
  }'
```

## Example webhook payload
```json
{
  "from": "+1234567890",
  "message": "STOP",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Database schema
```sql
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  consent_sms BOOLEAN DEFAULT FALSE,
  consent_email BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Cherry SMS service functions
- `sendMessage(groupId, template, variables)` - Send templated SMS
- `handleWebhook(payload)` - Process inbound messages
- `updateConsent(phone, consent)` - Update client consent
- `getClientByPhone(phone)` - Find client by phone number