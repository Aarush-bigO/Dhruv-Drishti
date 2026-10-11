"""
Weather Ingestion Engine.
Manages watermark-based ingestion, deduplication, quality assessment, ML anomaly scoring,
and broadcasting genuinely new discrete observations through WebSockets.
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.weather import WeatherObservation
from app.models.weather_anomaly import WeatherAnomalyRecord
from app.services.weather_quality import validate_observation
from app.services.weather_anomaly_service import weather_anomaly_service
from app.services.npdc_client import npdc_status
from app.services.ws_manager import manager

async def ingest_weather_batch(
    observations: List[Dict[str, Any]], 
    db: AsyncSession,
    source: str = "npdc"
) -> Dict[str, Any]:
    """
    Ingests a list of weather observations with watermark checking, quality validation,
    and deduplication.
    Returns: { "read": int, "inserted": int, "updated": int, "duplicates": int, "anomalies": int }
    """
    stats = {
        "read": len(observations),
        "inserted": 0,
        "updated": 0,
        "duplicates": 0,
        "anomalies": 0,
        "new_records": []
    }

    if not observations:
        return stats

    station_id = observations[0].get("station_id", "BHARATI")

    # Fetch recent history window to compute rate-of-change and ML deltas
    hist_result = await db.execute(
        select(WeatherObservation)
        .filter(WeatherObservation.station_id == station_id)
        .order_by(WeatherObservation.observed_at.desc())
        .limit(30)
    )
    recent_history = [
        {
            "temperature_c": r.temperature_c,
            "pressure_hpa": r.pressure_hpa,
            "wind_speed_mps": r.wind_speed_mps,
            "observed_at": r.observed_at
        }
        for r in hist_result.scalars().all()
    ]

    def _to_utc_naive(dt_val):
        if isinstance(dt_val, str):
            dt_val = datetime.fromisoformat(dt_val.replace("Z", "+00:00"))
        if dt_val.tzinfo is not None:
            return dt_val.astimezone(timezone.utc).replace(tzinfo=None)
        return dt_val

    # Normalize timestamps and batch-query existing records
    for obs in observations:
        obs["_norm_time"] = _to_utc_naive(obs["observed_at"])

    all_times = [obs["_norm_time"] for obs in observations]
    min_time = min(all_times)
    max_time = max(all_times)

    existing_rows_res = await db.execute(
        select(WeatherObservation)
        .filter(
            WeatherObservation.station_id == station_id,
            WeatherObservation.source == source,
            WeatherObservation.observed_at >= min_time,
            WeatherObservation.observed_at <= max_time
        )
    )
    existing_map = {row.observed_at: row for row in existing_rows_res.scalars().all()}

    for obs_idx, obs in enumerate(observations):
        obs_time = obs["_norm_time"]
        existing = existing_map.get(obs_time)

        # Quality validation
        prev_obs = recent_history[0] if recent_history else None
        quality_status, flags = validate_observation(
            temp=obs.get("temperature_c"),
            pressure=obs.get("pressure_hpa"),
            wind_speed=obs.get("wind_speed_mps"),
            wind_dir=obs.get("wind_direction_deg"),
            humidity=obs.get("relative_humidity_pct"),
            prev_observation=prev_obs
        )

        # ML Anomaly Evaluation: Full ensemble on streaming records (<=15) or top recent/sampled records in batches
        is_streaming_or_recent = len(observations) <= 15 or obs_idx >= len(observations) - 15 or (obs_idx % 20 == 0)
        
        if is_streaming_or_recent:
            anomaly_score, alert_level, anomaly_type, anomaly_details = weather_anomaly_service.score(
                obs, recent_history
            )
        else:
            # Fast rule-based check for large historical batches (<0.0001s)
            temp = obs.get("temperature_c")
            wind_speed = obs.get("wind_speed_mps")
            pressure = obs.get("pressure_hpa")
            anomaly_score = 0.05
            alert_level = "normal"
            anomaly_type = "NORMAL_CONDITIONS"
            anomaly_details = {}

            if wind_speed is not None and wind_speed >= 22.0:
                anomaly_type = "HIGH_WIND_EVENT"
                alert_level = "critical" if wind_speed >= 30.0 else "warning"
                anomaly_score = 0.85
                anomaly_details = {"reason": f"High wind velocity: {wind_speed:.1f} m/s"}
            elif temp is not None and temp <= -38.0:
                anomaly_type = "EXTREME_COLD_EVENT"
                alert_level = "critical" if temp <= -45.0 else "warning"
                anomaly_score = 0.80
                anomaly_details = {"reason": f"Severe cold: {temp:.1f} °C"}

        if alert_level != "normal":
            stats["anomalies"] += 1
            # Record in anomaly log
            anomaly_rec = WeatherAnomalyRecord(
                station_id=station_id,
                observed_at=obs_time,
                anomaly_score=anomaly_score,
                alert_level=alert_level,
                anomaly_type=anomaly_type,
                details=str(anomaly_details)
            )
            db.add(anomaly_rec)

        if existing:
            # Check if values have been corrected/updated by NPDC
            has_changes = False
            for field in ["temperature_c", "pressure_hpa", "wind_speed_mps", "wind_direction_deg", "relative_humidity_pct"]:
                new_val = obs.get(field)
                if new_val is not None and getattr(existing, field) != new_val:
                    setattr(existing, field, new_val)
                    has_changes = True

            if has_changes:
                existing.quality_status = "CORRECTED"
                stats["updated"] += 1
            else:
                stats["duplicates"] += 1
        else:
            # Insert new record
            new_record = WeatherObservation(
                station_id=station_id,
                source=source,
                observed_at=obs_time,
                temperature_c=obs.get("temperature_c"),
                pressure_hpa=obs.get("pressure_hpa"),
                wind_speed_mps=obs.get("wind_speed_mps"),
                wind_direction_deg=obs.get("wind_direction_deg"),
                relative_humidity_pct=obs.get("relative_humidity_pct"),
                quality_status=quality_status,
                quality_flags=";".join(flags) if flags else None
            )
            db.add(new_record)
            stats["inserted"] += 1

            # Prepare broadcast payload for genuinely new data
            broadcast_payload = {
                "type": "weather_observation",
                "station_id": station_id,
                "source": source,
                "observed_at": obs_time.isoformat() + "Z",
                "temperature_c": obs.get("temperature_c"),
                "pressure_hpa": obs.get("pressure_hpa"),
                "wind_speed_mps": obs.get("wind_speed_mps"),
                "wind_direction_deg": obs.get("wind_direction_deg"),
                "relative_humidity_pct": obs.get("relative_humidity_pct"),
                "quality_status": quality_status,
                "anomaly_score": anomaly_score,
                "alert_level": alert_level,
                "anomaly_type": anomaly_type
            }
            stats["new_records"].append(broadcast_payload)

            # Update recent history window in-memory
            recent_history.insert(0, {
                "temperature_c": obs.get("temperature_c"),
                "pressure_hpa": obs.get("pressure_hpa"),
                "wind_speed_mps": obs.get("wind_speed_mps"),
                "observed_at": obs_time
            })

    await db.commit()

    # Update source state machine
    if stats["inserted"] > 0:
        npdc_status.last_new_observation_at = datetime.now(timezone.utc)
        if stats["new_records"]:
            latest_time = max(datetime.fromisoformat(r["observed_at"].replace("Z", "+00:00")) for r in stats["new_records"])
            npdc_status.last_source_observed_at = latest_time

    # Broadcast newly ingested observations to WebSockets
    for record_payload in stats["new_records"]:
        await manager.broadcast(record_payload)

    return stats

