# Task 03: PDF Parse Endpoint

## Goal
Implement POST /bank/parse (multipart) using OpenAI.

## Rules
- Accept exactly 3 PDFs; validate size/type
- Send to OpenAI and parse into Metrics schema
- Return Metrics; if model uncertainty, respond 422 with hints
- Log nothing sensitive; store a hash of files for dedupe if needed

## Steps

### 1. Implement file upload validation
- Accept exactly 3 PDF files
- Validate file type (MIME type: application/pdf)
- Validate file size (≤ 25MB each)
- Use multer for multipart handling

### 2. Create OpenAI integration
- Send 3 PDFs to OpenAI Responses API
- Use strict JSON schema for Metrics response:
  ```json
  {
    "type": "object",
    "properties": {
      "avg_monthly_revenue": {"type": "number"},
      "avg_daily_balance_3m": {"type": "number"},
      "total_nsf_3m": {"type": "integer"},
      "total_days_negative_3m": {"type": "integer"}
    },
    "required": ["avg_monthly_revenue", "avg_daily_balance_3m", "total_nsf_3m", "total_days_negative_3m"]
  }
  ```

### 3. Handle model uncertainty
- If OpenAI returns low confidence or parsing errors, return 422
- Include helpful hints about what went wrong
- Suggest file format or content issues

### 4. Add deduplication
- Hash uploaded files to prevent duplicate processing
- Store hash in memory/Redis with TTL
- Return cached result if same files uploaded recently

### 5. Security and logging
- Never log file contents or sensitive data
- Log only file hashes and processing status
- Sanitize error messages

## Tests
- [ ] Happy path: 3 valid PDFs → Metrics response
- [ ] Wrong file count: 2 or 4 files → 422 error
- [ ] Bad MIME type: non-PDF files → 422 error
- [ ] File too large: >25MB → 422 error
- [ ] OpenAI API failure → 500 error
- [ ] Model uncertainty → 422 with hints
- [ ] Duplicate files → cached response

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
  "avg_daily_balance_3m": 8500.25,
  "total_nsf_3m": 2,
  "total_days_negative_3m": 5
}
```

## Error response (422)
```json
{
  "error": "parsing_failed",
  "message": "Unable to parse bank statements. Please ensure files are clear PDF bank statements from the last 3 months.",
  "hints": ["Check that statements show complete transaction history", "Ensure PDFs are not password protected"]
}
```

## Deliverables
- [ ] Working /bank/parse endpoint
- [ ] File validation middleware
- [ ] OpenAI integration with JSON schema
- [ ] Error handling for all failure cases
- [ ] Comprehensive test suite
- [ ] Updated README with curl examples