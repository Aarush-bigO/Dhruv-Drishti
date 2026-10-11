"""
Equipment & Machinery Anomaly Intelligence Service for Antarctic Station Critical Assets.
Combines:
1. Multi-Model Ensemble (Isolation Forest + Robust Mahalanobis + LOF + CUSUM)
2. Domain Engineering Physics Engine (Coupled Torque-Vibration, Thermal Head, Peukert Battery)
3. Explainable AI (XAI) Root Cause Attribution & Prescriptive Actions
"""

import sys
import joblib
import numpy as np
from pathlib import Path
from typing import Tuple, Dict, Any, Optional, List

BASE_DIR = Path(__file__).parent.parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from ml_engine.src.ensemble_anomaly import EnsembleAnomalyDetector
from ml_engine.src.equipment_physics import equipment_physics

MODEL_PATH = BASE_DIR / "ml_engine" / "models" / "equipment_ensemble.joblib"

class AnomalyService:
    def __init__(self):
        self.ensemble: Optional[EnsembleAnomalyDetector] = None
        self._load_or_train_model()

    def _load_or_train_model(self):
        try:
            if MODEL_PATH.exists():
                self.ensemble = joblib.load(MODEL_PATH)
                print(f"[Equipment ML] Loaded Multi-Model Equipment Ensemble from {MODEL_PATH}")
                return
        except Exception as e:
            print(f"[Equipment ML] Failed to load ensemble ({e}), retraining...")

        try:
            from ml_engine.src.train_anomaly import train_equipment_ensemble
            train_equipment_ensemble()
            if MODEL_PATH.exists():
                self.ensemble = joblib.load(MODEL_PATH)
        except Exception as e:
            print(f"[Equipment ML] Ensemble initialization error: {e}")

    def score(
        self, 
        data: Dict[str, Any], 
        history_window: Optional[List[Dict[str, Any]]] = None
    ) -> Tuple[float, float, str, Dict[str, Any]]:
        """
        Evaluates machinery telemetry through the ensemble & physics engines.
        Returns:
            (anomaly_score, failure_risk, alert_level, diagnostic_details)
        """
        equipment_id = str(data.get("equipment_id", "GEN_01")).upper()
        rpm = float(data.get("generator_rpm", 1500.0))
        vib = float(data.get("vibration_level", 2.2))
        temp_in = float(data.get("indoor_temp", 21.0))
        temp_out = float(data.get("outdoor_temp", -35.0))
        battery_soc = float(data.get("battery_soc", 75.0))
        fuel = float(data.get("fuel_level_liters", 14200.0))
        hvac_p = float(data.get("hvac_pressure", 1.02))

        # 1. Physics Features Calculation
        rpm_delta = abs(rpm - 1500.0)
        freq_drift = (rpm / 30.0) - 50.0
        mech_stress = (vib / 2.5) ** 1.8 + (rpm_delta / 80.0) ** 1.5

        features_dict = {
            "generator_rpm": rpm,
            "vibration_level": vib,
            "indoor_temp": temp_in,
            "battery_soc": battery_soc,
            "fuel_level_liters": fuel,
            "hvac_pressure": hvac_p,
            "mechanical_stress_index": mech_stress,
            "frequency_drift_hz": freq_drift
        }

        # 2. Multi-Model Ensemble Scoring
        if self.ensemble and self.ensemble.is_fitted:
            ens_res = self.ensemble.score(features_dict)
            anomaly_score = float(ens_res["ensemble_anomaly_score"])
            failure_risk = float(ens_res["failure_risk"])
            alert_level = ens_res["alert_level"]
            attributions = ens_res.get("root_cause_attributions", [])
            agreement = ens_res.get("ensemble_agreement", "Ensemble Active")
            cusum_drift = ens_res.get("cusum_drift_detected", False)
            model_breakdown = ens_res.get("model_breakdown", {})
        else:
            anomaly_score = 0.05
            failure_risk = 0.05
            alert_level = "normal"
            attributions = []
            agreement = "Baseline Active"
            cusum_drift = False
            model_breakdown = {}

        # 3. Domain Asset Physics Evaluation & Prescriptive Actions
        physics_report = {}
        prescriptive_actions = []

        if "GEN" in equipment_id:
            physics_report = equipment_physics.evaluate_generator(data, history_window)
            prescriptive_actions = physics_report.get("recommended_actions", [])
            # Generator Critical Override
            if vib >= 4.8 or mech_stress >= 3.2:
                alert_level = "critical"
                failure_risk = max(failure_risk, 0.92)
                anomaly_score = max(anomaly_score, 0.88)
            elif vib >= 3.4:
                if alert_level == "normal":
                    alert_level = "warning"
                failure_risk = max(failure_risk, 0.65)

        elif "HVAC" in equipment_id:
            physics_report = equipment_physics.evaluate_hvac(data, history_window)
            prescriptive_actions = physics_report.get("recommended_actions", [])
            if hvac_p < 0.50:
                alert_level = "critical"
                failure_risk = max(failure_risk, 0.88)
                anomaly_score = max(anomaly_score, 0.85)

        elif "FUEL" in equipment_id:
            physics_report = equipment_physics.evaluate_fuel_storage(data, history_window)
            prescriptive_actions = physics_report.get("recommended_actions", [])
            if fuel < 2000.0:
                alert_level = "critical"
                failure_risk = max(failure_risk, 0.90)
            elif fuel < 4500.0 and alert_level == "normal":
                alert_level = "warning"

        elif "BATT" in equipment_id:
            physics_report = equipment_physics.evaluate_battery_bank(data, history_window)
            prescriptive_actions = physics_report.get("recommended_actions", [])
            if battery_soc < 20.0:
                alert_level = "critical"
                failure_risk = max(failure_risk, 0.90)
            elif battery_soc < 35.0 and alert_level == "normal":
                alert_level = "warning"

        else:
            prescriptive_actions = ["Telemetry within design envelope", "Continuous mission control monitoring active"]

        # 4. Multi-Tier Operational Safeguard
        # Ensure that normal machinery operating well within physical design limits
        # is never falsely flagged with critical or warning alarms.
        if "GEN" in equipment_id:
            if vib < 3.4 and 1440.0 <= rpm <= 1560.0:
                alert_level = "normal"
                anomaly_score = min(anomaly_score, 0.20)
                failure_risk = min(failure_risk, 0.20)
        elif "FUEL" in equipment_id:
            if fuel >= 4500.0:
                alert_level = "normal"
                anomaly_score = min(anomaly_score, 0.20)
                failure_risk = min(failure_risk, 0.20)
        elif "BATT" in equipment_id:
            if battery_soc >= 35.0:
                alert_level = "normal"
                anomaly_score = min(anomaly_score, 0.20)
                failure_risk = min(failure_risk, 0.20)
        elif "HVAC" in equipment_id:
            if hvac_p >= 0.80:
                alert_level = "normal"
                anomaly_score = min(anomaly_score, 0.20)
                failure_risk = min(failure_risk, 0.20)
        else:
            if anomaly_score < 0.40 and failure_risk < 0.40:
                alert_level = "normal"

        diagnostics = {
            "equipment_id": equipment_id,
            "anomaly_score": round(anomaly_score, 3),
            "failure_risk": round(failure_risk, 3),
            "alert_level": alert_level,
            "ensemble_agreement": agreement,
            "cusum_drift_detected": cusum_drift,
            "model_breakdown": model_breakdown,
            "physics_indicators": physics_report,
            "root_cause_factors": attributions,
            "recommended_actions": prescriptive_actions
        }

        return float(round(anomaly_score, 3)), float(round(failure_risk, 3)), alert_level, diagnostics

anomaly_service = AnomalyService()
