# Task 06: Signing Webhooks

## Goal
e-sign provider integration.

## Steps

### 1. POST /sign/send: send PDF base64 to DocuSign or Dropbox Sign
- Accept client_id, document_base64, document_name, signer_email, signer_name
- Send document to chosen e-sign provider
- Return envelope/request id
- Support both DocuSign and Dropbox Sign

### 2. POST /sign/webhook: verify signature, mark contract status
- Verify webhook signature from e-sign provider
- Parse completion status (completed/declined)
- Update contract status in database
- Fire event to LendWizely webhook if configured

### 3. Events stream: GET /events?since=...
- Return latest completions for polling
- Support pagination with since timestamp
- Include event types: sign.completed, sign.declined

### 4. Implement e-sign service
Create `/src/services/signing.ts`:
- `sendForSigning(request: SignRequest)` - Send document to provider
- `handleWebhook(payload: WebhookPayload, signature: string)` - Process webhook
- `verifySignature(payload: string, signature: string)` - Verify webhook signature

### 5. Add contract tracking
Create database schema:
```sql
CREATE TABLE contracts (
  id VARCHAR(255) PRIMARY KEY,
  client_id VARCHAR(255) NOT NULL,
  envelope_id VARCHAR(255) NOT NULL,
  status ENUM('sent', 'completed', 'declined') DEFAULT 'sent',
  document_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL
);
```

## Environment variables
```env
# Choose one provider
DOCUSIGN_ACCOUNT_ID=your-account-id
DOCUSIGN_TOKEN=your-access-token
DOCUSIGN_BASE=https://demo.docusign.net

# OR
DROPBOX_SIGN_API_KEY=your-api-key

# Webhooks
PUBLIC_BASE_URL=https://api.yourbot.com
LENDWIZELY_WEBHOOK_URL=https://app.lendwizely.com/api/bot-events
```

## Tests
- [ ] Send document to DocuSign/Dropbox Sign
- [ ] Webhook signature verification logic
- [ ] Contract status updates
- [ ] Event generation for completions
- [ ] LendWizely webhook firing
- [ ] Events API pagination
- [ ] Error handling for failed sends

## Example send request
```bash
curl -X POST http://localhost:8080/sign/send \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "client-123",
    "document_base64": "JVBERi0xLjQKJcfsj6IKNSAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDMgMCBSCi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDQgMCBSCj4+Cj4+Ci9Db250ZW50cyA2IDAgUgo+PgplbmRvYmoKNiAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVApxCjcyIDAgMCA3MiAwIDAgY20KL0YxIDEyIFRmCjAgMCAwIHJnCjAgNzIwIFRkCihIZWxsbyBXb3JsZCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNwowMDAwMDAwMDAwIDY1NTM1IGYKMDAwMDAwMDAwOSAwMDAwMCBuCjAwMDAwMDAwNTggMDAwMDAgbgowMDAwMDAwMTE1IDAwMDAwIG4KMDAwMDAwMDI3MyAwMDAwMCBuCjAwMDAwMDAzNDEgMDAwMDAgbgowMDAwMDAwNDQ5IDAwMDAwIG4KdHJhaWxlcgo8PAovU2l6ZSA3Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo1NDkKJSVFT0Y=",
    "document_name": "loan_agreement.pdf",
    "signer_email": "client@example.com",
    "signer_name": "John Doe"
  }'
```

## Example send response
```json
{
  "envelope_id": "env-789",
  "status": "sent"
}
```

## Example webhook payload (DocuSign)
```json
{
  "event": "envelope-completed",
  "data": {
    "envelopeId": "env-789",
    "status": "completed"
  }
}
```

## Example events response
```bash
curl -X GET "http://localhost:8080/events?since=2024-01-15T10:00:00Z&limit=10"
```

```json
{
  "events": [
    {
      "id": "evt-123",
      "type": "sign.completed",
      "client_id": "client-123",
      "data": {
        "envelope_id": "env-789",
        "document_name": "loan_agreement.pdf"
      },
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Deliverables
- [ ] E-sign service with provider abstraction
- [ ] Send document endpoint
- [ ] Webhook handler with signature verification
- [ ] Contract tracking database
- [ ] Events API for polling
- [ ] LendWizely webhook integration
- [ ] Comprehensive test suite
- [ ] Updated .env.example
- [ ] README with examples