"""
CLI Command to Import Historical NPDC / NCPOR AWS Dataset files.
Usage:
    python -m app.commands.import_npdc --file data/raw/npdc/bharati/bharati_aws_2026.csv --station BHARATI --year 2026
"""
import sys
import os
import argparse
import asyncio
import hashlib
import csv
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any

from app.core.database import AsyncSessionLocal, init_db
from app.models.weather_raw import RawNPDCFile
from app.services.weather_ingestion import ingest_weather_batch

def compute_sha256(file_path: Path) -> str:
    sha = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            sha.update(chunk)
    return sha.hexdigest()

def parse_historical_csv(file_path: Path, station_id: str, default_year: int) -> List[Dict[str, Any]]:
    records = []
    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        headers = None

        for row in reader:
            if not row or not any(row):
                continue
            if headers is None:
                headers = [h.strip().lower().replace(" ", "_") for h in row]
                continue

            row_map = {headers[i]: row[i].strip() for i in range(min(len(headers), len(row)))}
            
            # Identify obstime column
            raw_time = row_map.get("obstime") or row_map.get("timestamp") or row_map.get("date_time") or row[0]
            if not raw_time:
                continue

            # Parse datetime
            obs_dt = None
            for fmt in ["%Y-%m-%d %H:%M:%S", "%d-%m-%Y %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%H:%M:%S"]:
                try:
                    obs_dt = datetime.strptime(raw_time, fmt)
                    if fmt == "%H:%M:%S":
                        obs_dt = datetime(default_year, 8, 25, obs_dt.hour, obs_dt.minute, obs_dt.second)
                    obs_dt = obs_dt.replace(tzinfo=timezone.utc)
                    break
                except ValueError:
                    pass

            if not obs_dt:
                continue

            def get_num(key_prefixes, fallback_idx=None):
                for k in row_map:
                    for p in key_prefixes:
                        if p in k:
                            try:
                                return float(row_map[k])
                            except (ValueError, TypeError):
                                pass
                if fallback_idx is not None and fallback_idx < len(row):
                    try:
                        return float(row[fallback_idx])
                    except (ValueError, TypeError):
                        pass
                return None

            temp_c = get_num(["temp"], 1)
            pressure = get_num(["press", "ap", "mbar", "hpa"], 2)
            wind_speed = get_num(["wind_s", "ws", "speed"], 3)
            wind_dir = get_num(["wind_d", "wd", "direction"], 4)
            humidity = get_num(["humid", "rh"], 5)

            # Knots to m/s conversion if header indicates knots
            if any("knot" in k for k in row_map):
                if wind_speed is not None:
                    wind_speed = round(wind_speed * 0.514444, 2)

            records.append({
                "station_id": station_id,
                "source": "npdc",
                "observed_at": obs_dt,
                "temperature_c": temp_c,
                "pressure_hpa": pressure,
                "wind_speed_mps": wind_speed,
                "wind_direction_deg": wind_dir,
                "relative_humidity_pct": humidity
            })

    return records

async def run_import(file_path_str: str, station_id: str, year: int):
    file_path = Path(file_path_str)
    if not file_path.exists():
        print(f"Error: File not found at {file_path}")
        return

    print(f"\n========================================================")
    print(f"   NPDC Historical Data Importer — {station_id} ({year})")
    print(f"========================================================")
    print(f"File Path    : {file_path.absolute()}")

    sha256 = compute_sha256(file_path)
    print(f"SHA256 Hash  : {sha256}")

    # Ensure tables exist
    await init_db()

    # Parse records
    records = parse_historical_csv(file_path, station_id, year)
    print(f"Rows Parsed  : {len(records)}")

    if not records:
        print("Warning: No valid meteorological rows found.")
        return

    # Ingest into DB with deduplication
    async with AsyncSessionLocal() as session:
        # Record file metadata in raw_npdc_files
        raw_file_entry = RawNPDCFile(
            station_id=station_id,
            source_url=f"https://data.ncpor.res.in/dataset/{station_id.lower()}aws/",
            parameter="all",
            requested_date=str(year),
            file_name=file_path.name,
            sha256_hash=sha256,
            record_count=len(records),
            import_status="PROCESSED",
            raw_content_path=str(file_path.absolute())
        )
        session.add(raw_file_entry)
        await session.commit()

        # Batch ingestion
        stats = await ingest_weather_batch(records, session, source="npdc")

    print("\n---------------- Import Validation Report ----------------")
    print(f"Total Rows Read       : {stats['read']}")
    print(f"New Observations Added: {stats['inserted']}")
    print(f"Updated Records       : {stats['updated']}")
    print(f"Duplicates Skipped    : {stats['duplicates']}")
    print(f"Anomalies Flagged     : {stats['anomalies']}")
    print("----------------------------------------------------------")
    print("[OK] Historical Import Complete.\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import NPDC Historical AWS Dataset")
    parser.add_argument("--file", required=True, help="Path to CSV/Excel file")
    parser.add_argument("--station", default="BHARATI", help="Station ID (BHARATI/MAITRI)")
    parser.add_argument("--year", type=int, default=2026, help="Dataset year")

    args = parser.parse_args()
    asyncio.run(run_import(args.file, args.station, args.year))
