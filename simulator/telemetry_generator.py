"""
Polar Twin - Antarctic Station Telemetry Simulator
Simulates realistic sensor data for Maitri and Bharati stations.
Runs continuously, POSTing data every 2 seconds to the FastAPI backend.
Includes SQLite store-and-forward queue for offline resilience.
"""
import time, random, json, sqlite3, math, requests, os
from datetime import datetime, timezone
from pathlib import Path

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000/api/v1/telemetry/ingest")
INTERVAL_SECONDS = 2
DB_PATH = Path(__file__).parent / "offline_queue.db"
FAULT_STATE_PATH = Path(__file__).parent / "fault_state.json"

# --- Station base states (realistic Antarctic operational values)
STATIONS = {
    "BHARATI": {
        "base_outdoor_temp": -35.0,  # degC (Bharati, Larsemann Hills, East Antarctica)
        "base_indoor_temp": 21.0,
        "base_rpm": 1500.0,
        "base_fuel": 14200.0,        # liters
        "base_vibration": 2.2,       # mm/s
        "base_battery_soc": 75.0,    # %
        "base_hvac_pressure": 1.02,  # bar
        "base_water_temp": 18.5,     # degC
        "base_solar_kw": 0.0,        # Winter = 0 (polar night)
        "fuel_burn_rate": 145.0,     # liters/hour
    },
    "MAITRI": {
        "base_outdoor_temp": -40.0,  # degC (Maitri, Schirmacher Oasis, East Antarctica)
        "base_indoor_temp": 20.5,
        "base_rpm": 1500.0,          # Standard 50Hz synchronous diesel generator set
        "base_fuel": 12650.0,        # Continuous baseline
        "base_vibration": 2.4,
        "base_battery_soc": 68.0,
        "base_hvac_pressure": 1.01,
        "base_water_temp": 17.0,
        "base_solar_kw": 0.0,
        "fuel_burn_rate": 145.0,
    }
}

# Per-station mutable state (simulated drift over time)
state = {s: dict(STATIONS[s]) for s in STATIONS}

def init_station_state_from_db():
    """Restore continuous fuel and battery levels from latest recorded telemetry in polar_twin.db."""
    db_file = Path(__file__).parent.parent / "server" / "polar_twin.db"
    if db_file.exists():
        try:
            conn = sqlite3.connect(db_file)
            for st in STATIONS:
                row = conn.execute(
                    "SELECT fuel_level_liters, battery_soc FROM telemetry_records "
                    "WHERE station_id = ? ORDER BY timestamp DESC LIMIT 1",
                    (st,)
                ).fetchone()
                if row:
                    if row[0] is not None and row[0] > 0:
                        state[st]["base_fuel"] = float(row[0])
                    if row[1] is not None and row[1] > 0:
                        state[st]["base_battery_soc"] = float(row[1])
            conn.close()
            print(f"[Simulator] Initialized continuous station state: BHARATI fuel={state['BHARATI']['base_fuel']:.1f}L, MAITRI fuel={state['MAITRI']['base_fuel']:.1f}L")
        except Exception:
            pass

init_station_state_from_db()

# In-process fault mode (also reads from fault_state.json written by scenario_triggers.py)
fault_mode = {"BHARATI": None, "MAITRI": None}


# --- Fault state file integration
def load_fault_state():
    """Read fault overrides from fault_state.json, if present."""
    if FAULT_STATE_PATH.exists():
        try:
            data = json.loads(FAULT_STATE_PATH.read_text())
            for station in STATIONS:
                fault_mode[station] = data.get(station)
        except (json.JSONDecodeError, OSError):
            pass


def save_fault_state():
    """Persist current fault state so scenario_triggers.py can reset it."""
    try:
        FAULT_STATE_PATH.write_text(json.dumps(fault_mode, indent=2))
    except OSError:
        pass


# --- Offline SQLite queue
def init_queue():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS queue "
        "(id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT, ts INTEGER)"
    )
    conn.commit()
    conn.close()


def enqueue(payload: dict):
    """Store a telemetry packet in the local SQLite queue for later delivery."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO queue (payload, ts) VALUES (?, ?)",
        (json.dumps(payload), int(time.time()))
    )
    conn.commit()
    conn.close()


def flush_queue():
    """Attempt to drain the offline queue when the backend connection is restored."""
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT id, payload FROM queue ORDER BY id LIMIT 20"
    ).fetchall()
    sent_ids = []
    for row_id, payload_str in rows:
        try:
            r = requests.post(BACKEND_URL, json=json.loads(payload_str), timeout=3)
            if r.status_code == 200:
                sent_ids.append(row_id)
            else:
                break
        except Exception:
            break
    if sent_ids:
        conn.execute(
            f"DELETE FROM queue WHERE id IN ({','.join('?'*len(sent_ids))})",
            sent_ids
        )
        conn.commit()
        print(f"[Queue] Flushed {len(sent_ids)} queued packet(s) to backend.")
    conn.close()


def queue_depth() -> int:
    """Return number of packets waiting in the offline queue."""
    conn = sqlite3.connect(DB_PATH)
    depth = conn.execute("SELECT COUNT(*) FROM queue").fetchone()[0]
    conn.close()
    return depth


# --- Sensor value generator with realistic drift + noise
def generate_reading(station_id: str, equipment_id: str) -> dict:
    """
    Produce one telemetry reading for the given station and equipment.
    Applies slow sinusoidal drift (1-hour cycle), Gaussian noise, fuel depletion,
    and any active fault-mode overrides.
    """
    s = state[station_id]
    t = time.time()
    fault = fault_mode.get(station_id)

    # Sinusoidal drift: slow 1-hour temperature cycle + fast Gaussian noise
    slow_wave = math.sin(t / 3600) * 2.0
    fast_noise = random.gauss(0, 0.5)

    outdoor_temp   = s["base_outdoor_temp"] + slow_wave * 3 + fast_noise
    indoor_temp    = s["base_indoor_temp"] + random.gauss(0, 0.2)
    rpm            = s["base_rpm"] + random.gauss(0, 3.5)
    vibration      = s["base_vibration"] + abs(random.gauss(0, 0.10))
    hvac_pressure  = s["base_hvac_pressure"] + random.gauss(0, 0.02)
    water_temp     = s["base_water_temp"] + random.gauss(0, 0.3)
    solar_kw       = max(0.0, s["base_solar_kw"] + random.gauss(0, 0.05))

    # Fuel depletes continuously based on burn rate
    fuel_drain_per_interval = (s["fuel_burn_rate"] / 3600) * INTERVAL_SECONDS
    s["base_fuel"] = max(0.0, s["base_fuel"] - fuel_drain_per_interval)
    fuel = s["base_fuel"]

    battery_soc = s["base_battery_soc"] + random.gauss(0, 0.3)
    battery_soc = max(5.0, min(100.0, battery_soc))

    # --- Fault-mode overrides ---
    if fault == "blizzard":
        outdoor_temp -= 15.0
        vibration += 1.2
        rpm += random.gauss(-20, 15)
        # Fuel burn escalates during blizzard (heating demand surges)
        s["fuel_burn_rate"] = min(s["fuel_burn_rate"] * 1.001, 280.0)

    elif fault == "gen_failure":
        rpm = random.gauss(400, 100)   # Generator sputtering / dying
        vibration += 4.5
        battery_soc -= 2.0             # Battery bank compensating for lost gen
        s["base_battery_soc"] = max(5.0, s["base_battery_soc"] - 0.5)

    elif fault == "fuel_low":
        s["base_fuel"] = max(0.0, s["base_fuel"] - 50.0)  # Rapid accelerated drain
        fuel = s["base_fuel"]

    elif fault == "hvac_fault":
        hvac_pressure = 0.25 + random.gauss(0, 0.08)   # Pressure collapse
        indoor_temp -= 0.5
        s["base_indoor_temp"] = max(-5.0, s["base_indoor_temp"] - 0.1)

    return {
        "station_id":          station_id,
        "equipment_id":        equipment_id,
        "timestamp":           int(t),
        "outdoor_temp":        round(outdoor_temp, 2),
        "indoor_temp":         round(indoor_temp, 2),
        "generator_rpm":       round(max(0.0, rpm), 1),
        "fuel_level_liters":   round(fuel, 1),
        "vibration_level":     round(max(0.0, vibration), 3),
        "hvac_pressure":       round(hvac_pressure, 3),
        "water_temp":          round(water_temp, 2),
        "solar_output_kw":     round(solar_kw, 3),
        "battery_soc":         round(battery_soc, 1),
    }


def send_or_queue(payload: dict) -> bool:
    """POST payload to backend; fall back to local queue if unreachable."""
    try:
        resp = requests.post(BACKEND_URL, json=payload, timeout=3)
        if resp.status_code == 200:
            flush_queue()  # Opportunistically drain any backlog
            return True
    except Exception:
        pass
    enqueue(payload)
    return False


# Equipment IDs cycled through each interval
EQUIPMENT_CYCLE = [
    "GEN_01", "GEN_02", "HVAC_01", "BATT_01",
    "FUEL_TANK_01", "FUEL_TANK_02", "WATER_01", "STP_01", "VSAT_01",
]

# ANSI colours for terminal output
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RESET  = "\033[0m"


def fault_colour(fault):
    if fault == "blizzard":    return CYAN
    if fault == "gen_failure": return RED
    if fault == "fuel_low":    return YELLOW
    if fault == "hvac_fault":  return YELLOW
    return GREEN


def main():
    init_queue()
    print(f"\n{GREEN}=================================================={RESET}")
    print(f"{GREEN}       Polar Twin -- Telemetry Simulator          {RESET}")
    print(f"{GREEN}  Indian Antarctic Research Station Digital Twin  {RESET}")
    print(f"{GREEN}=================================================={RESET}\n")
    print(f"  Backend  : {BACKEND_URL}")
    print(f"  Interval : {INTERVAL_SECONDS}s   Stations: BHARATI | MAITRI")
    print(f"  Offline  : {DB_PATH}")
    print(f"  Faults   : edit fault_state.json or run scenario_triggers.py\n")
    print("-" * 80)

    cycle_idx = 0
    while True:
        # Reload fault state from disk every cycle (allows external injection)
        load_fault_state()

        for station_id in ["BHARATI", "MAITRI"]:
            eq_id   = EQUIPMENT_CYCLE[cycle_idx % len(EQUIPMENT_CYCLE)]
            payload = generate_reading(station_id, eq_id)
            ok      = send_or_queue(payload)

            fault   = fault_mode.get(station_id) or "normal"
            colour  = fault_colour(fault_mode.get(station_id))
            status  = f"{GREEN}sent{RESET}" if ok else f"{RED}queued(depth={queue_depth()}){RESET}"

            print(
                f"[{datetime.now().strftime('%H:%M:%S')}] "
                f"{colour}{station_id:8s}{RESET}/{eq_id:14s} | "
                f"RPM:{payload['generator_rpm']:6.0f}  "
                f"Vib:{payload['vibration_level']:5.2f}mm/s  "
                f"Fuel:{payload['fuel_level_liters']:7.0f}L  "
                f"Temp:{payload['outdoor_temp']:6.1f}degC  "
                f"Batt:{payload['battery_soc']:5.1f}%  "
                f"[{colour}{fault:12s}{RESET}] {status}"
            )

        cycle_idx += 1
        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{YELLOW}[Simulator] Stopped. Queued packets preserved in {DB_PATH}{RESET}")
