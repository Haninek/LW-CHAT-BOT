# Enhanced Features: Encrypted Connectors + Offers Overrides

This document covers the new encrypted connectors storage and offers overrides functionality added to the LendWizely API.

## 🔐 **Encrypted Connectors**

Store API keys and configurations securely with encryption at rest.

### Features

- **AES-256 Encryption**: All sensitive data encrypted using industry-standard encryption
- **Automatic Masking**: Sensitive fields automatically masked in responses
- **Reveal Mode**: Development-only mode to reveal actual values
- **Secure Storage**: Encrypted configurations stored in SQLite database

### Setup

1. **Generate Encryption Key**:
```bash
node scripts/generate-encryption-key.js
```

2. **Add to Environment**:
```bash
# Add to your .env file
ENCRYPTION_KEY=your-generated-64-character-hex-key
```

3. **Install Dependencies**:
```bash
npm install node-forge @types/node-forge
```

### API Endpoints

#### Save Connector
```bash
curl -X POST http://localhost:8080/api/connectors \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "name": "plaid",
    "config": {
      "client_id": "your_plaid_client_id",
      "secret": "your_plaid_secret"
    }
  }'
```

#### List Connectors
```bash
curl http://localhost:8080/api/connectors \
  -H "X-API-Key: your-api-key"
```

#### Get Connector (Masked)
```bash
curl http://localhost:8080/api/connectors/plaid \
  -H "X-API-Key: your-api-key"
# Returns: {"config": {"client_id": "********", "secret": "********"}}
```

#### Get Connector (Revealed - DEV ONLY)
```bash
curl "http://localhost:8080/api/connectors/plaid?reveal=true" \
  -H "X-API-Key: your-api-key"
# Returns: {"config": {"client_id": "actual_value", "secret": "actual_value"}}
```

#### Delete Connector
```bash
curl -X DELETE http://localhost:8080/api/connectors/plaid \
  -H "X-API-Key: your-api-key"
```

### Supported Connectors

- **plaid**: `client_id`, `secret`
- **cherry**: `api_key`, `base_url`
- **docusign**: `token`, `account_id`, `base`
- **dropboxsign**: `api_key`
- **clear**: `token`, `base`
- **custom**: Any key-value pairs

## 💰 **Offers Overrides**

Customize offer calculation parameters including buy rates, factor rates, caps, and thresholds.

### Features

- **Custom Tiers**: Override factor rates, fees, terms, and buy rates
- **Buy Rate Support**: Calculate expected margins automatically
- **Flexible Caps**: Customize payback-to-revenue ratios
- **Adjustable Thresholds**: Modify NSF and negative day limits
- **Backwards Compatible**: Works with existing offers endpoint

### Override Structure

```typescript
interface OfferOverrides {
  tiers?: Array<{
    factor: number;      // Advance factor (0.6 = 60% of base)
    fee: number;         // Factor rate (1.25 = 125%)
    term_days: number;   // Repayment term in days
    buy_rate?: number;   // Your cost of capital (optional)
  }>;
  caps?: {
    payback_to_monthly_rev: number; // Max payback/revenue ratio (0.25 = 25%)
  };
  thresholds?: {
    max_nsf_3m: number;           // Max NSF count (default: 3)
    max_negative_days_3m: number; // Max negative days (default: 6)
  };
}
```

### API Examples

#### Basic Offers (No Overrides)
```bash
curl -X POST http://localhost:8080/api/offers \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "avg_monthly_revenue": 80000,
    "avg_daily_balance_3m": 12000,
    "total_nsf_3m": 1,
    "total_days_negative_3m": 2
  }'
```

#### Offers with Custom Tiers and Buy Rates
```bash
curl -X POST http://localhost:8080/api/offers \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "avg_monthly_revenue": 80000,
    "avg_daily_balance_3m": 12000,
    "total_nsf_3m": 1,
    "total_days_negative_3m": 2,
    "overrides": {
      "tiers": [
        {
          "factor": 0.5,
          "fee": 1.22,
          "term_days": 110,
          "buy_rate": 1.18
        },
        {
          "factor": 0.8,
          "fee": 1.30,
          "term_days": 140,
          "buy_rate": 1.23
        },
        {
          "factor": 1.1,
          "fee": 1.38,
          "term_days": 180
        }
      ],
      "caps": {
        "payback_to_monthly_rev": 0.24
      },
      "thresholds": {
        "max_nsf_3m": 4,
        "max_negative_days_3m": 8
      }
    }
  }'
```

#### Enhanced Response with Buy Rates
```json
{
  "offers": [
    {
      "amount": 48000,
      "fee": 1.22,
      "term_days": 110,
      "payback": 58560,
      "est_daily": 532.36,
      "buy_rate": 1.18,
      "expected_margin": 1920,
      "rationale": "• Short term aligns with cash flow\n• Competitive margin opportunity\n• Quick repayment cycle"
    }
  ]
}
```

### Buy Rate Calculations

When `buy_rate` is provided:
- **Margin Rate** = `fee - buy_rate`
- **Expected Margin** = `amount × margin_rate`

Example:
- Amount: $48,000
- Fee: 1.22 (122%)
- Buy Rate: 1.18 (118%)
- Margin Rate: 0.04 (4%)
- Expected Margin: $48,000 × 0.04 = $1,920

## 🎯 **Frontend Integration**

The React frontend automatically supports both features:

### Connectors Panel
- Save API keys securely to backend
- View masked configurations
- Delete unused connectors

### Rules Editor
- Customize offer calculation parameters
- Test different scenarios locally or server-side
- Save rules to localStorage for quick testing

### Usage Flow
1. **Configure Connectors**: Add API keys via Connectors panel
2. **Set Custom Rules**: Modify tiers, caps, thresholds in Rules panel
3. **Generate Offers**: Choose local rules or server-side processing
4. **View Results**: See enhanced offers with buy rates and margins

## 🔒 **Security Considerations**

### Encryption
- Uses AES-256-CBC encryption
- Unique IV per encryption operation
- 32-byte encryption keys required
- Base64 encoded storage format

### Access Control
- API key authentication required
- Reveal mode restricted to development
- Sensitive fields automatically masked
- Audit logging for configuration changes

### Best Practices
- **Never commit encryption keys** to version control
- **Rotate keys regularly** in production
- **Use environment variables** for configuration
- **Enable audit logging** for compliance

## 🚀 **Production Deployment**

### Environment Setup
```bash
# Generate secure encryption key
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Set in production environment
export ENCRYPTION_KEY=$ENCRYPTION_KEY
```

### Database Migration
The connectors table is automatically created on startup. For production:

```sql
-- Verify table exists
SELECT name FROM sqlite_master WHERE type='table' AND name='connectors';

-- Check encryption is working
SELECT name, LENGTH(encrypted_config) as config_length FROM connectors;
```

### Monitoring
- Monitor encryption/decryption errors
- Track connector usage patterns
- Alert on failed reveal attempts
- Log override usage for compliance

## 📊 **Testing**

### Connector Encryption
```bash
# Test encryption roundtrip
curl -X POST http://localhost:8080/api/connectors \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key" \
  -d '{"name":"test","config":{"secret":"test-value"}}'

# Verify masking
curl http://localhost:8080/api/connectors/test \
  -H "X-API-Key: test-key"
# Should return: {"config": {"secret": "********"}}

# Verify decryption (dev only)
curl "http://localhost:8080/api/connectors/test?reveal=true" \
  -H "X-API-Key: test-key"
# Should return: {"config": {"secret": "test-value"}}
```

### Offers Overrides
```bash
# Test custom tiers
curl -X POST http://localhost:8080/api/offers \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key" \
  -d '{
    "avg_monthly_revenue": 50000,
    "avg_daily_balance_3m": 8000,
    "total_nsf_3m": 0,
    "total_days_negative_3m": 0,
    "overrides": {
      "tiers": [{"factor": 0.7, "fee": 1.25, "term_days": 120, "buy_rate": 1.20}]
    }
  }'
```

## 🛠 **Troubleshooting**

### Common Issues

**Encryption Key Error**:
```
Error: ENCRYPTION_KEY must be at least 32 characters
```
Solution: Generate a proper key with `node scripts/generate-encryption-key.js`

**Decryption Failed**:
```
Error: Decryption failed - invalid data or key
```
Solution: Key changed or data corrupted. Regenerate connectors.

**Override Validation Error**:
```
Error: Invalid offers request
```
Solution: Check override schema matches expected format.

### Debug Mode
Set `NODE_ENV=development` to enable additional logging:
- Connector save/load operations
- Override usage tracking
- Encryption/decryption timing
- AI rationale generation status

The enhanced features provide enterprise-grade security for sensitive configurations while enabling flexible business rule customization! 🎉