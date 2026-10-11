from sqlalchemy import Column, Integer, String, Float, DateTime, UniqueConstraint, Index
from datetime import datetime
from app.core.database import Base

class WeatherObservation(Base):
    __tablename__ = "weather_observations"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(String(50), index=True, nullable=False)  # BHARATI / MAITRI
    source = Column(String(50), index=True, nullable=False)      # npdc, simulator, replay, manual
    observed_at = Column(DateTime, index=True, nullable=False)   # UTC timestamp from source
    ingested_at = Column(DateTime, default=datetime.utcnow)      # UTC timestamp when saved to DB
    
    # Normalized meteorological measurements
    temperature_c = Column(Float, nullable=True)                 # °C
    pressure_hpa = Column(Float, nullable=True)                  # hPa / mbar
    wind_speed_mps = Column(Float, nullable=True)                # m/s
    wind_direction_deg = Column(Float, nullable=True)            # 0 - 360 deg
    relative_humidity_pct = Column(Float, nullable=True)         # %
    
    # Original raw units if converted
    original_wind_speed = Column(Float, nullable=True)
    original_wind_unit = Column(String(20), nullable=True)       # knots, m/s
    original_pressure = Column(Float, nullable=True)
    original_pressure_unit = Column(String(20), nullable=True)   # mbar, hPa
    
    # Quality & Ingestion tracking
    quality_status = Column(String(50), default="VALID")         # VALID, SUSPECT, INVALID, CORRECTED, INTERPOLATED
    quality_flags = Column(String(255), nullable=True)           # e.g., "RATE_OF_CHANGE_HIGH", "SENSOR_FREEZE"
    source_record_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('station_id', 'source', 'observed_at', name='uq_station_source_observed'),
        Index('ix_station_observed', 'station_id', 'observed_at'),
    )

