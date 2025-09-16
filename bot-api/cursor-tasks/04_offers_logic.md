Goal: Deterministic offers + AI rationale.
Steps:
1) Implement POST /offers that takes Metrics.
2) Use deterministic math (factor tiers, payback caps, NSF/negative-day rules).
3) Call OpenAI with a short prompt to generate a concise rationale for each offer (no promises).
4) Return list of 3 offers.
Tests: thresholds, rounding, cap at 25% of monthly revenue.