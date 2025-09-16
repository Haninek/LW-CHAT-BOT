# Task 03: PDF Parse Endpoint

## Goal
Implement POST /bank/parse (multipart) using OpenAI.

## Rules
- Accept exactly 3 PDFs; validate size/type
- Send to OpenAI and parse into Metrics schema (use JSON schema)
- Return Metrics; if model uncertainty, respond 422 with hints
- Log nothing sensitive; store a hash of files for dedupe if needed

## Steps

### 1. File upload validation
- Accept exactly 3 files via multipart/form-data
- Validate file type: PDF only
- Validate file size: ≤ 25MB per file
- Validate total upload size: ≤ 75MB

### 2. OpenAI integration
- Send 3 PDFs to OpenAI Responses API
- Use strict JSON schema for Metrics response
- Handle model uncertainty with 422 responses
- Include helpful error messages for parsing failures

### 3. Response handling
- Return normalized Metrics object
- Handle parsing errors gracefully
- Log file hashes for deduplication (not content)

### 4. Error cases
- Wrong file count (not exactly 3)
- Invalid MIME type (not PDF)
- File too large (> 25MB)
- OpenAI parsing failure
- Model uncertainty (low confidence)

### 5. Tests
Create comprehensive tests for:
- Happy path: 3 valid PDFs → Metrics
- Wrong file count: 2 or 4 files → 422
- Bad MIME type: non-PDF → 422
- File too large → 422
- OpenAI failure → 500
- Model uncertainty → 422 with hints

## Deliverables
- [ ] POST /bank/parse endpoint implemented
- [ ] File validation (count, type, size)
- [ ] OpenAI integration with JSON schema
- [ ] Proper error responses (422 for validation, 500 for server errors)
- [ ] Comprehensive test coverage
- [ ] Updated README with curl examples

## Example request
```bash
curl -X POST http://localhost:8080/bank/parse \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "files=@statement1.pdf" \
  -F "files=@statement2.pdf" \
  -F "files=@statement3.pdf"
```

## Example response
```json
{
  "avg_monthly_revenue": 15000.50,
  "avg_daily_balance_3m": 5000.25,
  "total_nsf_3m": 2,
  "total_days_negative_3m": 5
}
```

## Error response (422)
```json
{
  "error": "validation_error",
  "message": "Please upload exactly 3 PDF bank statements",
  "details": {
    "file_count": 2,
    "expected": 3
  }
}
```