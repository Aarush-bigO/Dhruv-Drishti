from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from datetime import datetime
from app.core.database import Base

class WeatherAnomalyRecord(Base):
    __tablename__ = "weather_anomalies"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(String(50), index=True, nullable=False)
    observed_at = Column(DateTime, index=True, nullable=False)
    anomaly_score = Column(Float, nullable=False)               # 0.0 to 1.0 (higher = more anomalous)
    alert_level = Column(String(50), default="normal")          # normal, warning, critical
    anomaly_type = Column(String(100), nullable=True)           # RAPID_PRESSURE_DROP, HIGH_WIND_EVENT, EXTREME_COLD_EVENT, SENSOR_FREEZE
    details = Column(Text, nullable=True)                       # JSON explanation of contributing features
    created_at = Column(DateTime, default=datetime.utcnow)

