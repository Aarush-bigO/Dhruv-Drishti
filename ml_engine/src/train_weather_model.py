"""
Trains the Advanced Multi-Model Weather Anomaly Ensemble directly on authentic
NCPOR / NPDC Bharati & Maitri 1-Minute AWS Observations.
"""

import os
import sys
import csv
import joblib
import numpy as np
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

from ml_engine.src.ensemble_anomaly import EnsembleAnomalyDetector

FEATURE_NAMES = [
    "temperature_c",
    "pressure_hpa",
    "wind_speed_mps",
    "relative_humidity_pct",
    "wind_sin",
    "wind_cos",
    "temp_delta_1h",
    "pressure_delta_1h",
    "wind_chill_c",
    "hour_sin",
    "month_sin"
]

def compute_wind_chill(temp_c: float, wind_mps: float) -> float:
    """Computes Osczevski / Siple-Passel Antarctic Wind Chill Equivalent Temperature (°C)."""
    wind_kmh = max(1.0, wind_mps * 3.6)
    if temp_c <= 10.0 and wind_kmh >= 4.8:
        # Standard WMO / Environment Canada wind chill index formula
        wchill = 13.12 + (0.6215 * temp_c) - (11.37 * (wind_kmh ** 0.16)) + (0.3965 * temp_c * (wind_kmh ** 0.16))
        return round(wchill, 2)
    return round(temp_c, 2)

def load_real_npdc_data() -> np.ndarray:
    """Loads and vectorizes all real 1-minute observations from both stations."""
    data_files = [
        BASE_DIR / "data" / "raw" / "npdc" / "bharati" / "bharati_aws_2026_sample.csv",
        BASE_DIR / "data" / "raw" / "npdc" / "maitri" / "maitri_aws_2026_sample.csv"
    ]

    all_rows = []
    for fp in data_files:
        if not fp.exists():
            print(f"Warning: Data file not found at {fp}")
            continue
        with open(fp, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    t_c = float(row.get("temperature_c") or -15.0)
                    p_hpa = float(row.get("pressure_hpa") or 980.0)
                    w_kts = float(row.get("wind_speed_knots") or 10.0)
                    w_mps = float(w_kts * 0.514444)
                    rh = float(row.get("relative_humidity_pct") or 65.0)
                    w_deg = float(row.get("wind_direction_deg") or 120.0)

                    rad = np.radians(w_deg)
                    wind_sin = float(np.sin(rad))
                    wind_cos = float(np.cos(rad))
                    wchill = compute_wind_chill(t_c, w_mps)

                    all_rows.append({
                        "temperature_c": t_c,
                        "pressure_hpa": p_hpa,
                        "wind_speed_mps": w_mps,
                        "relative_humidity_pct": rh,
                        "wind_sin": wind_sin,
                        "wind_cos": wind_cos,
                        "wind_chill_c": wchill
                    })
                except (ValueError, TypeError):
                    continue

    print(f"[Training] Loaded {len(all_rows)} authentic 1-minute observations from NCPOR archive.")

    # Compute rate of change deltas
    X_list = []
    window = 60 # 1-hour window
    for i, r in enumerate(all_rows):
        oldest_idx = max(0, i - window)
        oldest = all_rows[oldest_idx]

        t_delta = r["temperature_c"] - oldest["temperature_c"]
        p_delta = r["pressure_hpa"] - oldest["pressure_hpa"]

        # Approximate time of day cyclical features
        hour = (i % 1440) / 60.0
        hour_sin = np.sin(2 * np.pi * hour / 24.0)
        month_sin = np.sin(2 * np.pi * 8.0 / 12.0) # August (polar winter)

        vec = [
            r["temperature_c"],
            r["pressure_hpa"],
            r["wind_speed_mps"],
            r["relative_humidity_pct"],
            r["wind_sin"],
            r["wind_cos"],
            t_delta,
            p_delta,
            r["wind_chill_c"],
            hour_sin,
            month_sin
        ]
        X_list.append(vec)

    return np.array(X_list, dtype=np.float64)

def train_weather_ensemble():
    X = load_real_npdc_data()
    if len(X) == 0:
        print("Error: No data available for training.")
        return

    detector = EnsembleAnomalyDetector(
        n_estimators=150,
        contamination=0.035,
        feature_names=FEATURE_NAMES,
        random_state=42
    )

    print(f"[Training] Fitting Multi-Model Ensemble on {X.shape[0]} samples x {X.shape[1]} features...")
    detector.fit(X)

    out_path = BASE_DIR / "ml_engine" / "models" / "bharati_weather_ensemble.joblib"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(detector, out_path)
    print(f"[Training] SUCCESS: Serialized Weather Ensemble to {out_path}")

    # Run sample test verification
    sample_nominal = {
        "temperature_c": -18.0,
        "pressure_hpa": 980.0,
        "wind_speed_mps": 6.5,
        "relative_humidity_pct": 65.0,
        "wind_sin": 0.5,
        "wind_cos": 0.86,
        "temp_delta_1h": 0.2,
        "pressure_delta_1h": -0.4,
        "wind_chill_c": -28.5,
        "hour_sin": 0.0,
        "month_sin": -0.86
    }
    sample_cyclone = {
        "temperature_c": -24.5,
        "pressure_hpa": 960.0,
        "wind_speed_mps": 32.0, # 115 km/h hurricane gust
        "relative_humidity_pct": 85.0,
        "wind_sin": 0.9,
        "wind_cos": -0.4,
        "temp_delta_1h": -6.5,
        "pressure_delta_1h": -12.0, # Rapid pressure drop
        "wind_chill_c": -48.2,
        "hour_sin": 0.5,
        "month_sin": -0.86
    }

    res_nom = detector.score(sample_nominal)
    res_cyc = detector.score(sample_cyclone)
    print("\n--- Model Verification Results ---")
    print(f"Nominal Weather -> Score: {res_nom['ensemble_anomaly_score']} | Alert: {res_nom['alert_level']} | Agreement: {res_nom['ensemble_agreement']}")
    print(f"Severe Cyclone  -> Score: {res_cyc['ensemble_anomaly_score']} | Alert: {res_cyc['alert_level']} | Agreement: {res_cyc['ensemble_agreement']}")
    print(f"Top Root Cause Contributors for Cyclone: {res_cyc['root_cause_attributions'][:2]}")

if __name__ == "__main__":
    train_weather_ensemble()

