from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from app.core.database import Base

class RawNPDCFile(Base):
    __tablename__ = "raw_npdc_files"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(String(50), index=True, nullable=False)
    source_url = Column(String(500), nullable=False)
    parameter = Column(String(50), nullable=False)  # temp, pressure, wind_speed, wind_dir, humidity, all
    requested_date = Column(String(20), nullable=False)  # YYYY-MM-DD or Year
    file_name = Column(String(255), nullable=False)
    sha256_hash = Column(String(64), nullable=False, index=True)
    downloaded_at = Column(DateTime, default=datetime.utcnow)
    parser_version = Column(String(20), default="1.0.0")
    raw_content_path = Column(String(500), nullable=True)
    record_count = Column(Integer, default=0)
    import_status = Column(String(50), default="PENDING")  # PENDING, PROCESSED, ERROR

