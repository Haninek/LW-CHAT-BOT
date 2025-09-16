cursor-tasks/01_scaffold_api.md
Goal: Create baseline API skeleton that matches openapi.yaml.
Steps:
1) Read openapi.yaml and generate router files/stubs for every path.
2) Implement /auth/token (API key → short-lived JWT).
3) Add middleware: CORS (allow https://app.lendwizely.com), rate limiter (per IP), request logging, Idempotency-Key handling for POST.
4) Add health endpoints: GET /healthz, GET /readyz.
5) Add test harness and one smoke test (/healthz 200).
Deliverables:
- Compiling server, scripts: dev, build, test.
- README: run instructions + curl health check.
