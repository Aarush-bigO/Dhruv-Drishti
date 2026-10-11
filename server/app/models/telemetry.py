from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from app.core.database import Base

class TelemetryRecord(Base):
    __tablename__ = "telemetry_records"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(String, index=True)
    equipment_id = Column(String, index=True)
    timestamp = Column(Integer, index=True)
    outdoor_temp = Column(Float)
    indoor_temp = Column(Float)
    generator_rpm = Column(Float)
    fuel_level_liters = Column(Float)
    vibration_level = Column(Float)
    hvac_pressure = Column(Float)
    water_temp = Column(Float)
    solar_output_kw = Column(Float)
    battery_soc = Column(Float)
    anomaly_score = Column(Float)
    failure_risk = Column(Float)
    alert_level = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
