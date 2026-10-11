from typing import Optional
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.telemetry import TelemetryRecord
from app.services.anomaly_service import anomaly_service
from app.services.ws_manager import manager

router = APIRouter()

@router.post("/ingest")
async def ingest_telemetry(payload: dict, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    # Run Advanced Multi-Model Anomaly Detection & Physics Engine
    anomaly_score, failure_risk, alert_level, diagnostics = anomaly_service.score(payload)
    
    # Enrich payload with full XAI diagnostics and consensus metrics
    enriched_data = {
        **payload,
        "anomaly_score": anomaly_score,
        "failure_risk": failure_risk,
        "alert_level": alert_level,
        "diagnostics": diagnostics
    }
    
    # Save to db — map only known model columns
    record = TelemetryRecord(
        station_id=enriched_data.get("station_id"),
        equipment_id=enriched_data.get("equipment_id"),
        timestamp=enriched_data.get("timestamp"),
        outdoor_temp=enriched_data.get("outdoor_temp"),
        indoor_temp=enriched_data.get("indoor_temp"),
        generator_rpm=enriched_data.get("generator_rpm"),
        fuel_level_liters=enriched_data.get("fuel_level_liters"),
        vibration_level=enriched_data.get("vibration_level"),
        hvac_pressure=enriched_data.get("hvac_pressure"),
        water_temp=enriched_data.get("water_temp"),
        solar_output_kw=enriched_data.get("solar_output_kw"),
        battery_soc=enriched_data.get("battery_soc"),
        anomaly_score=enriched_data.get("anomaly_score"),
        failure_risk=enriched_data.get("failure_risk"),
        alert_level=enriched_data.get("alert_level"),
    )
    db.add(record)
    await db.commit()
    
    # Broadcast to WS
    background_tasks.add_task(manager.broadcast, enriched_data)
    
    return {"status": "success", "anomaly_score": anomaly_score, "failure_risk": failure_risk, "alert_level": alert_level}

@router.get("/history/{station_id}")
async def get_telemetry_history(
    station_id: str, 
    equipment_id: Optional[str] = None, 
    limit: int = 300, 
    db: AsyncSession = Depends(get_db)
):
    query = select(TelemetryRecord).filter(TelemetryRecord.station_id == station_id)
    if equipment_id:
        query = query.filter(TelemetryRecord.equipment_id == equipment_id)
    
    result = await db.execute(
        query.order_by(TelemetryRecord.timestamp.desc()).limit(limit)
    )
    records = result.scalars().all()
    # Reverse so records are in chronological order (oldest to newest) for charting
    records_asc = list(reversed(records))
    return [
        {
            "station_id": r.station_id,
            "equipment_id": r.equipment_id,
            "timestamp": r.timestamp,
            "outdoor_temp": r.outdoor_temp,
            "indoor_temp": r.indoor_temp,
            "generator_rpm": r.generator_rpm,
            "fuel_level_liters": r.fuel_level_liters,
            "vibration_level": r.vibration_level,
            "hvac_pressure": r.hvac_pressure,
            "water_temp": r.water_temp,
            "solar_output_kw": r.solar_output_kw,
            "battery_soc": r.battery_soc,
            "anomaly_score": r.anomaly_score,
            "failure_risk": r.failure_risk,
            "alert_level": r.alert_level
        } for r in records_asc
    ]
