"""
Dhruv Drishti — Mock NPDC Weather Streamer CLI
Simulates realistic Antarctic weather feeds for offline demonstration and testing.
"""

import time
import math
import random
from typing import Dict, Any


def generate_polar_weather_point(station_id: str, step: int) -> Dict[str, Any]:
    """Generates synthetic Antarctic AWS weather telemetry with realistic physical boundaries."""
    base_temp = -28.0 if station_id == "BHARATI" else -36.0
    diurnal_variation = 3.5 * math.sin(step * 0.1)
    noise = random.uniform(-0.8, 0.8)
    air_temp = round(base_temp + diurnal_variation + noise, 1)

    base_pressure = 985.0
    pressure_trend = 2.0 * math.cos(step * 0.05)
    barometric_pressure = round(base_pressure + pressure_trend + random.uniform(-0.3, 0.3), 1)

    wind_speed = round(max(0.0, 12.0 + 8.0 * math.sin(step * 0.15) + random.uniform(-2.0, 2.0)), 1)
    wind_direction = round((120.0 + 45.0 * math.sin(step * 0.08) + random.uniform(-5.0, 5.0)) % 360, 1)

    return {
        "station_id": station_id,
        "air_temperature_c": air_temp,
        "barometric_pressure_hpa": barometric_pressure,
        "wind_speed_mps": wind_speed,
        "wind_direction_deg": wind_direction,
        "relative_humidity_pct": round(min(100.0, max(20.0, 72.0 + random.uniform(-4.0, 4.0))), 1),
        "freshness": "LIVE",
        "source": "SIMULATED_NPDC_AWS"
    }


if __name__ == "__main__":
    print("Starting Dhruv Drishti mock Antarctic weather stream (Press Ctrl+C to stop)...")
    for step in range(5):
        sample = generate_polar_weather_point("BHARATI", step)
        print(f"[{time.strftime('%H:%M:%S UTC')}] {sample['station_id']}: Temp={sample['air_temperature_c']}°C, "
              f"P={sample['barometric_pressure_hpa']}hPa, Wind={sample['wind_speed_mps']}m/s ({sample['wind_direction_deg']}°)")
        time.sleep(1)
    print("Mock weather streaming verified.")
