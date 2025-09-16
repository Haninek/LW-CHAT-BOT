#!/bin/bash

# Test script for enhanced features
API_BASE="http://localhost:8080"
API_KEY="test-api-key"

echo "🧪 Testing Enhanced Features"
echo "=================================="

# Generate encryption key if needed
if [ ! -f .env ] || ! grep -q "ENCRYPTION_KEY" .env; then
    echo "⚠️  Generating encryption key..."
    KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo "ENCRYPTION_KEY=$KEY" >> .env
    echo "✅ Encryption key added to .env"
fi

echo ""
echo "1. Testing Connector Storage..."
echo "--------------------------------"

# Save a test connector
curl -s -X POST "$API_BASE/api/connectors" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"name":"test-plaid","config":{"client_id":"test_client","secret":"test_secret"}}' | jq .

echo ""
echo "2. Testing Connector Retrieval (Masked)..."
echo "-------------------------------------------"

# Get masked config
curl -s "$API_BASE/api/connectors/test-plaid" \
  -H "X-API-Key: $API_KEY" | jq .

echo ""
echo "3. Testing Connector Reveal (DEV ONLY)..."
echo "-----------------------------------------"

# Get revealed config
curl -s "$API_BASE/api/connectors/test-plaid?reveal=true" \
  -H "X-API-Key: $API_KEY" | jq .

echo ""
echo "4. Testing Offers with Overrides..."
echo "-----------------------------------"

# Test offers with custom overrides
curl -s -X POST "$API_BASE/api/offers" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "avg_monthly_revenue": 80000,
    "avg_daily_balance_3m": 12000,
    "total_nsf_3m": 1,
    "total_days_negative_3m": 2,
    "overrides": {
      "tiers": [
        {"factor": 0.6, "fee": 1.22, "term_days": 110, "buy_rate": 1.18},
        {"factor": 0.8, "fee": 1.30, "term_days": 140, "buy_rate": 1.23}
      ],
      "caps": {"payback_to_monthly_rev": 0.24},
      "thresholds": {"max_nsf_3m": 4, "max_negative_days_3m": 8}
    }
  }' | jq .

echo ""
echo "5. Testing Connector Cleanup..."
echo "-------------------------------"

# Delete test connector
curl -s -X DELETE "$API_BASE/api/connectors/test-plaid" \
  -H "X-API-Key: $API_KEY" | jq .

echo ""
echo "✅ Enhanced features testing complete!"
echo "======================================"