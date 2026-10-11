"""
Standalone Multi-Model Inference Helper.
Processes incoming dynamic payloads for both Environmental Weather Anomalies and Machinery Equipment Anomalies.
"""
import joblib
import numpy as np
from pathlib import Path
from typing import Dict, Any

def run_equipment_inference(data: Dict[str, Any]) -> Dict[str, Any]:
    base_path = Path(__file__).parent.parent / 'models'
    anomaly_path = base_path / 'isolation_forest.joblib'
    burn_rate_path = base_path / 'fuel_burn_model.joblib'

    results = {
        "equipment_anomaly_score": 0.0,
        "equipment_failure_risk": 0.0,
        "alert_level": "normal"
    }

    if anomaly_path.exists():
        anomaly_model = joblib.load(anomaly_path)
        # Dynamically extract from incoming payload
        X_anomaly = np.array([[
            data.get("generator_rpm", 1500.0),
            data.get("vibration_level", 2.2),
            data.get("outdoor_temp", -35.0),
            data.get("indoor_temp", 21.0),
            data.get("battery_soc", 75.0)
        ]])
        raw_score = anomaly_model.decision_function(X_anomaly)[0]
        anomaly_score = max(0.0, min(1.0, 0.5 - raw_score))
        failure_risk = max(0.0, min(1.0, anomaly_score * 0.8))
        
        # Rule overrides
        if data.get("vibration_level", 0.0) > 5.0:
            failure_risk = 0.95
            results["alert_level"] = "critical"
        elif failure_risk > 0.5:
            results["alert_level"] = "warning"

        results["equipment_anomaly_score"] = float(round(anomaly_score, 3))
        results["equipment_failure_risk"] = float(round(failure_risk, 3))

    if burn_rate_path.exists():
        burn_model = joblib.load(burn_rate_path)
        crew = data.get("crew_count", 25)
        temp = data.get("outdoor_temp", -35.0)
        storm = data.get("storm_intensity", 0.0)
        X_burn = np.array([[crew, temp, storm]])
        burn_rate = burn_model.predict(X_burn)[0]
        results["predicted_burn_rate_lph"] = float(round(burn_rate, 1))

    return results

def run_weather_inference(data: Dict[str, Any]) -> Dict[str, Any]:
    from app.services.weather_anomaly_service import weather_anomaly_service
    score, alert_level, anomaly_type, details = weather_anomaly_service.score(data)
    return {
        "weather_anomaly_score": score,
        "weather_alert_level": alert_level,
        "anomaly_type": anomaly_type,
        "details": details
    }

if __name__ == '__main__':
    sample_eq = {"generator_rpm": 1420.0, "vibration_level": 6.2, "outdoor_temp": -48.0, "indoor_temp": 16.0, "battery_soc": 52.0}
    print("Equipment Inference:", run_equipment_inference(sample_eq))
    sample_wx = {"temperature_c": -22.5, "pressure_hpa": 965.0, "wind_speed_mps": 28.5, "wind_direction_deg": 105.0, "relative_humidity_pct": 82.0}
    print("Weather Inference:", run_weather_inference(sample_wx))
