cursor-tasks/03_pdf_parse_endpoint.md
Goal: Implement POST /bank/parse (multipart) using OpenAI.
Rules:
- Accept exactly 3 PDFs; validate size/type.
- Send to OpenAI and parse into Metrics schema (use JSON schema).
- Return Metrics; if model uncertainty, respond 422 with hints.
- Log nothing sensitive; store a hash of files for dedupe if needed.
Tests: happy path + wrong file count + bad MIME.
