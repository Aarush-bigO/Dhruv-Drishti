"""
Weather API Router for NPDC / NCPOR Observations and Storm Replay.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

from app.core.database import get_db
from app.models.weather import WeatherObservation
from app.models.weather_anomaly import WeatherAnomalyRecord
from app.services.npdc_client import npdc_status, npdc_client
from app.services.weather_ingestion import ingest_weather_batch
from app.workers.weather_replay import replay_worker
from pathlib import Path
from app.commands.import_npdc import parse_historical_csv

router = APIRouter()

@router.get("/latest/{station_id}")
async def get_latest_weather(
    station_id: str,
    source: str = "npdc",
    db: AsyncSession = Depends(get_db)
):
    """Returns the most recent validated meteorological observation and source freshness state."""
    # First check requested source (npdc or replay)
    result = await db.execute(
        select(WeatherObservation)
        .filter(
            WeatherObservation.station_id == station_id.upper(),
            WeatherObservation.source == source
        )
        .order_by(desc(WeatherObservation.observed_at))
        .limit(1)
    )
    latest = result.scalars().first()

    # Fallback to any source if specific source not found yet
    if not latest:
        fallback_res = await db.execute(
            select(WeatherObservation)
            .filter(WeatherObservation.station_id == station_id.upper())
            .order_by(desc(WeatherObservation.observed_at))
            .limit(1)
        )
        latest = fallback_res.scalars().first()

    status_dict = npdc_status.to_dict()
    if replay_worker.is_running:
        status_dict["status"] = "REPLAY"
        status_dict["source_name"] = f"Historical Replay ({replay_worker.playback_speed}x)"

    if not latest:
        return {
            "station_id": station_id.upper(),
            "has_data": False,
            "freshness": status_dict,
            "message": "No observation records found in database."
        }

    # If any primary field is temporarily None on the newest discrete ping,
    # fill with the most recent valid reading so UI cards remain steady and never flicker to '--'
    temp_c = latest.temperature_c
    press_hpa = latest.pressure_hpa
    ws_mps = latest.wind_speed_mps
    wd_deg = latest.wind_direction_deg
    rh_pct = latest.relative_humidity_pct

    if any(v is None for v in [temp_c, press_hpa, ws_mps, rh_pct]):
        fill_res = await db.execute(
            select(WeatherObservation)
            .filter(
                WeatherObservation.station_id == station_id.upper(),
                WeatherObservation.wind_speed_mps.isnot(None),
                WeatherObservation.pressure_hpa.isnot(None)
            )
            .order_by(desc(WeatherObservation.observed_at))
            .limit(1)
        )
        fill_obs = fill_res.scalars().first()
        if fill_obs:
            if temp_c is None: temp_c = fill_obs.temperature_c
            if press_hpa is None: press_hpa = fill_obs.pressure_hpa
            if ws_mps is None: ws_mps = fill_obs.wind_speed_mps
            if wd_deg is None: wd_deg = fill_obs.wind_direction_deg
            if rh_pct is None: rh_pct = fill_obs.relative_humidity_pct

    return {
        "station_id": latest.station_id,
        "source": latest.source,
        "observed_at": latest.observed_at.isoformat() + "Z",
        "ingested_at": latest.ingested_at.isoformat() + "Z" if latest.ingested_at else None,
        "temperature_c": temp_c,
        "pressure_hpa": press_hpa,
        "wind_speed_mps": ws_mps,
        "wind_direction_deg": wd_deg,
        "relative_humidity_pct": rh_pct,
        "quality_status": latest.quality_status,
        "freshness": status_dict
    }

@router.get("/history/{station_id}")
async def get_weather_history(
    station_id: str,
    source: Optional[str] = None,
    from_time: Optional[str] = None,
    to_time: Optional[str] = None,
    limit: int = Query(1440, ge=1, le=2000),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the last 24 hours of time-series observations for charts and wind rose analysis.
    When no explicit from_time/to_time are given, it anchors to the newest observation's timestamp
    and returns only data from the 24 hours before that — eliminating stale gap artifacts.
    """
    query = select(WeatherObservation).filter(WeatherObservation.station_id == station_id.upper())

    if source:
        query = query.filter(WeatherObservation.source == source)

    # If explicit time range provided (e.g. storm replay), use those directly
    if from_time:
        try:
            dt_from = datetime.fromisoformat(from_time.replace("Z", "+00:00")).replace(tzinfo=None)
            query = query.filter(WeatherObservation.observed_at >= dt_from)
        except Exception:
            pass

    if to_time:
        try:
            dt_to = datetime.fromisoformat(to_time.replace("Z", "+00:00")).replace(tzinfo=None)
            query = query.filter(WeatherObservation.observed_at <= dt_to)
        except Exception:
            pass

    # If no explicit time window given, anchor to newest observation timestamp
    # and only pull the last 24 hours of data from that point
    if not from_time and not to_time:
        # First fetch the newest observation timestamp for this station
        newest_result = await db.execute(
            select(WeatherObservation.observed_at)
            .filter(WeatherObservation.station_id == station_id.upper())
            .order_by(desc(WeatherObservation.observed_at))
            .limit(1)
        )
        newest_ts = newest_result.scalars().first()
        if newest_ts:
            window_start = newest_ts - timedelta(hours=24)
            query = query.filter(WeatherObservation.observed_at >= window_start)

    query = query.order_by(desc(WeatherObservation.observed_at)).limit(limit)
    result = await db.execute(query)
    records = result.scalars().all()

    # Reorder chronologically for charting
    chronological = list(reversed(records))
    
    # Calculate sample interval
    sample_interval_minutes = 1
    if len(chronological) >= 2:
        deltas = []
        for i in range(1, min(len(chronological), 10)):
            diff = (chronological[i].observed_at - chronological[i-1].observed_at).total_seconds() / 60.0
            if diff > 0:
                deltas.append(diff)
        if deltas:
            sample_interval_minutes = round(sum(deltas) / len(deltas), 1)

    obs_list = [
        {
            "id": r.id,
            "station_id": r.station_id,
            "source": r.source,
            "observed_at": r.observed_at.isoformat() + "Z",
            "temperature_c": r.temperature_c,
            "pressure_hpa": r.pressure_hpa,
            "wind_speed_mps": r.wind_speed_mps,
            "wind_direction_deg": r.wind_direction_deg,
            "relative_humidity_pct": r.relative_humidity_pct,
            "quality_status": r.quality_status
        }
        for r in chronological
    ]

    return {
        "station_id": station_id.upper(),
        "total_records": len(obs_list),
        "sample_interval_minutes": sample_interval_minutes,
        "observations": obs_list
    }

@router.get("/anomalies/{station_id}")
async def get_weather_anomalies(
    station_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Returns the list of meteorological anomaly events flagged by the ML model."""
    result = await db.execute(
        select(WeatherAnomalyRecord)
        .filter(WeatherAnomalyRecord.station_id == station_id.upper())
        .order_by(desc(WeatherAnomalyRecord.observed_at))
        .limit(limit)
    )
    records = result.scalars().all()
    return [
        {
            "id": r.id,
            "station_id": r.station_id,
            "observed_at": r.observed_at.isoformat() + "Z",
            "anomaly_score": r.anomaly_score,
            "alert_level": r.alert_level,
            "anomaly_type": r.anomaly_type,
            "details": r.details
        }
        for r in records
    ]

@router.get("/status/{station_id}")
async def get_source_status(station_id: str):
    """Returns the explicit data freshness state machine for the station."""
    status = npdc_status.to_dict()
    if replay_worker.is_running:
        status["replay_status"] = replay_worker.get_status()
    return status

@router.post("/replay")
async def control_replay(payload: Dict[str, Any]):
    """
    Controls historical demonstration replay.
    Body: { "action": "start"|"stop", "speed": 5.0, "station_id": "BHARATI" }
    """
    action = payload.get("action", "start")
    speed = float(payload.get("speed", 5.0))
    station_id = payload.get("station_id", "BHARATI").upper()

    if action == "stop":
        replay_worker.stop_replay()
        return {"status": "stopped", "replay": replay_worker.get_status()}

    # Load sample historical dataset
    root_dir = Path(__file__).resolve().parents[4]
    stn_lower = station_id.lower()
    sample_file = root_dir / "data" / "raw" / "npdc" / stn_lower / f"{stn_lower}_aws_2026_sample.csv"
    if not sample_file.exists():
        # Fallback to bharati
        sample_file = root_dir / "data" / "raw" / "npdc" / "bharati" / "bharati_aws_2026_sample.csv"
    if not sample_file.exists():
        raise HTTPException(status_code=404, detail=f"Historical replay sample file not found at {sample_file}")

    records = parse_historical_csv(sample_file, station_id, 2026)
    if not records:
        raise HTTPException(status_code=400, detail="No replay records parsed from sample file")

    await replay_worker.start_replay(records, speed=speed, station_id=station_id)
    return {
        "status": "started",
        "total_records": len(records),
        "playback_speed": speed,
        "station_id": station_id
    }

@router.post("/sync/{station_id}")
async def sync_live_ncpor_data(
    station_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Directly connects to data.ncpor.res.in, downloads current daily observations for the station,
    and ingests them into the database with duplicate prevention and WebSocket broadcast.
    """
    observations = await npdc_client.poll_current_observations(station_id=station_id.upper())
    if not observations:
        return {
            "status": "warning",
            "message": "NCPOR live server returned 0 new rows for today",
            "freshness": npdc_status.to_dict()
        }

    stats = await ingest_weather_batch(observations, db, source="npdc")
    return {
        "status": "success",
        "station_id": station_id.upper(),
        "stats": stats,
        "freshness": npdc_status.to_dict()
    }


