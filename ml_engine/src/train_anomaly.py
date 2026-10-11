"""
Trains the Advanced Multi-Model Machinery & Life Support Equipment Anomaly Ensemble.
Incorporate physics couplings between RPM jitter, mechanical vibration, thermal lift, and battery SOC.
"""

import sys
import joblib
import numpy as np
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

from ml_engine.src.ensemble_anomaly import EnsembleAnomalyDetector

EQUIPMENT_FEATURES = [
    "generator_rpm",
    "vibration_level",
    "indoor_temp",
    "battery_soc",
    "fuel_level_liters",
    "hvac_pressure",
    "mechanical_stress_index",
    "frequency_drift_hz"
]

def generate_equipment_training_matrix(n_samples: int = 3000) -> np.ndarray:
    """
    Generates realistic, physically-coupled baseline operational data
    for Antarctic station infrastructure equipment.
    """
    np.random.seed(42)

    # 1. Generator baseline: 1500 RPM normal, normal vibration 1.8 - 2.8 mm/s
    rpm = np.random.normal(1500.0, 18.0, n_samples)
    # Coupled vibration (higher RPM variance slightly increases vibration)
    vib = np.random.normal(2.35, 0.32, n_samples) + (abs(rpm - 1500.0) / 100.0) * 0.2
    vib = np.clip(vib, 1.4, 3.3)

    # 2. Indoor Habitat & Room Temperatures (19°C to 23°C)
    indoor_temp = np.random.normal(21.0, 1.0, n_samples)

    # 3. Battery Bank SOC (65% to 92%)
    battery_soc = np.random.uniform(65.0, 92.0, n_samples)

    # 4. Fuel reserves (8,000 to 18,000 Liters)
    fuel = np.random.uniform(8000.0, 18000.0, n_samples)

    # 5. HVAC pressure head (0.95 to 1.10 bar)
    hvac_pressure = np.random.normal(1.02, 0.04, n_samples)

    # 6. Mechanical stress index (physics equation from equipment_physics.py)
    rpm_delta = np.abs(rpm - 1500.0)
    mech_stress = (vib / 2.5) ** 1.8 + (rpm_delta / 80.0) ** 1.5

    # 7. Frequency drift (Hz)
    freq_drift = (rpm / 30.0) - 50.0

    X = np.column_stack([
        rpm,
        vib,
        indoor_temp,
        battery_soc,
        fuel,
        hvac_pressure,
        mech_stress,
        freq_drift
    ])

    return X

def train_equipment_ensemble():
    X = generate_equipment_training_matrix()

    detector = EnsembleAnomalyDetector(
        n_estimators=150,
        contamination=0.035,
        feature_names=EQUIPMENT_FEATURES,
        random_state=42
    )

    print(f"[Training] Fitting Equipment Multi-Model Ensemble on {X.shape[0]} samples x {X.shape[1]} features...")
    detector.fit(X)

    out_path = BASE_DIR / "ml_engine" / "models" / "equipment_ensemble.joblib"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(detector, out_path)
    print(f"[Training] SUCCESS: Serialized Equipment Ensemble to {out_path}")

    # Verify model with nominal and fault states
    sample_nominal = {
        "generator_rpm": 1495.0,
        "vibration_level": 2.15,
        "indoor_temp": 21.2,
        "battery_soc": 78.0,
        "fuel_level_liters": 14200.0,
        "hvac_pressure": 1.02,
        "mechanical_stress_index": 0.95,
        "frequency_drift_hz": -0.16
    }
    sample_fault = {
        "generator_rpm": 1380.0,       # Sputtering RPM
        "vibration_level": 5.80,       # Extreme mechanical vibration
        "indoor_temp": 14.5,
        "battery_soc": 42.0,
        "fuel_level_liters": 1200.0,   # Fuel critical
        "hvac_pressure": 0.40,         # Pressure head lost
        "mechanical_stress_index": 4.85,
        "frequency_drift_hz": -4.00
    }

    res_nom = detector.score(sample_nominal)
    res_flt = detector.score(sample_fault)
    print("\n--- Equipment Model Verification ---")
    print(f"Nominal Asset -> Score: {res_nom['ensemble_anomaly_score']} | Alert: {res_nom['alert_level']} | Consensus: {res_nom['ensemble_agreement']}")
    print(f"Faulted Asset -> Score: {res_flt['ensemble_anomaly_score']} | Alert: {res_flt['alert_level']} | Consensus: {res_flt['ensemble_agreement']}")
    print(f"Top Root Cause Features: {res_flt['root_cause_attributions'][:3]}")

if __name__ == "__main__":
    train_equipment_ensemble()
