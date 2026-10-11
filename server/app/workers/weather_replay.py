"""
Historical Weather Replay Worker.
Streams historical Antarctic meteorological events through the real-time anomaly detection
and WebSocket broadcast pipeline for operational demonstrations.
"""
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.services.weather_anomaly_service import weather_anomaly_service
from app.services.ws_manager import manager

class WeatherReplayWorker:
    def __init__(self):
        self.is_running: bool = False
        self.current_index: int = 0
        self.total_records: int = 0
        self.playback_speed: float = 5.0  # 1x, 2x, 5x, 10x, 20x
        self.station_id: str = "BHARATI"
        self._task: Optional[asyncio.Task] = None

    async def start_replay(
        self, 
        records: List[Dict[str, Any]], 
        speed: float = 5.0, 
        station_id: str = "BHARATI"
    ):
        """Starts replaying historical records at the specified playback speed multiplier."""
        self.stop_replay()
        self.is_running = True
        self.playback_speed = max(1.0, min(100.0, float(speed)))
        self.station_id = station_id.upper()
        self.total_records = len(records)
        self.current_index = 0

        self._task = asyncio.create_task(self._replay_loop(records))
        print(f"[Weather Replay] Started playback of {self.total_records} records at {self.playback_speed}x for {self.station_id}.")

    def stop_replay(self):
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
        self._task = None

    async def _replay_loop(self, records: List[Dict[str, Any]]):
        try:
            # Base interval: 1 record every (1.0 / speed) seconds (e.g. 5x = 200ms per record)
            interval = max(0.05, 1.0 / self.playback_speed)
            recent_history = []

            for i, record in enumerate(records):
                if not self.is_running:
                    break

                self.current_index = i + 1
                
                obs_time = record.get("observed_at")
                if isinstance(obs_time, datetime):
                    # parse_historical_csv returns UTC-aware datetimes. Do not
                    # append Z to an existing +00:00 suffix; that produces an
                    # invalid browser timestamp such as `+00:00Z`.
                    if obs_time.tzinfo is not None:
                        obs_time = obs_time.astimezone(timezone.utc).replace(tzinfo=None)
                    obs_time_str = obs_time.isoformat() + "Z"
                else:
                    obs_time_str = str(obs_time)

                # ML Anomaly evaluation
                anomaly_score, alert_level, anomaly_type, details = weather_anomaly_service.score(
                    record, recent_history
                )

                # Construct live weather observation packet
                payload = {
                    "type": "weather_observation",
                    "station_id": self.station_id,
                    "source": "replay",
                    "observed_at": obs_time_str,
                    "temperature_c": record.get("temperature_c"),
                    "pressure_hpa": record.get("pressure_hpa"),
                    "wind_speed_mps": record.get("wind_speed_mps"),
                    "wind_direction_deg": record.get("wind_direction_deg"),
                    "relative_humidity_pct": record.get("relative_humidity_pct"),
                    "quality_status": "VALID",
                    "anomaly_score": anomaly_score,
                    "alert_level": alert_level,
                    "anomaly_type": anomaly_type,
                    "wind_chill_c": details.get("wind_chill_c"),
                    "pressure_tendency_1h_hpa": details.get("pressure_tendency_1h_hpa"),
                    "replay_progress": {
                        "current": i + 1,
                        "total": len(records),
                        "pct": round(((i + 1) / len(records)) * 100.0, 1),
                        "speed": self.playback_speed
                    }
                }

                # Broadcast live over WebSockets
                await manager.broadcast(payload)

                # Update sliding window
                recent_history.insert(0, {
                    "temperature_c": record.get("temperature_c"),
                    "pressure_hpa": record.get("pressure_hpa"),
                    "wind_speed_mps": record.get("wind_speed_mps"),
                    "observed_at": obs_time
                })
                if len(recent_history) > 30:
                    recent_history.pop()

                await asyncio.sleep(interval)

            print(f"[Weather Replay] Completed playback of {self.total_records} records.")
        except asyncio.CancelledError:
            print("[Weather Replay] Playback cancelled.")
        except Exception as e:
            print(f"[Weather Replay] Error during playback: {e}")
        finally:
            self.is_running = False

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_running": self.is_running,
            "current_index": self.current_index,
            "total_records": self.total_records,
            "playback_speed": self.playback_speed,
            "station_id": self.station_id
        }

replay_worker = WeatherReplayWorker()
