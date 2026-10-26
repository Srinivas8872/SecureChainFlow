"""
SecureChainFlow AI/ML Inference Service
Provides predictive quality risk scoring, anomaly detection for supply-chain batches,
and transparent data provenance metadata.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional, Literal
from datetime import datetime, timezone
import math

app = FastAPI(
    title="SecureChainFlow AI Decision-Support Service",
    version="1.1.0",
    description="Statistical & Machine Learning Risk/Anomaly Scoring Engine for Supply Chain Events"
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

class BatchFeatureInput(BaseModel):
    """Legacy /predict endpoint schema."""
    batchId: str = Field(..., description="Canonical Batch UUID")
    transitDurationHours: float = Field(..., ge=0.0)
    tempVariance: float = Field(..., ge=0.0)
    custodyHandovers: int = Field(..., ge=1)
    reportedExceptions: int = Field(default=0, ge=0)
    supplierReliabilityScore: float = Field(default=1.0, ge=0.0, le=1.0)


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
    risk_score: float = Field(description="0-100 risk score")
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    anomalies: List[str]
    model_version: str
    generated_at: str
    disclaimer: str


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
# Helper utilities
# ---------------------------------------------------------------------------

def _parse_dt(dt_str: Optional[str]) -> Optional[datetime]:
    """Safely parse an ISO datetime string."""
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except ValueError:
        return None


def _risk_level(score: float) -> Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
    if score >= 80:
        return "CRITICAL"
    elif score >= 50:
        return "HIGH"
    elif score >= 20:
        return "MEDIUM"
    return "LOW"


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "securechainflow-ai-service",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "modelsLoaded": ["batch-risk-scorer-v1.1", "anomaly-heuristic-v1.1"]
    }


# ---------------------------------------------------------------------------
# NEW: Structured risk scoring endpoint consumed by Express analytics module
# ---------------------------------------------------------------------------

@app.post("/api/v1/risk-score", response_model=RiskScoreResponse)
def compute_risk_score(payload: RiskScoreRequest):
    """
    Compute a 0-100 risk score for a supply chain batch.
    Analyzes event chain telemetry, hash integrity, batch status and expiry.
    """
    score: float = 0.0
    anomalies: List[str] = []

    batch = payload.batch
    events = payload.events

    # --- Recalled batch --------------------------------------------------
    if batch.status == "RECALLED":
        score += 80.0
        anomalies.append("Batch has been recalled")

    # --- Expiry check ----------------------------------------------------
    expiry_dt = _parse_dt(batch.expiryDate)
    if expiry_dt and expiry_dt.replace(tzinfo=None) < datetime.utcnow():
        score += 50.0
        anomalies.append("Batch has passed its expiry date")

    # --- Hash integrity failures -----------------------------------------
    if payload.hashMismatches > 0:
        hash_penalty = min(60.0, payload.hashMismatches * 30.0)
        score += hash_penalty
        anomalies.append(
            f"{payload.hashMismatches} payload hash mismatch(es) detected — possible tampering"
        )

    # --- No events at all ------------------------------------------------
    if payload.totalEvents == 0:
        score += 25.0
        anomalies.append("No supply chain events have been recorded")

    # --- Blockchain unconfirmed ------------------------------------------
    if batch.blockchainStatus in ("PENDING", "FAILED"):
        score += 15.0
        anomalies.append(f"Blockchain status is '{batch.blockchainStatus}' — not yet committed")

    # --- Telemetry analysis ----------------------------------------------
    temp_excursions = 0
    humidity_excursions = 0
    timestamps: List[datetime] = []

    for ev in events:
        # Temperature: cold-chain typical range -2°C to +8°C
        if ev.temperature is not None:
            if ev.temperature > 8.0:
                temp_excursions += 1
            elif ev.temperature < -2.0:
                temp_excursions += 1

        # Humidity: flag >85 %RH
        if ev.humidity is not None and ev.humidity > 85.0:
            humidity_excursions += 1

        dt = _parse_dt(ev.occurredAt)
        if dt:
            timestamps.append(dt)

    if temp_excursions > 0:
        temp_penalty = min(40.0, temp_excursions * 12.0)
        score += temp_penalty
        anomalies.append(f"{temp_excursions} cold-chain temperature excursion(s) detected")

    if humidity_excursions > 0:
        humidity_penalty = min(20.0, humidity_excursions * 8.0)
        score += humidity_penalty
        anomalies.append(f"{humidity_excursions} high humidity excursion(s) detected")

    # --- Time gap analysis -----------------------------------------------
    if len(timestamps) >= 2:
        timestamps.sort()
        max_gap_hours = 0.0
        for i in range(1, len(timestamps)):
            gap_h = (timestamps[i] - timestamps[i - 1]).total_seconds() / 3600.0
            if gap_h > max_gap_hours:
                max_gap_hours = gap_h

        if max_gap_hours > 72.0:
            score += 12.0
            anomalies.append(
                f"Suspicious {round(max_gap_hours)}h custody gap between consecutive events"
            )

    # --- Sigmoid normalization to 0-100 ---------------------------------
    # Clamp and keep linear for interpretability; sigmoid compress outliers
    final_score = round(min(100.0, max(0.0, score)), 2)

    if not anomalies:
        anomalies.append("All supply chain metrics are within acceptable operational parameters")

    return RiskScoreResponse(
        risk_score=final_score,
        risk_level=_risk_level(final_score),
        anomalies=anomalies,
        model_version="heuristic-v1.1.0",
        generated_at=datetime.now(timezone.utc).isoformat(),
        disclaimer=(
            "AI-generated risk score is for decision support only "
            "and must not replace authorized human audit."
        ),
    )


# ---------------------------------------------------------------------------
# Legacy /predict endpoint — preserved for backward compatibility
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
