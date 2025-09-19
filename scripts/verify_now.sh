#!/usr/bin/env bash
set -e; FAIL=0
ok(){ echo "✔ $1"; }; no(){ echo "✘ $1"; FAIL=1; }

# Files we expect
for f in ".replit" "requirements.txt" "server/main.py" \
         "server/core/config.py" "server/core/idempotency.py" \
         "server/services/storage.py" "server/models/event.py" "server/models/deal.py" \
         "server/routes/documents.py" "server/routes/offers.py" \
         "server/routes/sign.py" "server/routes/sms.py" "server/routes/background.py"
do [ -f "$f" ] && ok "exists: $f" || no "missing: $f"; done

# CORS var (prefer plural)
grep -q "CORS_ORIGINS" server/core/config.py && ok "CORS_ORIGINS present" || no "CORS_ORIGINS not found"

# Background route name and idempotency
grep -qE "APIRouter\\(prefix=.*background" server/routes/background.py && ok "background router" || no "background router missing"
grep -q "/background/check" server/routes/background.py && ok "route: /api/background/check" || no "route not named /background/check"
grep -q "Depends\\(capture_body\\)" server/routes/background.py && ok "background: capture_body" || no "background: capture_body missing"
grep -q "require_idempotency" server/routes/background.py && ok "background: require_idempotency" || no "background: require_idempotency missing"

# Accept/Decline endpoints + idempotency + events
grep -q "/deals/.*/accept" server/routes/offers.py && ok "accept endpoint present" || no "accept endpoint missing"
grep -q "/deals/.*/decline" server/routes/offers.py && ok "decline endpoint present" || no "decline endpoint missing"
grep -q "offer.accepted" server/routes/offers.py && ok "event: offer.accepted" || no "event: offer.accepted missing"
grep -q "offer.declined" server/routes/offers.py && ok "event: offer.declined" || no "event: offer.declined missing"
grep -q "Depends\\(capture_body\\)" server/routes/offers.py && ok "offers: capture_body" || no "offers: capture_body missing"
grep -q "require_idempotency" server/routes/offers.py && ok "offers: require_idempotency" || no "offers: require_idempotency missing"

# Sign gating against background.result
grep -q "background.result" server/routes/sign.py && ok "sign: checks background.result" || no "sign: background gate missing"

# Deal default status open
grep -Eq 'status\s*=.*default\s*=\s*"open"' server/models/deal.py && ok "deal default=open" || no "deal default not open"

# Local storage fallback marker
grep -q "data/uploads" server/services/storage.py && ok "local storage fallback" || no "local storage fallback missing"

# Start a quick health check
( pkill -f "uvicorn .*server\\.main:app" >/dev/null 2>&1 || true
  nohup uvicorn server.main:app --host 0.0.0.0 --port 8000 >/tmp/uw.log 2>&1 & sleep 2
  curl -sf http://localhost:8000/api/healthz >/dev/null && ok "healthz OK" || no "healthz failed"
  pkill -f "uvicorn .*server\\.main:app" >/dev/null 2>&1 || true
) || true

[ $FAIL -eq 0 ] && echo "ALL PASS" || (echo "Some checks failed"; exit 1)