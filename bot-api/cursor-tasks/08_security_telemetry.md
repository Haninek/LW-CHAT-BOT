Goal: Security & observability.
Steps:
1) Add audit logging (create an audit table and helper).
2) Add basic metrics (reqs, latency, 4xx/5xx) via /metrics (Prometheus) or simple JSON.
3) Add request size limits; sanitize error messages.
4) Add CI: run tests on PR; block if coverage < 70%.