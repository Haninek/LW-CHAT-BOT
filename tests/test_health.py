"""Tests for health endpoints."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    """Test health check endpoint."""
    response = client.get("/healthz")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] == "healthy"
    assert "timestamp" in data
    assert data["version"] == "1.0.0"


def test_readiness_check():
    """Test readiness check endpoint."""
    response = client.get("/readyz")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] in ["ready", "not_ready"]
    assert "timestamp" in data
    assert data["version"] == "1.0.0"
    assert "checks" in data
    assert isinstance(data["checks"], dict)


def test_readiness_check_structure():
    """Test readiness check response structure."""
    response = client.get("/readyz")
    data = response.json()
    
    checks = data["checks"]
    assert "config" in checks
    assert "openai" in checks
    assert "plaid" in checks
    
    # All check values should be strings
    for check_name, check_status in checks.items():
        assert isinstance(check_status, str)