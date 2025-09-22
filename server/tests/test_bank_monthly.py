import math
from services.bank_monthly import build_monthly_rows

def test_build_monthly_rows_empty():
    """Test with empty payload"""
    result = build_monthly_rows({})
    assert result == []

def test_build_monthly_rows_no_statements():
    """Test with payload missing statements"""
    payload = {"other_data": "value"}
    result = build_monthly_rows(payload)
    assert result == []

def test_build_monthly_rows_single_month():
    """Test with single month data"""
    payload = {
        "statements": [
            {
                "month": "2025-08",
                "source_file": "statement1.pdf",
                "period": "2025-08-01_to_2025-08-31",
                "beginning_balance": 10000.0,
                "ending_balance": 12000.0,
                "daily_endings": [10000, 10500, 11000, 11500, 12000],
                "transactions": [
                    {"date": "2025-08-01", "amount": 5000.0, "desc": "RADOVANOVIC PAYMENT"},
                    {"date": "2025-08-02", "amount": -1000.0, "desc": "PFSINGLE SETTLEMENT"},
                    {"date": "2025-08-03", "amount": 2000.0, "desc": "WIRE DEPOSIT"},
                    {"date": "2025-08-04", "amount": -500.0, "desc": "ZELLE PAYMENT"},
                    {"date": "2025-08-05", "amount": 1500.0, "desc": "mobile check deposit"},
                    {"date": "2025-08-06", "amount": -300.0, "desc": "AMEX PAYMENT"},
                ]
            }
        ]
    }
    
    result = build_monthly_rows(payload)
    assert len(result) == 1
    
    row = result[0]
    assert row["file"] == "statement1.pdf"
    assert row["period"] == "2025-08-01_to_2025-08-31"
    assert row["beginning_balance"] == 10000.0
    assert row["ending_balance"] == 12000.0
    assert row["net_change"] == 2000.0
    
    # Check deposits
    assert row["total_deposits"] == 8500.0  # 5000 + 2000 + 1500
    assert row["deposit_count"] == 3
    assert row["deposits_from_RADOVANOVIC"] == 5000.0
    assert row["wire_credits"] == 2000.0
    assert row["mobile_check_deposits"] == 1500.0
    
    # Check withdrawals (negative values)
    assert row["total_withdrawals"] == -1800.0  # -(1000 + 500 + 300)
    assert row["withdrawal_count"] == 3
    assert row["withdrawals_PFSINGLE_PT"] == 1000.0
    assert row["withdrawals_Zelle"] == 500.0
    assert row["withdrawals_AMEX"] == 300.0
    
    # Check min/max balances
    assert row["min_daily_ending_balance"] == 10000
    assert row["max_daily_ending_balance"] == 12000

def test_build_monthly_rows_multiple_months():
    """Test with multiple months"""
    payload = {
        "statements": [
            {
                "month": "2025-07",
                "beginning_balance": 5000.0,
                "ending_balance": 8000.0,
                "daily_endings": [5000, 6000, 7000, 8000],
                "transactions": [
                    {"date": "2025-07-01", "amount": 3000.0, "desc": "DEPOSIT"},
                    {"date": "2025-07-02", "amount": -1000.0, "desc": "PFSINGLE PT"},
                ]
            },
            {
                "month": "2025-08",
                "beginning_balance": 8000.0,
                "ending_balance": 10000.0,
                "daily_endings": [8000, 9000, 10000],
                "transactions": [
                    {"date": "2025-08-01", "amount": 2500.0, "desc": "DEPOSIT"},
                    {"date": "2025-08-02", "amount": -500.0, "desc": "SBA LOAN PAYMENT"},
                ]
            }
        ]
    }
    
    result = build_monthly_rows(payload)
    assert len(result) == 2
    
    # Check first month
    row1 = result[0]
    assert row1["beginning_balance"] == 5000.0
    assert row1["ending_balance"] == 8000.0
    assert row1["withdrawals_PFSINGLE_PT"] == 1000.0
    
    # Check second month
    row2 = result[1]
    assert row2["beginning_balance"] == 8000.0
    assert row2["ending_balance"] == 10000.0
    assert row2["withdrawals_SBA_EIDL"] == 500.0

def test_build_monthly_rows_pattern_matching():
    """Test regex patterns for categorization"""
    payload = {
        "statements": [
            {
                "month": "2025-08",
                "beginning_balance": 10000.0,
                "ending_balance": 10000.0,
                "daily_endings": [10000],
                "transactions": [
                    # Test various patterns
                    {"date": "2025-08-01", "amount": -100.0, "desc": "PFSINGLE PAYMENT"},
                    {"date": "2025-08-02", "amount": -200.0, "desc": "SETTLMT PFSINGLE PT"},
                    {"date": "2025-08-03", "amount": -300.0, "desc": "Electronic Settlement"},
                    {"date": "2025-08-04", "amount": -150.0, "desc": "ZELLE TRANSFER"},
                    {"date": "2025-08-05", "amount": -250.0, "desc": "CHASE CC PAYMENT"},
                    {"date": "2025-08-06", "amount": -175.0, "desc": "AMEX CARD"},
                    {"date": "2025-08-07", "amount": -125.0, "desc": "CADENCE BANK"},
                    {"date": "2025-08-08", "amount": -400.0, "desc": "SBA EIDL PAYMENT"},
                    {"date": "2025-08-09", "amount": -225.0, "desc": "NAV TECHNOLOGIES"},
                    {"date": "2025-08-10", "amount": 500.0, "desc": "RADOVANOVIC DEPOSIT"},
                    {"date": "2025-08-11", "amount": 300.0, "desc": "mobile check deposit"},
                    {"date": "2025-08-12", "amount": 800.0, "desc": "WIRE TRANSFER IN"},
                ]
            }
        ]
    }
    
    result = build_monthly_rows(payload)
    row = result[0]
    
    # Test withdrawal patterns
    assert row["withdrawals_PFSINGLE_PT"] == 600.0  # 100 + 200 + 300
    assert row["withdrawals_Zelle"] == 150.0
    assert row["withdrawals_CHASE_CC"] == 250.0
    assert row["withdrawals_AMEX"] == 175.0
    assert row["withdrawals_CADENCE_BANK"] == 125.0
    assert row["withdrawals_SBA_EIDL"] == 400.0
    assert row["withdrawals_Nav_Technologies"] == 225.0
    
    # Test deposit patterns
    assert row["deposits_from_RADOVANOVIC"] == 500.0
    assert row["mobile_check_deposits"] == 300.0
    assert row["wire_credits"] == 800.0

def test_build_monthly_rows_missing_fields():
    """Test handling of missing fields"""
    payload = {
        "statements": [
            {
                # Missing some fields
                "beginning_balance": 1000,
                "ending_balance": 1500,
                "transactions": [
                    {"amount": 500, "desc": "PAYMENT"}  # Missing date
                ]
                # Missing daily_endings, source_file, period
            }
        ]
    }
    
    result = build_monthly_rows(payload)
    assert len(result) == 1
    
    row = result[0]
    assert row["file"] == ""  # Should default to empty string
    assert row["period"] is None
    assert row["beginning_balance"] == 1000
    assert row["ending_balance"] == 1500
    assert row["min_daily_ending_balance"] is None
    assert row["max_daily_ending_balance"] is None
    assert row["total_deposits"] == 500.0
    assert row["deposit_count"] == 1

def test_money_normalization():
    """Test the _money helper function with various inputs"""
    from services.bank_monthly import _money
    
    assert _money(100) == 100.0
    assert _money(100.5) == 100.5
    assert _money("150") == 150.0
    assert _money("200.75") == 200.75
    assert _money(None) == 0.0
    assert _money("invalid") == 0.0
    assert _money("") == 0.0