"""
NPDC Background Polling Worker.
Periodically fetches new discrete observations from NPDC and updates database and WebSockets.
"""
import asyncio
from datetime import datetime, timezone
from app.core.database import AsyncSessionLocal
from app.services.npdc_client import npdc_client, npdc_status
from app.services.weather_ingestion import ingest_weather_batch

POLL_INTERVAL_SECONDS = 600  # Poll every 10 minutes

async def run_poller_cycle(station_id: str = "BHARATI"):
    """Executes a single polling and ingestion cycle."""
    try:
        observations = await npdc_client.poll_current_observations(station_id=station_id)
        if observations:
            async with AsyncSessionLocal() as session:
                stats = await ingest_weather_batch(observations, session, source="npdc")
                if stats["inserted"] > 0 or stats["updated"] > 0:
                    print(f"[NPDC Poller] Ingested {stats['inserted']} new, {stats['updated']} updated observations for {station_id}")
                else:
                    print(f"[NPDC Poller] Poll complete: No new observations ({stats['duplicates']} duplicates). State: {npdc_status.to_dict()['status']}")
        else:
            print(f"[NPDC Poller] Poll complete: Source returned 0 rows. State: {npdc_status.to_dict()['status']}")
    except Exception as e:
        print(f"[NPDC Poller] Cycle error: {e}")

async def start_npdc_poller(interval: int = POLL_INTERVAL_SECONDS):
    """Continuous polling loop."""
    print(f"[NPDC Poller Worker] Started. Polling NPDC every {interval}s ({interval//60} mins)...")
    while True:
        await run_poller_cycle("BHARATI")
        await asyncio.sleep(2)
        await run_poller_cycle("MAITRI")
        await asyncio.sleep(interval)

