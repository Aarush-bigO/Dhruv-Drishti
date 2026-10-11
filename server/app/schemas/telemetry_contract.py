"""
Dhruv Drishti — Telemetry & Weather Data Contracts (Pydantic v2)
Strict schemas for IoT Core MQTT payloads, edge queue packets, and NPDC weather feeds.
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator


class StationTelemetryPayload(BaseModel):
    """Real-time mechanical and environmental telemetry from Antarctic stations."""
    station_id: Literal["BHARATI", "MAITRI"] = Field(..., description="Target station identifier")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="UTC observation timestamp")
    
    # Atmospheric Telemetry
    outdoor_temp: float = Field(..., ge=-89.2, le=20.0, description="Ambient air temp (°C)")
    indoor_temp: float = Field(..., ge=0.0, le=40.0, description="Habitat indoor temp (°C)")
    
    # Power & Generation
    generator_rpm: float = Field(..., ge=0.0, le=2200.0, description="Primary diesel generator RPM")
    vibration_level: float = Field(..., ge=0.0, le=25.0, description="Bearing harmonic vibration (mm/s)")
    battery_soc: float = Field(..., ge=0.0, le=100.0, description="Battery state-of-charge percentage")
    
    # Consumables & Life Support
    fuel_level_liters: float = Field(..., ge=0.0, le=25000.0, description="Remaining Arctic diesel volume (L)")
    hvac_pressure: float = Field(..., ge=0.0, le=2.5, description="Habitation HVAC line pressure (bar)")
    water_temp: float = Field(..., ge=0.0, le=60.0, description="Potable water reclamation loop temp (°C)")
    solar_output_kw: Optional[float] = Field(default=0.0, ge=0.0, le=50.0, description="Solar PV output (kW)")

    @field_validator("vibration_level")
    @classmethod
    def validate_vibration(cls, v: float) -> float:
        if v > 15.0:
            # Extreme structural resonance cutoff
            return round(v, 2)
        return round(v, 2)


class NPDCWeatherObservation(BaseModel):
    """Normalized observation schema matching National Polar Data Center (NPDC) feeds."""
    station_id: Literal["BHARATI", "MAITRI"]
    observed_at: datetime
    air_temperature_c: float
    barometric_pressure_hpa: float = Field(..., ge=900.0, le=1050.0)
    wind_speed_mps: float = Field(..., ge=0.0, le=80.0)
    wind_direction_deg: float = Field(..., ge=0.0, le=360.0)
    relative_humidity_pct: float = Field(..., ge=0.0, le=100.0)
    freshness_state: Literal["LIVE", "DELAYED", "STALE", "OFFLINE"] = "LIVE"
    source: str = "NPDC_AWS_API"
