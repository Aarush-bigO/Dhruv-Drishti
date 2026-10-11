"""
Feature Engineering for Antarctic Weather Observations.
Computes circular wind embeddings, rate of change delta features, polar wind chill, and rolling temporal statistics.
"""
import numpy as np
from datetime import datetime
from typing import List, Dict, Any, Optional

def compute_wind_chill_index(temp_c: float, wind_mps: float) -> float:
    """Computes Osczevski / Siple-Passel Antarctic Wind Chill Equivalent Temperature (°C)."""
    wind_kmh = max(1.0, wind_mps * 3.6)
    if temp_c <= 10.0 and wind_kmh >= 4.8:
        wchill = 13.12 + (0.6215 * temp_c) - (11.37 * (wind_kmh ** 0.16)) + (0.3965 * temp_c * (wind_kmh ** 0.16))
        return round(wchill, 2)
    return round(temp_c, 2)

def compute_dew_point(temp_c: float, rh_pct: float) -> float:
    """Magnus-Tetens formula approximation for dew point temperature (°C)."""
    a = 17.27
    b = 237.7
    rh = max(1.0, min(100.0, rh_pct))
    alpha = ((a * temp_c) / (b + temp_c)) + np.log(rh / 100.0)
    dew_point = (b * alpha) / (a - alpha)
    return round(float(dew_point), 2)

def extract_features_dict(
    obs: Dict[str, Any], 
    history_window: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, float]:
    """
    Transforms a raw/normalized weather observation into an engineered dictionary for the ensemble model.
    """
    temp = float(obs.get("temperature_c") if obs.get("temperature_c") is not None else -16.0)
    pressure = float(obs.get("pressure_hpa") if obs.get("pressure_hpa") is not None else 980.0)
    wind_speed = float(obs.get("wind_speed_mps") if obs.get("wind_speed_mps") is not None else 8.0)
    humidity = float(obs.get("relative_humidity_pct") if obs.get("relative_humidity_pct") is not None else 65.0)
    wind_dir = float(obs.get("wind_direction_deg") if obs.get("wind_direction_deg") is not None else 100.0)

    # 1. Circular Wind Direction Encoding
    rad = np.radians(wind_dir)
    wind_sin = float(np.sin(rad))
    wind_cos = float(np.cos(rad))

    # 2. Polar Wind Chill Equivalent
    wind_chill = compute_wind_chill_index(temp, wind_speed)

    # 3. Temporal Rate of Change Deltas over historical window (e.g. past 1 hour)
    temp_delta_1h = 0.0
    pressure_delta_1h = 0.0

    if history_window and len(history_window) > 0:
        oldest = history_window[-1] if len(history_window) >= 12 else history_window[0]
        if oldest.get("temperature_c") is not None:
            temp_delta_1h = float(temp - float(oldest["temperature_c"]))
        if oldest.get("pressure_hpa") is not None:
            pressure_delta_1h = float(pressure - float(oldest["pressure_hpa"]))

    # 4. Diurnal & Seasonal Cyclic features
    obs_time = obs.get("observed_at")
    if isinstance(obs_time, str):
        try:
            dt = datetime.fromisoformat(obs_time.replace("Z", "+00:00"))
        except Exception:
            dt = datetime.utcnow()
    elif isinstance(obs_time, datetime):
        dt = obs_time
    else:
        dt = datetime.utcnow()

    hour_sin = float(np.sin(2 * np.pi * dt.hour / 24.0))
    month_sin = float(np.sin(2 * np.pi * dt.month / 12.0))

    return {
        "temperature_c": temp,
        "pressure_hpa": pressure,
        "wind_speed_mps": wind_speed,
        "relative_humidity_pct": humidity,
        "wind_sin": wind_sin,
        "wind_cos": wind_cos,
        "temp_delta_1h": temp_delta_1h,
        "pressure_delta_1h": pressure_delta_1h,
        "wind_chill_c": wind_chill,
        "hour_sin": hour_sin,
        "month_sin": month_sin
    }
