"""
SecureChainFlow AI/ML Inference Service
Provides predictive quality risk scoring, anomaly detection for supply-chain batches,
and transparent data provenance metadata using scikit-learn and heuristic guardrails.
"""

import os
import math
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Literal
import numpy as np
import pandas as pd
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import joblib

# ---------------------------------------------------------------------------
# Model Artifact Resolution
# ---------------------------------------------------------------------------
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "model-artifacts")
MODEL_FILE = os.path.join(MODEL_DIR, "batch_risk_classifier_v1.joblib")
_loaded_model = None

FEATURE_COLUMNS = [
    "temp_excursions",
    "temp_mean",
    "temp_std",
    "humidity_excursions",
    "humidity_mean",
    "custody_gap_hours_max",
    "total_events",
    "hash_mismatches",
    "is_expired",
    "is_recalled"
]


# Attempt eager load on import, and refresh on lifespan
try:
    if os.path.exists(MODEL_FILE):
        _loaded_model = joblib.load(MODEL_FILE)
        print(f"[AI Service] Successfully loaded scikit-learn model from {MODEL_FILE}")
    else:
        print("[AI Service] Note: Model artifact not found on disk; operating in heuristic mode.")
except Exception as e:
    print(f"[AI Service] Warning: Failed to load model artifact ({e}); using heuristic fallback.")
    _loaded_model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _loaded_model
    if _loaded_model is None and os.path.exists(MODEL_FILE):
        try:
            _loaded_model = joblib.load(MODEL_FILE)
            print(f"[AI Service] Lifespan loaded scikit-learn model from {MODEL_FILE}")
        except Exception as e:
            print(f"[AI Service] Lifespan load warning ({e})")
    yield


app = FastAPI(
    title="SecureChainFlow AI Decision-Support Service",
    version="1.2.0",
    description="Machine Learning Risk & Cold-Chain Anomaly Scoring Engine for Supply Chain Events",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Data Models
# ---------------------------------------------------------------------------

class EventRecord(BaseModel):
    eventType: str
    occurredAt: str
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    blockchainStatus: Optional[str] = None
    location: Optional[str] = None


class BatchSummary(BaseModel):
    batchCode: Optional[str] = None
    status: Optional[str] = None
    blockchainStatus: Optional[str] = None
    manufactureDate: Optional[str] = None
    expiryDate: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None


class RiskScoreRequest(BaseModel):
    """Structured risk scoring payload from the Express backend."""
    batch: BatchSummary
    events: List[EventRecord] = Field(default_factory=list)
    hashMismatches: int = Field(default=0, ge=0)
    totalEvents: int = Field(default=0, ge=0)


class RiskScoreResponse(BaseModel):
    risk_score: float = Field(description="0-100 continuous risk score")
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    anomalies: List[str]
    model_version: str
    generated_at: str
    feature_summary: Optional[Dict[str, Any]] = None
    disclaimer: str


class BatchFeatureInput(BaseModel):
    """Legacy /predict endpoint schema."""
    batchId: str = Field(..., description="Canonical Batch UUID")
    transitDurationHours: float = Field(..., ge=0.0)
    tempVariance: float = Field(..., ge=0.0)
    custodyHandovers: int = Field(..., ge=1)
    reportedExceptions: int = Field(default=0, ge=0)
    supplierReliabilityScore: float = Field(default=1.0, ge=0.0, le=1.0)


class PredictionResult(BaseModel):
    """Legacy /predict endpoint response."""
    batchId: str
    task: str
    riskScore: float
    riskCategory: str
    anomalyFlag: bool
    contributingFactors: List[str]
    modelVersion: str
    featureSchemaVersion: str
    generatedAt: str
    disclaimer: str


# ---------------------------------------------------------------------------
# Helper Utilities
# ---------------------------------------------------------------------------

def _parse_dt(dt_str: Optional[str]) -> Optional[datetime]:
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except ValueError:
        return None


def _classify_risk_level(score: float) -> Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
    if score >= 80.0:
        return "CRITICAL"
    elif score >= 50.0:
        return "HIGH"
    elif score >= 20.0:
        return "MEDIUM"
    return "LOW"


def extract_batch_features(payload: RiskScoreRequest) -> Dict[str, float]:
    """
    Extracts the 10 quantitative features required by the scikit-learn classifier pipeline.
    """
    batch = payload.batch
    events = payload.events

    temps = [ev.temperature for ev in events if ev.temperature is not None]
    humidities = [ev.humidity for ev in events if ev.humidity is not None]

    temp_mean = float(np.mean(temps)) if temps else 4.0
    temp_std = float(np.std(temps)) if len(temps) > 1 else 0.0

    temp_excursions = sum(1 for t in temps if t > 8.0 or t < -2.0)
    humidity_excursions = sum(1 for h in humidities if h > 85.0)
    humidity_mean = float(np.mean(humidities)) if humidities else 60.0

    # Custody gap calculation
    timestamps = []
    for ev in events:
        dt = _parse_dt(ev.occurredAt)
        if dt:
            timestamps.append(dt)

    max_gap_hours = 0.0
    if len(timestamps) >= 2:
        timestamps.sort()
        for i in range(1, len(timestamps)):
            gap = (timestamps[i] - timestamps[i - 1]).total_seconds() / 3600.0
            if gap > max_gap_hours:
                max_gap_hours = gap

    # Expiry flag
    is_expired = 0.0
    expiry_dt = _parse_dt(batch.expiryDate)
    if expiry_dt:
        # compare timezone-aware
        now_dt = datetime.now(timezone.utc)
        target_dt = expiry_dt if expiry_dt.tzinfo else expiry_dt.replace(tzinfo=timezone.utc)
        if target_dt < now_dt:
            is_expired = 1.0

    # Recalled flag
    is_recalled = 1.0 if batch.status == "RECALLED" else 0.0

    return {
        "temp_excursions": float(temp_excursions),
        "temp_mean": round(temp_mean, 2),
        "temp_std": round(temp_std, 2),
        "humidity_excursions": float(humidity_excursions),
        "humidity_mean": round(humidity_mean, 1),
        "custody_gap_hours_max": round(max_gap_hours, 1),
        "total_events": float(max(len(events), payload.totalEvents)),
        "hash_mismatches": float(payload.hashMismatches),
        "is_expired": is_expired,
        "is_recalled": is_recalled
    }


# ---------------------------------------------------------------------------
# Health Check Endpoint
# ---------------------------------------------------------------------------

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "securechainflow-ai-service",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "modelLoaded": _loaded_model is not None,
        "activeEngine": "scikit-learn-rf-v1.0.0" if _loaded_model else "heuristic-guardrail-v1.2",
        "featureSchemaVersion": "v1.0"
    }


# ---------------------------------------------------------------------------
# Main Risk Scoring Endpoint
# ---------------------------------------------------------------------------

@app.post("/api/v1/risk-score", response_model=RiskScoreResponse)
def compute_risk_score(payload: RiskScoreRequest):
    """
    Computes a 0-100 risk score and anomaly diagnosis for a supply chain batch.
    Uses the trained Random Forest model with safety guardrail overrides.
    """
    features = extract_batch_features(payload)
    anomalies: List[str] = []

    # 1. Model inference
    model_version = "heuristic-guardrail-v1.2"
    raw_ml_prob = 0.0

    if _loaded_model is not None:
        try:
            feature_df = pd.DataFrame([[features[col] for col in FEATURE_COLUMNS]], columns=FEATURE_COLUMNS)
            # Probability of anomalous / high-risk class
            probs = _loaded_model.predict_proba(feature_df)[0]
            raw_ml_prob = float(probs[1]) if len(probs) > 1 else float(probs[0])
            model_version = "scikit-learn-rf-v1.0.0"
        except Exception as e:
            print(f"[Inference Warning] ML model evaluation error ({e}); falling back to heuristic engine.")
            raw_ml_prob = 0.0

    # Base continuous score (0 - 100)
    score = raw_ml_prob * 100.0 if _loaded_model is not None else 0.0

    # 2. Safety Guardrails & Deterministic Anomaly Attribution
    if features["is_recalled"] == 1.0:
        score = max(score, 85.0)
        anomalies.append("Batch recall order active")

    if features["is_expired"] == 1.0:
        score = max(score, 60.0)
        anomalies.append("Batch has exceeded declared expiry date")

    if features["hash_mismatches"] > 0:
        hash_penalty = min(70.0, features["hash_mismatches"] * 35.0)
        score = max(score, hash_penalty)
        anomalies.append(
            f"{int(features['hash_mismatches'])} cryptographic hash mismatch(es) detected — possible data tampering"
        )

    if features["total_events"] == 0:
        score = max(score, 25.0)
        anomalies.append("No supply-chain lifecycle events recorded")

    if features["temp_excursions"] > 0:
        anomalies.append(
            f"{int(features['temp_excursions'])} cold-chain temperature excursion(s) outside [-2°C, 8°C] range"
        )

    if features["temp_std"] > 3.0:
        anomalies.append(f"High temperature variance detected (std dev: {features['temp_std']}°C)")

    if features["humidity_excursions"] > 0:
        anomalies.append(
            f"{int(features['humidity_excursions'])} high humidity excursion(s) above 85% RH"
        )

    if features["custody_gap_hours_max"] > 72.0:
        score = max(score, 20.0)
        anomalies.append(
            f"Extended {int(features['custody_gap_hours_max'])}h transit gap between consecutive custody handovers"
        )

    # In heuristic mode without ML model, calculate additive baseline
    if _loaded_model is None:
        heuristic_score = 0.0
        if features["is_recalled"]: heuristic_score += 85.0
        if features["is_expired"]: heuristic_score += 50.0
        if features["hash_mismatches"]: heuristic_score += min(60.0, features["hash_mismatches"] * 30.0)
        if features["temp_excursions"]: heuristic_score += min(40.0, features["temp_excursions"] * 12.0)
        if features["humidity_excursions"]: heuristic_score += min(20.0, features["humidity_excursions"] * 8.0)
        score = max(score, heuristic_score)

    final_score = round(min(100.0, max(0.0, score)), 2)

    if not anomalies:
        anomalies.append("All supply chain and telemetry parameters are within nominal tolerances")

    return RiskScoreResponse(
        risk_score=final_score,
        risk_level=_classify_risk_level(final_score),
        anomalies=anomalies,
        model_version=model_version,
        generated_at=datetime.now(timezone.utc).isoformat(),
        feature_summary=features,
        disclaimer=(
            "AI-generated risk score is a decision-support indicator only "
            "and does not replace formal regulatory or quality audit."
        )
    )


# ---------------------------------------------------------------------------
# Legacy /predict Endpoint
# ---------------------------------------------------------------------------

@app.post("/predict", response_model=PredictionResult)
def predict_batch_risk(features: BatchFeatureInput):
    score = 0.0
    factors = []

    if features.tempVariance > 3.0:
        score += 0.35
        factors.append(f"High temperature variance detected: {features.tempVariance:.2f}°C")

    if features.reportedExceptions > 0:
        score += min(0.40, features.reportedExceptions * 0.20)
        factors.append(f"{features.reportedExceptions} supply chain exception(s) logged")

    if features.transitDurationHours > 72.0:
        score += 0.25
        factors.append(f"Extended transit duration: {features.transitDurationHours:.1f} hrs")

    supplier_penalty = (1.0 - features.supplierReliabilityScore) * 0.2
    if supplier_penalty > 0.05:
        score += supplier_penalty
        factors.append(f"Supplier reliability rating impact: {features.supplierReliabilityScore:.2f}")

    normalized_score = round(min(1.0, max(0.0, score)), 4)

    if normalized_score >= 0.70:
        category = "CRITICAL_RISK"
        anomaly = True
    elif normalized_score >= 0.40:
        category = "ELEVATED_RISK"
        anomaly = False
    elif normalized_score >= 0.20:
        category = "MODERATE_RISK"
        anomaly = False
    else:
        category = "LOW_RISK"
        anomaly = False

    if not factors:
        factors.append("All metrics within nominal safe operational parameters")

    return PredictionResult(
        batchId=features.batchId,
        task="supply_chain_batch_risk_assessment",
        riskScore=normalized_score,
        riskCategory=category,
        anomalyFlag=anomaly,
        contributingFactors=factors,
        modelVersion="baseline-v1.0.0",
        featureSchemaVersion="v1",
        generatedAt=datetime.now(timezone.utc).isoformat(),
        disclaimer="AI-generated risk score is for decision support only and must not replace authorized human audit."
    )
