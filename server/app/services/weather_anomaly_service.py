"""
Weather Anomaly Intelligence Service for Antarctic Observations.
Powered by a Multi-Model Ensemble (Isolation Forest + Robust Mahalanobis + LOF + CUSUM),
domain physical transformations (Wind Chill Index, Barometric Tendency), and XAI Feature Attribution.
"""

import sys
import joblib
import numpy as np
from pathlib import Path
from typing import Tuple, Dict, Any, Optional, List

# Ensure ml_engine is on path
BASE_DIR = Path(__file__).parent.parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.services.weather_features import extract_features_dict, compute_wind_chill_index, compute_dew_point
from ml_engine.src.ensemble_anomaly import EnsembleAnomalyDetector

MODEL_PATH = BASE_DIR / "ml_engine" / "models" / "bharati_weather_ensemble.joblib"

class WeatherAnomalyService:
    def __init__(self):
        self.ensemble: Optional[EnsembleAnomalyDetector] = None
        self._load_or_train()

    def _load_or_train(self):
        try:
            if MODEL_PATH.exists():
                self.ensemble = joblib.load(MODEL_PATH)
                print(f"[Weather ML] Loaded Multi-Model Weather Ensemble from {MODEL_PATH}")
                return
        except Exception as e:
            print(f"[Weather ML] Failed to load ensemble ({e}), retraining...")

        # If not found or load fails, trigger training
        try:
            from ml_engine.src.train_weather_model import train_weather_ensemble
            train_weather_ensemble()
            if MODEL_PATH.exists():
                self.ensemble = joblib.load(MODEL_PATH)
        except Exception as e:
            print(f"[Weather ML] Ensemble initialization error: {e}")

    def score(
        self, 
        observation: Dict[str, Any], 
        history_window: Optional[List[Dict[str, Any]]] = None
    ) -> Tuple[float, str, str, Dict[str, Any]]:
        """
        Calculates weather anomaly score, identifies anomaly category, and provides XAI root cause attribution.
        Returns:
            (anomaly_score: float 0-1, alert_level: 'normal'|'warning'|'critical', anomaly_type: str, details: dict)
        """
        temp = observation.get("temperature_c")
        pressure = observation.get("pressure_hpa")
        wind_speed = observation.get("wind_speed_mps")
        humidity = observation.get("relative_humidity_pct")

        # 1. Feature Extraction
        feat_dict = extract_features_dict(observation, history_window)

        # 2. Multi-Model Ensemble Evaluation
        if self.ensemble and self.ensemble.is_fitted:
            ensemble_result = self.ensemble.score(feat_dict)
            anomaly_score = float(ensemble_result["ensemble_anomaly_score"])
            alert_level = ensemble_result["alert_level"]
            attributions = ensemble_result.get("root_cause_attributions", [])
            agreement = ensemble_result.get("ensemble_agreement", "Ensemble Active")
            cusum_drift = ensemble_result.get("cusum_drift_detected", False)
        else:
            anomaly_score = 0.05
            alert_level = "normal"
            attributions = []
            agreement = "Baseline Active"
            cusum_drift = False

        anomaly_type = "NORMAL_CONDITIONS"
        reasons = []

        # 3. Domain Meteorological Rules & Physical Indices
        # Wind Chill Index
        wind_chill = feat_dict.get("wind_chill_c", temp)
        dew_point = compute_dew_point(float(temp or 0), float(humidity or 50))

        # Check Rapid Barometric Pressure Drop (indicates approaching cyclone / blizzard depression)
        p_delta = feat_dict.get("pressure_delta_1h", 0.0)
        if p_delta <= -4.0:
            anomaly_type = "RAPID_PRESSURE_DROP"
            alert_level = "critical" if p_delta <= -8.0 else "warning"
            anomaly_score = max(anomaly_score, 0.85 if p_delta <= -8.0 else 0.65)
            reasons.append(f"Steep cyclonic pressure drop: {abs(p_delta):.1f} hPa/hr")

        # Check Katabatic High Wind Events
        if wind_speed is not None and wind_speed >= 22.0:
            anomaly_type = "HIGH_WIND_EVENT"
            alert_level = "critical" if wind_speed >= 30.0 else "warning"
            anomaly_score = max(anomaly_score, 0.90 if wind_speed >= 30.0 else 0.70)
            reasons.append(f"Extreme katabatic wind velocity: {wind_speed:.1f} m/s ({wind_speed * 3.6:.0f} km/h)")

        # Check Severe Polar Cold & Freeze
        if temp is not None and temp <= -38.0:
            anomaly_type = "EXTREME_COLD_EVENT"
            alert_level = "critical" if temp <= -48.0 else "warning"
            anomaly_score = max(anomaly_score, 0.80)
            reasons.append(f"Severe cryogenic temperature: {temp:.1f} °C (Wind Chill: {wind_chill:.1f} °C)")

        # General ML Pattern Anomaly if no single rule triggered
        if alert_level != "normal" and anomaly_type == "NORMAL_CONDITIONS":
            anomaly_type = "WEATHER_PATTERN_ANOMALY"
            reasons.append("Multi-parameter atmospheric divergence detected by Ensemble ML")

        details = {
            "ml_score": round(anomaly_score, 3),
            "ensemble_agreement": agreement,
            "cusum_drift_detected": cusum_drift,
            "wind_chill_c": round(wind_chill, 1),
            "dew_point_c": round(dew_point, 1),
            "pressure_tendency_1h_hpa": round(p_delta, 2),
            "reasons": reasons,
            "root_cause_attributions": attributions
        }

        return round(anomaly_score, 3), alert_level, anomaly_type, details

weather_anomaly_service = WeatherAnomalyService()
