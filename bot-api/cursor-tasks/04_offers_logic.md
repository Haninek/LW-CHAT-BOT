# Task 04: Offers Logic

## Goal
Deterministic offers + AI rationale.

## Steps

### 1. Implement POST /offers that takes Metrics
- Accept client_id and Metrics object
- Validate input using Zod schema
- Return array of exactly 3 offers

### 2. Use deterministic math for offer calculation
Create `/src/services/offers.ts` with business rules:

**Factor Tiers:**
- Revenue < $5K/month: 1.35 factor
- Revenue $5K-$15K/month: 1.25 factor  
- Revenue > $15K/month: 1.15 factor

**Payback Caps:**
- Max 25% of monthly revenue
- Min $500, Max $50K

**NSF/Negative Day Rules:**
- >3 NSF in 3 months: decline
- >10 negative days in 3 months: decline
- 1-3 NSF: reduce offer by 20%
- 4-10 negative days: reduce offer by 15%

**Offer Amounts:**
- Offer 1: 50% of monthly revenue (capped)
- Offer 2: 75% of monthly revenue (capped)
- Offer 3: 100% of monthly revenue (capped)

### 3. Call OpenAI for rationale generation
- Send offer details to OpenAI with short prompt
- Generate concise rationale for each offer (2-3 bullets)
- No promises or guarantees in rationale
- Focus on business metrics and risk factors

### 4. Return structured offers
```typescript
interface Offer {
  amount: number;
  term_days: number;
  factor_rate: number;
  payback_amount: number;
  rationale: string;
}
```

## Example calculation
```typescript
// Input: avg_monthly_revenue = 10000, total_nsf_3m = 1, total_days_negative_3m = 2
// Factor: 1.25 (revenue tier)
// NSF penalty: 20% reduction
// Offer 1: 50% of 10000 = 5000, reduced by 20% = 4000
// Payback: 4000 * 1.25 = 5000
```

## Tests
- [ ] Revenue tier calculations
- [ ] NSF penalty applications
- [ ] Negative day penalties
- [ ] Payback caps (25% of monthly revenue)
- [ ] Minimum/maximum offer limits
- [ ] Decline scenarios (>3 NSF, >10 negative days)
- [ ] OpenAI rationale generation
- [ ] Edge cases (zero revenue, extreme values)

## Example request
```bash
curl -X POST http://localhost:8080/offers \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "client-123",
    "metrics": {
      "avg_monthly_revenue": 10000,
      "avg_daily_balance_3m": 5000,
      "total_nsf_3m": 1,
      "total_days_negative_3m": 2
    }
  }'
```

## Example response
```json
{
  "offers": [
    {
      "amount": 4000,
      "term_days": 90,
      "factor_rate": 1.25,
      "payback_amount": 5000,
      "rationale": "• 50% of monthly revenue based on $10K average\n• 20% reduction due to 1 NSF fee in 3 months\n• Strong daily balance of $5K supports repayment"
    },
    {
      "amount": 6000,
      "term_days": 90,
      "factor_rate": 1.25,
      "payback_amount": 7500,
      "rationale": "• 75% of monthly revenue with NSF penalty applied\n• Consistent revenue stream supports higher advance\n• Low negative balance days indicate good cash flow"
    },
    {
      "amount": 8000,
      "term_days": 90,
      "factor_rate": 1.25,
      "payback_amount": 10000,
      "rationale": "• Maximum 100% of monthly revenue with penalties\n• Strong financial metrics support full advance\n• Conservative factor rate reflects minor risk factors"
    }
  ]
}
```

## Deliverables
- [ ] Deterministic offer calculation logic
- [ ] OpenAI integration for rationale generation
- [ ] Input validation with Zod
- [ ] Comprehensive test suite
- [ ] Business rule documentation
- [ ] Updated README with examples