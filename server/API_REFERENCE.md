# UW Wizard API Reference

## Authentication & Headers

All API requests require these headers:

```bash
X-Tenant-ID: <tenant_identifier>        # Required for multi-tenant isolation
Idempotency-Key: <unique_request_key>    # Required for POST requests
Content-Type: application/json          # For JSON payloads
```

## Base URL
- **Development**: `http://localhost:8000`
- **Production**: `https://your-domain.com`

---

## Deal Management

### Start or Find Deal
Create a new deal or find existing deal by merchant matching.

**Endpoint:** `POST /api/deals/start`

**Request:**
```json
{
  "merchant_hint": {
    "phone": "+19735550188",
    "legal_name": "Maple Deli LLC",
    "email": "contact@mapledeli.com"
  },
  "create_if_missing": true
}
```

**Response:**
```json
{
  "deal_id": "deal_01234567",
  "merchant_id": "mer_87654321", 
  "status": "open",
  "created": true,
  "merchant": {
    "id": "mer_87654321",
    "legal_name": "Maple Deli LLC",
    "phone": "+19735550188",
    "email": "contact@mapledeli.com"
  }
}
```

---

## Intake Process

### Initialize Intake Session
Start the intake process for a specific deal.

**Endpoint:** `POST /api/intake/start`

**Request:**
```json
{
  "merchant_id": "mer_87654321",
  "deal_id": "deal_01234567",
  "source": "web"
}
```

**Response:**
```json
{
  "intake_id": "int_12345678",
  "deal_id": "deal_01234567",
  "merchant_id": "mer_87654321",
  "status": "active",
  "fields_required": [
    "business.legal_name",
    "business.tax_id", 
    "owner.first_name",
    "owner.last_name",
    "owner.ssn_last4",
    "business.monthly_revenue"
  ]
}
```

### Submit Intake Answers
Submit answers to intake questions with validation.

**Endpoint:** `POST /api/intake/answer`

**Request:**
```json
{
  "merchant_id": "mer_87654321",
  "deal_id": "deal_01234567", 
  "source": "intake",
  "answers": [
    {
      "field_id": "owner.ssn_last4",
      "value": "1234"
    },
    {
      "field_id": "business.monthly_revenue",
      "value": "80000"
    }
  ]
}
```

**Response:**
```json
{
  "status": "saved",
  "field_id": "multiple",
  "missing": [
    "business.tax_id",
    "owner.first_name"
  ],
  "confirm": []
}
```

---

## Document Upload

### Upload Bank Statements
Upload exactly 3 PDF bank statements with validation and antivirus scanning.

**Endpoint:** `POST /api/documents/bank/upload`

**Query Parameters:**
- `merchant_id` (required): Merchant identifier
- `deal_id` (required): Deal identifier

**Request:** `multipart/form-data`
```bash
curl -X POST "http://localhost:8000/api/documents/bank/upload?merchant_id=mer_123&deal_id=deal_456" \
  -H "X-Tenant-ID: T1" \
  -H "Idempotency-Key: upload-001" \
  -F "files=@statement1.pdf" \
  -F "files=@statement2.pdf" \
  -F "files=@statement3.pdf"
```

**Response:**
```json
{
  "ok": true,
  "documents": [
    {
      "id": "doc_12345",
      "filename": "statement1.pdf"
    },
    {
      "id": "doc_12346", 
      "filename": "statement2.pdf"
    },
    {
      "id": "doc_12347",
      "filename": "statement3.pdf"
    }
  ],
  "metrics": {
    "avg_monthly_revenue": 80000,
    "avg_daily_balance_3m": 12000,
    "total_nsf_3m": 1,
    "total_days_negative_3m": 2
  }
}
```

**Validation Rules:**
- Exactly 3 files required
- PDF format only (`application/pdf`)
- Maximum 12MB per file
- Antivirus scanning performed
- Automatic metrics extraction

---

## Offer Generation

### Generate Underwriting Offers
Generate funding offers based on underwriting analysis with California compliance.

**Endpoint:** `POST /api/deals/{deal_id}/offers`

**Request:**
```json
{
  "avg_monthly_revenue": 80000,
  "avg_daily_balance_3m": 12000,
  "total_nsf_3m": 1,
  "total_days_negative_3m": 2,
  "overrides": {
    "tiers": [
      {"factor": 0.8, "fee": 1.15, "term_days": 90, "buy_rate": 1.12}
    ]
  }
}
```

**Response - Approved:**
```json
{
  "offers": [
    {
      "id": "offer_789abc",
      "tier": 1,
      "amount": 64000,
      "factor": 0.8,
      "fee": 1.15,
      "payback_amount": 73600,
      "term_days": 90,
      "buy_rate": 1.12,
      "expected_margin": 1920,
      "daily_payment": 818,
      "risk_score": 0.65,
      "underwriting_decision": "approved",
      "terms_compliant": true,
      "compliance_issues": [],
      "rationale": "Based on $80,000/month revenue, 90-day term"
    },
    {
      "id": "offer_789def",
      "tier": 2, 
      "amount": 80000,
      "factor": 1.0,
      "fee": 1.20,
      "payback_amount": 96000,
      "term_days": 120,
      "buy_rate": 1.16,
      "expected_margin": 3200,
      "daily_payment": 800,
      "risk_score": 0.65,
      "underwriting_decision": "approved",
      "terms_compliant": true,
      "compliance_issues": [],
      "rationale": "Based on $80,000/month revenue, 120-day term"
    }
  ],
  "underwriting_decision": "approved",
  "underwriting_summary": {
    "approved": true,
    "risk_score": 0.65,
    "ca_compliant": true,
    "max_offer_amount": 100000,
    "violation_count": 0,
    "reasons": []
  },
  "metrics_used": {
    "avg_monthly_revenue": 80000,
    "avg_daily_balance_3m": 12000,
    "total_nsf_3m": 1,
    "total_days_negative_3m": 2,
    "underwriting_risk_score": 0.65
  }
}
```

**Response - Declined:**
```json
{
  "offers": [],
  "underwriting_decision": "declined",
  "decline_reasons": [
    "Revenue below minimum threshold",
    "Excessive NSF activity"
  ],
  "violations": [
    {
      "rule_id": "CA_MIN_REVENUE",
      "description": "Minimum monthly revenue requirement",
      "severity": "high",
      "actual_value": 15000,
      "threshold_value": 25000
    }
  ],
  "risk_score": 0.95,
  "ca_compliant": false
}
```

**Response - Manual Review:**
```json
{
  "offers": [],
  "underwriting_decision": "manual_review",
  "reasons": [
    "Borderline risk metrics require human review",
    "Recent NSF activity pattern"
  ],
  "message": "This application requires manual underwriting review before offers can be generated"
}
```

---

## Background Checks

### Run Comprehensive Background Check
Execute background verification including CLEAR, NYSCEF, and business ownership checks.

**Endpoint:** `POST /api/background/check`

**Request:**
```json
{
  "merchant_id": "mer_87654321",
  "deal_id": "deal_01234567",
  "person": {
    "first_name": "John",
    "last_name": "Smith",
    "date_of_birth": "1980-01-01",
    "ssn_last4": "1234",
    "email": "john@example.com",
    "phone": "+19735550188"
  },
  "business": {
    "legal_name": "Maple Deli LLC",
    "ein": "12-3456789",
    "state": "CA", 
    "formation_date": "2020-01-01"
  },
  "check_types": ["clear_identity", "clear_criminal", "nyscef_court"]
}
```

**Response:**
```json
{
  "job_id": 12345,
  "merchant_id": "mer_87654321",
  "status": "pending",
  "message": "Background check initiated"
}
```

### Get Background Check Status
Retrieve background check results with flag-only compliance data.

**Endpoint:** `GET /api/background/jobs/{job_id}`

**Response - Completed:**
```json
{
  "job_id": 12345,
  "merchant_id": "mer_87654321", 
  "status": "completed",
  "result": {
    "overall_flag": "OK",
    "checks_completed": [
      {
        "type": "clear_identity",
        "status": "OK",
        "flags": []
      },
      {
        "type": "clear_criminal", 
        "status": "FLAG",
        "flags": ["minor_traffic_violations"]
      },
      {
        "type": "nyscef_court",
        "status": "OK", 
        "flags": []
      }
    ],
    "risk_assessment": "low",
    "recommended_action": "proceed"
  },
  "created_at": "2025-09-19T18:42:00Z",
  "compliance_note": "Results contain flag-only indicators for compliance purposes"
}
```

**Response - Error:**
```json
{
  "job_id": 12345,
  "status": "error",
  "error": "API service temporarily unavailable",
  "message": "Background check failed"
}
```

---

## E-Signature Integration

### Send Document for Signature
Send contract documents for digital signature with optional force override.

**Endpoint:** `POST /api/sign/send`

**Query Parameters:**
- `deal_id` (required): Deal identifier
- `recipient_email` (required): Signer email address  
- `force` (optional): Override background check requirement

**Request:**
```bash
curl -X POST "http://localhost:8000/api/sign/send?deal_id=deal_456&recipient_email=owner@example.com&force=false" \
  -H "X-Tenant-ID: T1" \
  -H "Idempotency-Key: sign-001"
```

**Response:**
```json
{
  "success": true,
  "envelope_id": "mock-envelope-12345678",
  "recipient_email": "owner@example.com",
  "status": "sent",
  "force": false,
  "agreement_id": "agr_87654321",
  "message": "Document sent for signature"
}
```

**Error - Background Check Required:**
```json
{
  "error": "Background check not OK (FLAG); pass force=true to override"
}
```

### Signing Webhook
Handle webhook notifications from DocuSign/Dropbox Sign with signature verification.

**Endpoint:** `POST /api/sign/webhook`

**Headers:**
- `X-Dropbox-Sign-Signature`: HMAC signature for Dropbox Sign
- `X-DocuSign-Signature-1`: HMAC signature for DocuSign

**Request:**
```json
{
  "envelope_id": "mock-envelope-12345678",
  "status": "completed",
  "event_type": "signature_complete",
  "deal_id": "deal_01234567"
}
```

**Response:**
```json
{
  "status": "processed"
}
```

**Security Notes:**
- HMAC-SHA256 signature verification required
- Webhook deduplication prevents replay attacks
- Invalid signatures return 401 Unauthorized

---

## SMS Campaign Management

### Send SMS Campaign
Send bulk SMS messages with automatic rate limiting and STOP compliance.

**Endpoint:** `POST /api/sms/cherry/send`

**Request:**
```json
{
  "campaignName": "Pilot Campaign",
  "messages": [
    {
      "to": "+19735550188",
      "body": "Hi from UW Wizard! Great news about your funding application.",
      "merchant_id": "mer_87654321"
    },
    {
      "to": "+19735550199", 
      "body": "Your application is being processed.",
      "merchant_id": "mer_87654321"
    }
  ]
}
```

**Response:**
```json
{
  "campaign": "Pilot Campaign",
  "queued": 2
}
```

**Rate Limiting:**
- **Limit**: 2000 messages per minute per tenant
- **Method**: Token bucket with sliding window
- **Fallback**: In-memory store when Redis unavailable
- **Error**: 429 Too Many Requests when limit exceeded

**Automatic Features:**
- STOP footer appended if not present
- Opt-out consent checking before sending
- Invalid phone numbers filtered out
- Event logging for each queued message

### SMS Webhook - Inbound Messages
Handle inbound SMS messages and STOP opt-out requests.

**Endpoint:** `POST /api/sms/cherry/webhook`

**Request:**
```json
{
  "type": "inbound",
  "from": "+19735550188",
  "text": "STOP"
}
```

**Response:**
```json
{
  "ok": true
}
```

**STOP Processing:**
- Updates consent status to "opt_out" 
- Links to merchant record when available
- Logs sms.stop event for compliance
- Automatic - no response sent to user

---

## Error Handling

### Standard Error Format
```json
{
  "error": "Validation failed",
  "detail": "Missing required field: merchant_id", 
  "timestamp": "2025-09-19T18:42:00Z",
  "request_id": "req_12345678"
}
```

### Common HTTP Status Codes
- `200 OK` - Success
- `400 Bad Request` - Validation error or missing data
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate request (check idempotency)
- `422 Unprocessable Entity` - Business logic validation failed
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Idempotency Handling
- Same `Idempotency-Key` + request body returns cached response
- Different body with same key returns 409 Conflict
- Keys expire after 1 hour
- POST requests without idempotency key return 400 Bad Request

---

## Rate Limits

| Endpoint | Limit | Window | Scope |
|----------|-------|--------|-------|
| SMS Send | 2000 messages | 1 minute | Per tenant |
| Document Upload | 10 requests | 1 minute | Per tenant |
| Background Check | 100 requests | 1 hour | Per tenant |
| Offer Generation | 1000 requests | 1 hour | Per tenant |

---

## Webhook Security

### HMAC Signature Verification

**DocuSign:**
```
X-DocuSign-Signature-1: <HMAC-SHA256-hex>
```

**Dropbox Sign:** 
```
X-Dropbox-Sign-Signature: <HMAC-SHA256-hex>
```

**Verification Process:**
1. Extract raw request body
2. Compute HMAC-SHA256 with configured secret
3. Compare with provided signature header
4. Reject if signatures don't match

**Example Verification:**
```python
import hmac
import hashlib

def verify_webhook(body: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(), 
        body, 
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

---

## Testing

### Idempotency Testing
```bash
# First request
curl -X POST http://localhost:8000/api/deals/start \
  -H "X-Tenant-ID: T1" \
  -H "Idempotency-Key: test-123" \
  -H "Content-Type: application/json" \
  -d '{"merchant_hint":{"phone":"+19735550188"}}'

# Repeat with same key - should return cached response
curl -X POST http://localhost:8000/api/deals/start \
  -H "X-Tenant-ID: T1" \
  -H "Idempotency-Key: test-123" \
  -H "Content-Type: application/json" \
  -d '{"merchant_hint":{"phone":"+19735550188"}}'
```

### Rate Limit Testing
```bash
# Send rapid SMS requests to trigger rate limiting
for i in {1..2001}; do
  curl -X POST http://localhost:8000/api/sms/cherry/send \
    -H "X-Tenant-ID: T1" \
    -H "Idempotency-Key: sms-$i" \
    -H "Content-Type: application/json" \
    -d '{"campaignName":"test","messages":[{"to":"+15551234567","body":"test"}]}'
done
```

---

This API reference provides comprehensive documentation for integrating with the UW Wizard platform. For additional support, consult the main README.md or create a GitHub issue.