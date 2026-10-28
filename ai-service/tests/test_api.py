"""
Automated Pytest Suite for SecureChainFlow AI Decision-Support Service
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "securechainflow-ai-service"
    assert "activeEngine" in data
    assert "timestamp" in data


def test_risk_score_nominal_batch():
    payload = {
        "batch": {
            "batchCode": "NOMINAL-001",
            "status": "STORED",
            "blockchainStatus": "COMMITTED",
            "manufactureDate": "2025-01-01T00:00:00Z",
            "expiryDate": "2027-01-01T00:00:00Z",
            "quantity": 500,
            "unit": "KG"
        },
        "events": [
            {
                "eventType": "REGISTERED",
                "occurredAt": "2025-01-01T08:00:00Z",
                "temperature": 3.8,
                "humidity": 55.0
            },
            {
                "eventType": "STORED",
                "occurredAt": "2025-01-01T12:00:00Z",
                "temperature": 4.1,
                "humidity": 58.0
            }
        ],
        "hashMismatches": 0,
        "totalEvents": 2
    }

    response = client.post("/api/v1/risk-score", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert 0 <= data["risk_score"] <= 100
    assert data["risk_level"] in ["LOW", "MEDIUM"]
    assert "model_version" in data
    assert "disclaimer" in data
    assert len(data["anomalies"]) > 0


def test_risk_score_temperature_excursion():
    payload = {
        "batch": {
            "batchCode": "EXCURSION-001",
            "status": "IN_TRANSIT",
            "blockchainStatus": "COMMITTED",
            "manufactureDate": "2025-01-01T00:00:00Z",
            "expiryDate": "2027-01-01T00:00:00Z"
        },
        "events": [
            {
                "eventType": "DISPATCHED",
                "occurredAt": "2025-01-01T08:00:00Z",
                "temperature": 4.0,
                "humidity": 60.0
            },
            {
                "eventType": "IN_TRANSIT",
                "occurredAt": "2025-01-01T14:00:00Z",
                "temperature": 18.5,  # Extreme cold-chain violation
                "humidity": 92.0   # Extreme humidity violation
            }
        ],
        "hashMismatches": 0,
        "totalEvents": 2
    }

    response = client.post("/api/v1/risk-score", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_score"] >= 20.0
    assert any("temperature excursion" in a.lower() for a in data["anomalies"])
    assert any("humidity excursion" in a.lower() for a in data["anomalies"])


def test_risk_score_recalled_batch_critical():
    payload = {
        "batch": {
            "batchCode": "RECALL-001",
            "status": "RECALLED",
            "blockchainStatus": "COMMITTED"
        },
        "events": [],
        "hashMismatches": 0,
        "totalEvents": 0
    }

    response = client.post("/api/v1/risk-score", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_score"] >= 80.0
    assert data["risk_level"] == "CRITICAL"
    assert any("recall" in a.lower() for a in data["anomalies"])


def test_risk_score_hash_tampering():
    payload = {
        "batch": {
            "batchCode": "TAMPER-001",
            "status": "QUALITY_APPROVED",
            "blockchainStatus": "COMMITTED"
        },
        "events": [
            {
                "eventType": "QUALITY_CHECKED",
                "occurredAt": "2025-01-01T10:00:00Z",
                "temperature": 4.0
            }
        ],
        "hashMismatches": 2,  # 2 cryptographic mismatches
        "totalEvents": 1
    }

    response = client.post("/api/v1/risk-score", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_score"] >= 50.0
    assert any("tampering" in a.lower() or "mismatch" in a.lower() for a in data["anomalies"])


def test_legacy_predict_endpoint():
    payload = {
        "batchId": "550e8400-e29b-41d4-a716-446655440000",
        "transitDurationHours": 24.5,
        "tempVariance": 1.2,
        "custodyHandovers": 2,
        "reportedExceptions": 0,
        "supplierReliabilityScore": 0.95
    }

    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["batchId"] == payload["batchId"]
    assert 0.0 <= data["riskScore"] <= 1.0
    assert data["riskCategory"] in ["LOW_RISK", "MODERATE_RISK", "ELEVATED_RISK", "CRITICAL_RISK"]
    assert isinstance(data["anomalyFlag"], bool)
