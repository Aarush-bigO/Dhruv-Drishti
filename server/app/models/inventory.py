from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from app.core.database import Base

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(String, unique=True, index=True)
    fuel_liters = Column(Float)
    fuel_capacity = Column(Float)
    food_days = Column(Integer)
    medical_supplies_days = Column(Integer)
    spare_parts_count = Column(Integer)
    atf_liters = Column(Float)
    last_resupply = Column(String)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
