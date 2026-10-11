"""
NPDC (National Polar Data Center / NCPOR) HTTP Client.
Fetches discrete near-real-time observations from Bharati & Maitri AWS endpoints with dynamic UTC dates,
date-rollover coverage, unit conversions, and connection resilience.
"""
import httpx
import csv
import io
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

NPDC_BASE_URL = "https://data.ncpor.res.in"

class NPDCSourceStatus:
    """Explicit source state machine tracking for NPDC data freshness."""
    def __init__(self):
        self.status: str = "LIVE"  # LIVE, DELAYED, STALE, OFFLINE
        self.last_poll_at: Optional[datetime] = None
        self.last_success_at: Optional[datetime] = None
        self.last_new_observation_at: Optional[datetime] = None
        self.last_source_observed_at: Optional[datetime] = None
        self.consecutive_failures: int = 0
        self.expected_sample_interval_minutes: int = 10

    def to_dict(self) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        minutes_since_observation = None
        if self.last_source_observed_at:
            obs_dt = self.last_source_observed_at
            if obs_dt.tzinfo is None:
                obs_dt = obs_dt.replace(tzinfo=timezone.utc)
            minutes_since_observation = round((now - obs_dt).total_seconds() / 60.0, 1)

        # Dynamic state evaluation
        if self.consecutive_failures >= 3:
            current_status = "OFFLINE"
        elif minutes_since_observation is not None and minutes_since_observation > 45:
            current_status = "STALE"
        elif minutes_since_observation is not None and minutes_since_observation > 20:
            current_status = "DELAYED"
        else:
            current_status = "LIVE" if self.last_success_at else "DELAYED"

        return {
            "status": current_status,
            "source_name": "NPDC AWS Live Server",
            "last_poll_at": self.last_poll_at.isoformat() if self.last_poll_at else None,
            "last_success_at": self.last_success_at.isoformat() if self.last_success_at else None,
            "last_new_observation_at": self.last_new_observation_at.isoformat() if self.last_new_observation_at else None,
            "last_source_observed_at": self.last_source_observed_at.isoformat() if self.last_source_observed_at else None,
            "minutes_since_observation": minutes_since_observation,
            "consecutive_failures": self.consecutive_failures,
            "expected_sample_interval_minutes": self.expected_sample_interval_minutes
        }

npdc_status = NPDCSourceStatus()

class NPDCClient:
    def __init__(self, timeout: float = 6.0):
        self.timeout = timeout

    async def fetch_parameter_csv(
        self, 
        station_id: str, 
        param: str, 
        target_date: Optional[datetime] = None
    ) -> List[Dict[str, str]]:
        """
        Fetches CSV from https://data.ncpor.res.in/{station_id}/{param}_csv?filter=24hr&filter_month={M}&filter_day={D}
        """
        if target_date is None:
            target_date = datetime.now(timezone.utc)

        month = target_date.month
        day = target_date.day
        stn = station_id.lower()
        url = f"{NPDC_BASE_URL}/{stn}/{param}_csv?filter=24hr&filter_month={month}&filter_day={day}"

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PolarTwin/1.0",
            "Accept": "text/csv, text/plain, */*"
        }

        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
            try:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200 and resp.text:
                    return self._parse_csv(resp.text)
            except Exception as e:
                print(f"[NPDC Client] Fetch failed for {url}: {e}")
        return []

    def _parse_csv(self, content: str) -> List[Dict[str, str]]:
        rows = []
        if not content or not content.strip():
            return rows

        reader = csv.reader(io.StringIO(content.strip()))
        headers = None

        for line in reader:
            if not line or not any(line):
                continue
            if headers is None:
                headers = [h.strip().lower() for h in line]
                continue

            row_dict = {}
            for i, val in enumerate(line):
                if i < len(headers):
                    row_dict[headers[i]] = val.strip()
            rows.append(row_dict)

        return rows

    async def poll_current_observations(
        self, 
        station_id: str = "BHARATI",
        target_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Polls live parameter CSVs concurrently from NCPOR and merges them into unified observation objects.
        Handles station-specific NCPOR endpoints (e.g. Maitri wind_csv vs Bharati ws_csv/wd_csv).
        """
        import asyncio
        if target_date is None:
            target_date = datetime.now(timezone.utc)
            dates_to_poll = [
                target_date,
                target_date - timedelta(days=1),
            ]
        else:
            dates_to_poll = [target_date]

        npdc_status.last_poll_at = datetime.now(timezone.utc)
        all_merged_map: Dict[str, Dict[str, Any]] = {}
        stn_upper = station_id.upper()

        try:
            for dt in dates_to_poll:
                if stn_upper == "MAITRI":
                    # Maitri provides all metrics in wind_csv: sln,date,temp,dew_point,rh,ap,ap_1,ap_2,ws,wd
                    # Also fetch temp, ap, rh as complementary sources
                    results = await asyncio.gather(
                        self.fetch_parameter_csv("maitri", "wind", dt),
                        self.fetch_parameter_csv("maitri", "temp", dt),
                        self.fetch_parameter_csv("maitri", "ap", dt),
                        self.fetch_parameter_csv("maitri", "rh", dt),
                        return_exceptions=True
                    )
                    wind_rows = results[0] if isinstance(results[0], list) else []
                    temp_rows = results[1] if isinstance(results[1], list) else []
                    ap_rows = results[2] if isinstance(results[2], list) else []
                    rh_rows = results[3] if isinstance(results[3], list) else []

                    # Process comprehensive wind_csv first
                    for r in wind_rows:
                        t_str = r.get("date") or r.get("obstime") or r.get("timestamp")
                        if not t_str:
                            continue
                        if t_str not in all_merged_map:
                            all_merged_map[t_str] = {}
                        
                        temp_val = self._to_float(r.get("temp"))
                        if temp_val is not None:
                            all_merged_map[t_str]["temperature_c"] = temp_val
                        
                        ap_val = self._to_float(r.get("ap"))
                        if ap_val is not None:
                            all_merged_map[t_str]["pressure_hpa"] = ap_val

                        rh_val = self._to_float(r.get("rh"))
                        if rh_val is not None:
                            all_merged_map[t_str]["relative_humidity_pct"] = rh_val

                        ws_val = self._to_float(r.get("ws"))
                        if ws_val is not None:
                            # Knots to m/s
                            all_merged_map[t_str]["wind_speed_mps"] = round(ws_val * 0.514444, 2)

                        wd_val = self._to_float(r.get("wd"))
                        if wd_val is not None:
                            all_merged_map[t_str]["wind_direction_deg"] = wd_val

                    # Fill any missing metrics from temp/ap/rh endpoints
                    for r in temp_rows:
                        t_str = r.get("date") or r.get("obstime")
                        if t_str and t_str in all_merged_map and all_merged_map[t_str].get("temperature_c") is None:
                            all_merged_map[t_str]["temperature_c"] = self._to_float(r.get("temp"))

                    for r in ap_rows:
                        t_str = r.get("date") or r.get("obstime")
                        if t_str and t_str in all_merged_map and all_merged_map[t_str].get("pressure_hpa") is None:
                            all_merged_map[t_str]["pressure_hpa"] = self._to_float(r.get("ap"))

                    for r in rh_rows:
                        t_str = r.get("date") or r.get("obstime")
                        if t_str and t_str in all_merged_map and all_merged_map[t_str].get("relative_humidity_pct") is None:
                            all_merged_map[t_str]["relative_humidity_pct"] = self._to_float(r.get("rh"))

                else:
                    # Bharati standard 5-parameter concurrent fetch
                    results = await asyncio.gather(
                        self.fetch_parameter_csv("bharati", "temp", dt),
                        self.fetch_parameter_csv("bharati", "ap", dt),
                        self.fetch_parameter_csv("bharati", "rh", dt),
                        self.fetch_parameter_csv("bharati", "ws", dt),
                        self.fetch_parameter_csv("bharati", "wd", dt),
                        return_exceptions=True
                    )
                    temp_rows = results[0] if isinstance(results[0], list) else []
                    ap_rows = results[1] if isinstance(results[1], list) else []
                    rh_rows = results[2] if isinstance(results[2], list) else []
                    ws_rows = results[3] if isinstance(results[3], list) else []
                    wd_rows = results[4] if isinstance(results[4], list) else []

                    for r in temp_rows:
                        t_str = r.get("date") or r.get("obstime") or r.get("timestamp")
                        if t_str:
                            if t_str not in all_merged_map:
                                all_merged_map[t_str] = {}
                            all_merged_map[t_str]["temperature_c"] = self._to_float(r.get("temp") or r.get("value"))

                    for r in ap_rows:
                        t_str = r.get("date") or r.get("obstime") or r.get("timestamp")
                        if t_str:
                            if t_str not in all_merged_map:
                                all_merged_map[t_str] = {}
                            all_merged_map[t_str]["pressure_hpa"] = self._to_float(r.get("ap") or r.get("value"))

                    for r in rh_rows:
                        t_str = r.get("date") or r.get("obstime") or r.get("timestamp")
                        if t_str:
                            if t_str not in all_merged_map:
                                all_merged_map[t_str] = {}
                            all_merged_map[t_str]["relative_humidity_pct"] = self._to_float(r.get("rh") or r.get("value"))

                    for r in ws_rows:
                        t_str = r.get("date") or r.get("obstime") or r.get("timestamp")
                        if t_str:
                            if t_str not in all_merged_map:
                                all_merged_map[t_str] = {}
                            knots = self._to_float(r.get("ws") or r.get("value"))
                            if knots is not None:
                                all_merged_map[t_str]["wind_speed_mps"] = round(knots * 0.514444, 2)

                    for r in wd_rows:
                        t_str = r.get("date") or r.get("obstime") or r.get("timestamp")
                        if t_str:
                            if t_str not in all_merged_map:
                                all_merged_map[t_str] = {}
                            all_merged_map[t_str]["wind_direction_deg"] = self._to_float(r.get("wd") or r.get("value"))
                            # Some wd endpoints also contain ws:
                            if all_merged_map[t_str].get("wind_speed_mps") is None:
                                wd_ws = self._to_float(r.get("ws"))
                                if wd_ws is not None:
                                    all_merged_map[t_str]["wind_speed_mps"] = round(wd_ws * 0.514444, 2)

            # Convert merged dict to list of observation objects
            observations = []
            for t_str, vals in all_merged_map.items():
                obs_dt = self._parse_timestamp(t_str, target_date)
                if obs_dt:
                    observations.append({
                        "station_id": station_id.upper(),
                        "source": "npdc",
                        "observed_at": obs_dt,
                        "temperature_c": vals.get("temperature_c"),
                        "pressure_hpa": vals.get("pressure_hpa"),
                        "wind_speed_mps": vals.get("wind_speed_mps"),
                        "wind_direction_deg": vals.get("wind_direction_deg"),
                        "relative_humidity_pct": vals.get("relative_humidity_pct")
                    })

            npdc_status.last_success_at = datetime.now(timezone.utc)
            npdc_status.consecutive_failures = 0
            if observations:
                npdc_status.last_source_observed_at = max(o["observed_at"] for o in observations)

            return observations

        except Exception as e:
            npdc_status.consecutive_failures += 1
            print(f"[NPDC Client] Poll error for {station_id}: {e}")
            return []

    def _parse_timestamp(self, raw_str: str, base_date: datetime) -> Optional[datetime]:
        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%dT%H:%M:%S",
            "%d-%m-%Y %H:%M:%S",
            "%d/%m/%Y %H:%M:%S",
            "%H:%M:%S",
            "%H:%M"
        ]
        for fmt in formats:
            try:
                parsed = datetime.strptime(raw_str, fmt)
                if fmt in ["%H:%M:%S", "%H:%M"]:
                    return datetime(
                        base_date.year, base_date.month, base_date.day,
                        parsed.hour, parsed.minute, parsed.second, tzinfo=timezone.utc
                    )
                return parsed.replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        return None

    def _to_float(self, val: Any) -> Optional[float]:
        if val is None or val == "":
            return None
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

npdc_client = NPDCClient()
