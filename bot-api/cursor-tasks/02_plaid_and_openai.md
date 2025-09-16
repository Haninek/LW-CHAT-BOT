cursor-tasks/02_plaid_and_openai.md
Goal: Integrate Plaid and OpenAI clients (no business logic yet).
Steps:
1) Add Plaid client library and functions: createLinkToken, exchangePublicToken, getTransactions(start,end), listStatements(accountId), downloadStatement(statementId).
2) Add OpenAI client with a helper: analyzeStatements(files[]) that sends 3 PDFs to Responses API with strict JSON schema (Metrics) and returns normalized numbers.
3) Add env vars to .env.example and validation on boot.
4) Unit tests: mock Plaid/OpenAI responses.
Deliverables: clients in /services, with typed interfaces.
