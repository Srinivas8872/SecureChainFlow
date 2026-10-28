"""
SecureChainFlow AI/ML Baseline Training & Evaluation Pipeline
Trains, evaluates, and exports a scikit-learn model for supply chain anomaly and quality risk classification.
"""

import os
import json
from datetime import datetime, timezone
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)
import joblib

MODEL_ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "model-artifacts")
os.makedirs(MODEL_ARTIFACTS_DIR, exist_ok=True)

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


def generate_synthetic_supply_chain_dataset(n_samples: int = 2000, seed: int = 42) -> pd.DataFrame:
    """
    Generates a realistic synthetic supply chain batch dataset.
    Ground truth label represents high-risk / anomalous batch (1) vs normal safe batch (0).
    """
    np.random.seed(seed)

    # 70% normal batches, 30% anomalous/risky batches
    is_anomaly = np.random.binomial(1, 0.25, n_samples)

    total_events = np.random.randint(2, 12, n_samples)

    temp_mean = np.where(
        is_anomaly,
        np.random.normal(12.0, 4.0, n_samples),   # elevated temperature excursions
        np.random.normal(4.0, 1.5, n_samples)     # nominal cold-chain 4°C
    )

    temp_std = np.where(
        is_anomaly,
        np.random.uniform(2.5, 7.0, n_samples),
        np.random.uniform(0.2, 1.8, n_samples)
    )

    temp_excursions = np.where(
        is_anomaly,
        np.random.poisson(3.5, n_samples),
        np.random.poisson(0.1, n_samples)
    )

    humidity_mean = np.where(
        is_anomaly,
        np.random.normal(82.0, 10.0, n_samples),
        np.random.normal(60.0, 8.0, n_samples)
    )

    humidity_excursions = np.where(
        is_anomaly,
        np.random.poisson(2.0, n_samples),
        np.random.poisson(0.05, n_samples)
    )

    custody_gap_hours_max = np.where(
        is_anomaly,
        np.random.exponential(60.0, n_samples) + 24.0,
        np.random.exponential(12.0, n_samples) + 4.0
    )

    hash_mismatches = np.where(
        is_anomaly,
        np.random.binomial(2, 0.15, n_samples),
        np.zeros(n_samples, dtype=int)
    )

    is_expired = np.where(
        is_anomaly,
        np.random.binomial(1, 0.12, n_samples),
        np.random.binomial(1, 0.01, n_samples)
    )

    is_recalled = np.where(
        is_anomaly,
        np.random.binomial(1, 0.08, n_samples),
        np.zeros(n_samples, dtype=int)
    )

    # Clean bounds
    temp_excursions = np.clip(temp_excursions, 0, None)
    humidity_excursions = np.clip(humidity_excursions, 0, None)
    custody_gap_hours_max = np.clip(custody_gap_hours_max, 1.0, 240.0)

    df = pd.DataFrame({
        "temp_excursions": temp_excursions,
        "temp_mean": np.round(temp_mean, 2),
        "temp_std": np.round(temp_std, 2),
        "humidity_excursions": humidity_excursions,
        "humidity_mean": np.round(humidity_mean, 1),
        "custody_gap_hours_max": np.round(custody_gap_hours_max, 1),
        "total_events": total_events,
        "hash_mismatches": hash_mismatches,
        "is_expired": is_expired,
        "is_recalled": is_recalled,
        "label": is_anomaly
    })

    return df


def train_and_evaluate():
    print(f"[{datetime.now(timezone.utc).isoformat()}] Starting AI/ML model training...")

    # 1. Dataset generation & audit
    df = generate_synthetic_supply_chain_dataset(n_samples=2500, seed=42)
    csv_path = os.path.join(MODEL_ARTIFACTS_DIR, "training_dataset_sample.csv")
    df.to_csv(csv_path, index=False)
    print(f"Dataset generated: {len(df)} samples ({df['label'].sum()} positive / {len(df) - df['label'].sum()} negative)")

    X = df[FEATURE_COLUMNS]
    y = df["label"]

    # 2. Stratified Train/Test Split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # 3. Baseline Model: Logistic Regression
    lr_baseline = LogisticRegression(max_iter=1000, random_state=42)
    lr_baseline.fit(X_train, y_train)
    lr_preds = lr_baseline.predict(X_test)
    lr_probs = lr_baseline.predict_proba(X_test)[:, 1]

    lr_metrics = {
        "model": "LogisticRegression (Baseline)",
        "accuracy": float(round(accuracy_score(y_test, lr_preds), 4)),
        "precision": float(round(precision_score(y_test, lr_preds, zero_division=0), 4)),
        "recall": float(round(recall_score(y_test, lr_preds, zero_division=0), 4)),
        "f1_score": float(round(f1_score(y_test, lr_preds, zero_division=0), 4)),
        "roc_auc": float(round(roc_auc_score(y_test, lr_probs), 4))
    }

    # 4. Production Candidate: Random Forest Classifier
    rf_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=8,
        min_samples_split=4,
        random_state=42,
        class_weight="balanced"
    )
    rf_model.fit(X_train, y_train)
    rf_preds = rf_model.predict(X_test)
    rf_probs = rf_model.predict_proba(X_test)[:, 1]

    cm = confusion_matrix(y_test, rf_preds).tolist()

    rf_metrics = {
        "model": "RandomForestClassifier (v1.0.0)",
        "accuracy": float(round(accuracy_score(y_test, rf_preds), 4)),
        "precision": float(round(precision_score(y_test, rf_preds, zero_division=0), 4)),
        "recall": float(round(recall_score(y_test, rf_preds, zero_division=0), 4)),
        "f1_score": float(round(f1_score(y_test, rf_preds, zero_division=0), 4)),
        "roc_auc": float(round(roc_auc_score(y_test, rf_probs), 4)),
        "confusion_matrix": cm,
        "test_samples": len(y_test)
    }

    # Feature Importances
    feature_importances = {
        FEATURE_COLUMNS[i]: float(round(rf_model.feature_importances_[i], 4))
        for i in range(len(FEATURE_COLUMNS))
    }

    # 5. Export Model Artifact
    model_path = os.path.join(MODEL_ARTIFACTS_DIR, "batch_risk_classifier_v1.joblib")
    joblib.dump(rf_model, model_path)
    print(f"Model saved to: {model_path}")

    # 6. Export Evaluation Report
    report = {
        "task": "Supply Chain Batch Quality Risk & Cold-Chain Anomaly Assessment",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dataset": {
            "total_samples": len(df),
            "features": FEATURE_COLUMNS,
            "target": "is_anomaly (0 = nominal, 1 = high risk)",
            "data_provenance": "Synthetic calibrated telemetry based on HACCP/cold-chain standards"
        },
        "baseline_comparison": {
            "baseline": lr_metrics,
            "selected_model": rf_metrics
        },
        "feature_importances": feature_importances,
        "limitations": [
            "Trained on synthetic operational distributions; requires continuous retraining on production sensor telemetry.",
            "Predictions are decision-support aids and do not supersede authorized human quality inspections."
        ]
    }

    report_path = os.path.join(MODEL_ARTIFACTS_DIR, "evaluation_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"Evaluation report written to: {report_path}")

    # 7. Metadata File
    metadata = {
        "modelVersion": "rf-v1.0.0",
        "featureSchemaVersion": "v1.0",
        "features": FEATURE_COLUMNS,
        "algorithm": "RandomForestClassifier(n_estimators=100, max_depth=8)",
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    metadata_path = os.path.join(MODEL_ARTIFACTS_DIR, "metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print("Training and evaluation completed successfully!")
    print(f"RF F1: {rf_metrics['f1_score']}, ROC-AUC: {rf_metrics['roc_auc']}")
    return report


if __name__ == "__main__":
    train_and_evaluate()
