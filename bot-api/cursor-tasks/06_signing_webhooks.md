# Task 06: Signing Webhooks

## Goal
E-sign provider integration.

## Steps

### 1. POST /sign/send: send PDF base64
- Accept client_id, document_base64, document_name, signer_email
- Send PDF to DocuSign or Dropbox Sign
- Return envelope/request id
- Store signing request in database

### 2. POST /sign/webhook: verify signature
- Verify webhook signature from provider
- Parse completion events (signed, declined, voided)
- Update contract status in database
- Fire event to LendWizely webhook if configured

### 3. Events stream: GET /events
- Return latest completions for polling
- Support `since` parameter for incremental updates
- Support `type` filter (sign.completed, sign.declined)
- Paginate results

### 4. Database schema
Add signing_requests table:
```sql
CREATE TABLE signing_requests (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  envelope_id TEXT UNIQUE NOT NULL,
  document_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, completed, declined, voided
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
```

### 5. Tests
- Webhook signature verification logic
- Document sending with base64 PDF
- Event streaming with pagination
- Status updates from webhooks

## Deliverables
- [ ] POST /sign/send endpoint
- [ ] POST /sign/webhook endpoint  
- [ ] GET /events endpoint with filtering
- [ ] DocuSign/Dropbox Sign integration
- [ ] Webhook signature verification
- [ ] Database schema and migrations
- [ ] Comprehensive test coverage

## Environment variables
```env
# DocuSign
DOCUSIGN_ACCOUNT_ID=your-account-id
DOCUSIGN_TOKEN=your-access-token
DOCUSIGN_BASE=https://demo.docusign.net

# OR Dropbox Sign
DROPBOX_SIGN_API_KEY=your-api-key

# Webhooks
PUBLIC_BASE_URL=https://api.yourbot.com
LENDWIZELY_WEBHOOK_URL=https://app.lendwizely.com/api/bot-events
```

## Example send request
```bash
curl -X POST http://localhost:8080/sign/send \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "client-123",
    "document_base64": "JVBERi0xLjQKJcfsj6IKNSAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDMgMCBSCi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDQgMCBSCj4+Cj4+Ci9Db250ZW50cyA2IDAgUgo+PgplbmRvYmoKNiAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVApxCjcyIDAgMCA3MiAwIDAgY20KL0YxIDEyIFRmCjAgMCAwIHJnCjAgNzIwIFRkCihIZWxsbyBXb3JsZCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago0IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvUGFnZXMKL0NvdW50IDEKL0tpZHMgWzUgMCBSXQo+PgplbmRvYmoKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMyAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL01ldGFkYXRhCi9Qcm9kdWNlciAoQWRvYmUgUERGIDEuNykKPj4KZW5kb2JqCjcgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCi9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nCj4+CmVuZG9iagp4cmVmCjAgOAowMDAwMDAwMDAwIDY1NTM1IGYKMDAwMDAwMDAwOSAwMDAwMCBuCjAwMDAwMDAwNTggMDAwMDAgbgowMDAwMDAwMTE1IDAwMDAwIG4KMDAwMDAwMDI3MiAwMDAwMCBuCjAwMDAwMDAzNDEgMDAwMDAgbgowMDAwMDAwNDQ5IDAwMDAwIG4KMDAwMDAwMDU5OCAwMDAwMCBuCnRyYWlsZXIKPDwKL1NpemUgOAovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNzI3CiUlRU9G",
    "document_name": "loan_agreement.pdf",
    "signer_email": "client@example.com"
  }'
```

## Example webhook payload (DocuSign)
```json
{
  "event": "envelope-completed",
  "envelope_id": "envelope-123",
  "status": "completed",
  "completed_date": "2024-01-15T10:30:00Z"
}
```

## Example events response
```json
{
  "events": [
    {
      "id": "event-123",
      "type": "sign.completed",
      "client_id": "client-123",
      "data": {
        "envelope_id": "envelope-123",
        "document_name": "loan_agreement.pdf"
      },
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Signing service functions
- `sendDocument(clientId, documentBase64, documentName, signerEmail)` - Send for signature
- `verifyWebhookSignature(payload, signature)` - Verify webhook authenticity
- `handleWebhookEvent(payload)` - Process completion events
- `getEvents(since, type)` - Get event stream
- `updateSigningStatus(envelopeId, status)` - Update request status