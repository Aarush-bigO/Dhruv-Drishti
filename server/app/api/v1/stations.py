from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.inventory import Inventory

router = APIRouter()

STATIONS_DATA = [
  {
    "id": "BHARATI",
    "name": "Bharati Station",
    "lat": -69.4072,
    "lon": 76.1872,
    "established": 2012,
    "crew_count": 25,
    "status": "operational",
    "rooms": [
      {"id": "GEN_ROOM", "name": "Generator Room", "equipment": ["GEN_01", "GEN_02"]},
      {"id": "FUEL_STORE", "name": "Fuel Storage", "equipment": ["FUEL_TANK_01", "FUEL_TANK_02"]},
      {"id": "HVAC_ROOM", "name": "HVAC / Heating", "equipment": ["HVAC_01"]},
      {"id": "BATTERY_ROOM", "name": "Battery Bank", "equipment": ["BATT_01"]},
      {"id": "LIFE_SUPPORT", "name": "Life Support", "equipment": ["WATER_01", "STP_01"]},
      {"id": "LIVING_QUARTERS", "name": "Living Quarters", "equipment": []},
      {"id": "COMMS_ROOM", "name": "Communications", "equipment": ["VSAT_01"]}
    ]
  },
  {
    "id": "MAITRI",
    "name": "Maitri Station",
    "lat": -70.7667,
    "lon": 11.7333,
    "established": 1989,
    "crew_count": 25,
    "status": "operational",
    "rooms": [
      {"id": "GEN_ROOM", "name": "Generator Room", "equipment": ["GEN_01", "GEN_02"]},
      {"id": "FUEL_STORE", "name": "Fuel Storage", "equipment": ["FUEL_TANK_01", "FUEL_TANK_02"]},
      {"id": "HVAC_ROOM", "name": "HVAC / Heating", "equipment": ["HVAC_01"]},
      {"id": "BATTERY_ROOM", "name": "Battery Bank", "equipment": ["BATT_01"]},
      {"id": "LIFE_SUPPORT", "name": "Life Support", "equipment": ["WATER_01", "STP_01"]},
      {"id": "LIVING_QUARTERS", "name": "Living Quarters", "equipment": []},
      {"id": "COMMS_ROOM", "name": "Communications", "equipment": ["VSAT_01"]}
    ]
  }
]

@router.get("/")
async def get_stations():
    return STATIONS_DATA

@router.get("/inventory/{station_id}")
async def get_inventory(station_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Inventory).filter(Inventory.station_id == station_id.upper()))
    inv = result.scalars().first()
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory not found")
    
    return {
        "station_id": inv.station_id,
        "fuel_liters": inv.fuel_liters,
        "fuel_capacity": inv.fuel_capacity,
        "food_days": inv.food_days,
        "medical_supplies_days": inv.medical_supplies_days,
        "spare_parts_count": inv.spare_parts_count,
        "atf_liters": inv.atf_liters,
        "last_resupply": inv.last_resupply
    }
