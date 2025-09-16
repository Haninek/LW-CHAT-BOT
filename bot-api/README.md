# LendWizely Bot API (FastAPI)

FastAPI-based implementation of the LendWizely AI Bot.

## Quick start

1) Create and activate a virtualenv (optional)
```bash
python3 -m venv .venv && source .venv/bin/activate
```

2) Install deps
```bash
pip install -e .[dev]
```

3) Run the server
```bash
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --reload
```

4) Health check
```bash
curl -s http://localhost:8080/healthz
```

## Project rules
See `.cursorrules` and `openapi.yaml`. Execute tasks in `/cursor-tasks` sequentially with Cursor Agent.
