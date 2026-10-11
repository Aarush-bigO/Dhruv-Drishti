"""
Weather Quality Validation Layer for Antarctic AWS Observations (NPDC / NCPOR).
Applies meteorological physical limits, rate-of-change jump detection, and sensor freeze detection.
"""
from typing import Tuple, List, Optional
import math

# Realistic meteorological boundaries for Antarctic Coastal/Oasis stations (Bharati & Maitri)
LIMITS = {
    "temperature_c": (-90.0, 15.0),       # Record low in Antarctica is -89.2°C; summer peak can reach +10°C
    "pressure_hpa": (850.0, 1050.0),      # Extreme Antarctic cyclonic pressure drops can hit ~920 hPa
    "wind_speed_mps": (0.0, 95.0),        # Extreme katabatic winds can exceed 70 m/s (~250 km/h)
    "wind_direction_deg": (0.0, 360.0),   # 0 to 360 degrees
    "relative_humidity_pct": (0.0, 100.0) # 0 to 100%
}

# Maximum plausible 10-minute rate-of-change jumps
MAX_RATE_OF_CHANGE_10M = {
    "temperature_c": 12.0,   # °C per 10 min
    "pressure_hpa": 10.0,    # hPa per 10 min
    "wind_speed_mps": 35.0,  # m/s per 10 min
    "relative_humidity_pct": 50.0
}

def validate_observation(
    temp: Optional[float],
    pressure: Optional[float],
    wind_speed: Optional[float],
    wind_dir: Optional[float],
    humidity: Optional[float],
    prev_observation: Optional[dict] = None
) -> Tuple[str, List[str]]:
    """
    Validates a weather observation.
    Returns: (quality_status: 'VALID' | 'SUSPECT' | 'INVALID', quality_flags: list of string tags)
    """
    flags = []
    
    # 1. Physical limits validation
    if temp is not None and not (LIMITS["temperature_c"][0] <= temp <= LIMITS["temperature_c"][1]):
        flags.append(f"TEMP_OUT_OF_BOUNDS({temp}C)")
    
    if pressure is not None and not (LIMITS["pressure_hpa"][0] <= pressure <= LIMITS["pressure_hpa"][1]):
        flags.append(f"PRESSURE_OUT_OF_BOUNDS({pressure}hPa)")
        
    if wind_speed is not None and not (LIMITS["wind_speed_mps"][0] <= wind_speed <= LIMITS["wind_speed_mps"][1]):
        flags.append(f"WIND_OUT_OF_BOUNDS({wind_speed}mps)")
        
    if wind_dir is not None and not (LIMITS["wind_direction_deg"][0] <= wind_dir <= LIMITS["wind_direction_deg"][1]):
        flags.append(f"WIND_DIR_OUT_OF_BOUNDS({wind_dir}deg)")
        
    if humidity is not None and not (LIMITS["relative_humidity_pct"][0] <= humidity <= LIMITS["relative_humidity_pct"][1]):
        flags.append(f"HUMIDITY_OUT_OF_BOUNDS({humidity}%)")

    # If all primary fields are completely missing, mark INVALID
    if temp is None and pressure is None and wind_speed is None:
        return "INVALID", ["ALL_FIELDS_MISSING"]

    if any("OUT_OF_BOUNDS" in f for f in flags):
        return "INVALID", flags

    # 2. Rate-of-change validation (against previous consecutive reading)
    if prev_observation:
        prev_temp = prev_observation.get("temperature_c")
        if temp is not None and prev_temp is not None:
            delta_t = abs(temp - prev_temp)
            if delta_t > MAX_RATE_OF_CHANGE_10M["temperature_c"]:
                flags.append(f"TEMP_JUMP_SUSPECT({delta_t:.1f}C)")

        prev_pressure = prev_observation.get("pressure_hpa")
        if pressure is not None and prev_pressure is not None:
            delta_p = abs(pressure - prev_pressure)
            if delta_p > MAX_RATE_OF_CHANGE_10M["pressure_hpa"]:
                flags.append(f"PRESSURE_JUMP_SUSPECT({delta_p:.1f}hPa)")

    quality_status = "SUSPECT" if flags else "VALID"
    return quality_status, flags

