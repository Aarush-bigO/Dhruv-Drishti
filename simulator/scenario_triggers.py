"""
Polar Twin — Fault Scenario Trigger
POSTs bursts of pre-built fault payloads directly to the FastAPI backend
to simulate real emergency scenarios for demo / judging purposes.

Usage:
    python scenario_triggers.py blizzard [BHARATI|MAITRI|ALL]
    python scenario_triggers.py gen_failure [BHARATI|MAITRI|ALL]
    python scenario_triggers.py fuel_low [BHARATI|MAITRI|ALL]
    python scenario_triggers.py hvac_fault [BHARATI|MAITRI|ALL]
    python scenario_triggers.py reset [BHARATI|MAITRI|ALL]

Also writes fault_state.json for the running telemetry_generator.py to pick up.
"""
import sys, json, time, random, math
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    print("[ERROR] 'requests' not installed. Run: pip install requests")
    sys.exit(1)

BACKEND_URL = "http://localhost:8000/api/v1/telemetry/ingest"
FAULT_STATE_PATH = Path(__file__).parent / "fault_state.json"
BURST_COUNT = 20   # Number of readings per fault burst
BURST_DELAY = 0.3  # Seconds between readings in a burst

# ANSI colours
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
MAGENTA= "\033[95m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

EQUIPMENT_CYCLE = ["GEN_01", "GEN_02", "HVAC_01", "BATT_01", "FUEL_TANK_01", "WATER_01", "VSAT_01"]

# ---------------------------------------------------------------------------
# Fault payload factories
# ---------------------------------------------------------------------------

def _base_payload(station_id: str, eq_idx: int, t: float) -> dict:
    """Normal-condition baseline for a reading."""
    base_fuel = {"BHARATI": 14077.0, "MAITRI": 12673.0}.get(station_id, 14000.0)
    db_file = Path(__file__).parent.parent / "server" / "polar_twin.db"
    if db_file.exists():
        try:
            import sqlite3
            conn = sqlite3.connect(db_file)
            row = conn.execute("SELECT fuel_level_liters FROM telemetry_records WHERE station_id = ? ORDER BY timestamp DESC LIMIT 1", (station_id,)).fetchone()
            if row and row[0] is not None:
                base_fuel = float(row[0])
            conn.close()
        except Exception:
            pass

    return {
        "station_id":        station_id,
        "equipment_id":      EQUIPMENT_CYCLE[eq_idx % len(EQUIPMENT_CYCLE)],
        "timestamp":         int(t),
        "outdoor_temp":      round(-35.0 + random.gauss(0, 0.5), 2),
        "indoor_temp":       round(21.0 + random.gauss(0, 0.2), 2),
        "generator_rpm":     round(1500.0 + random.gauss(0, 10), 1),
        "fuel_level_liters": round(base_fuel, 1),
        "vibration_level":   round(2.2 + abs(random.gauss(0, 0.15)), 3),
        "hvac_pressure":     round(1.02 + random.gauss(0, 0.02), 3),
        "water_temp":        round(18.5 + random.gauss(0, 0.3), 2),
        "solar_output_kw":   0.0,
        "battery_soc":       round(75.0 + random.gauss(0, 0.3), 1),
    }

def blizzard_payloads(station_id: str) -> list:
    """Outdoor temp drops to -52 degC, vibration spikes, fuel burns fast."""
    payloads = []
    t = time.time()
    fuel = _base_payload(station_id, 0, t).get("fuel_level_liters", 14000.0)
    for i in range(BURST_COUNT):
        fuel = max(0, fuel - random.uniform(0.15, 0.25))  # elevated burn
        payloads.append({
            **_base_payload(station_id, i, t + i),
            "outdoor_temp":      round(-52.0 + random.gauss(0, 1.5), 2),
            "vibration_level":   round(5.8 + abs(random.gauss(0, 0.4)), 3),
            "generator_rpm":     round(1480.0 + random.gauss(-20, 20), 1),
            "fuel_level_liters": round(fuel, 1),
            "battery_soc":       round(72.0 + random.gauss(0, 0.8), 1),
        })
    return payloads

def gen_failure_payloads(station_id: str) -> list:
    """Generator RPM collapses to ~250, vibration goes critical, battery drains."""
    payloads = []
    t = time.time()
    batt = 72.0
    rpm = 1500.0
    for i in range(BURST_COUNT):
        rpm = max(0, rpm - random.uniform(55, 70))   # rapid RPM collapse
        batt = max(5.0, batt - random.uniform(1.2, 2.1))
        payloads.append({
            **_base_payload(station_id, i, t + i),
            "generator_rpm":   round(max(0, rpm + random.gauss(0, 30)), 1),
            "vibration_level": round(8.5 + abs(random.gauss(0, 0.6)), 3),
            "battery_soc":     round(batt, 1),
            "indoor_temp":     round(21.0 - i * 0.1 + random.gauss(0, 0.1), 2),
        })
    return payloads

def fuel_low_payloads(station_id: str) -> list:
    """Fuel drains rapidly: 1800 -> 1500 -> 1200 -> ... -> near zero."""
    payloads = []
    t = time.time()
    fuel = 1800.0
    for i in range(BURST_COUNT):
        fuel = max(0, fuel - random.uniform(14, 18))  # ~15 L/reading
        payloads.append({
            **_base_payload(station_id, i, t + i),
            "fuel_level_liters": round(fuel, 1),
            "generator_rpm":     round(1500.0 + random.gauss(0, 15), 1),
            "vibration_level":   round(2.2 + abs(random.gauss(0, 0.2)), 3),
        })
    return payloads

def hvac_fault_payloads(station_id: str) -> list:
    """HVAC pressure collapses to 0.25 bar, indoor temp drops from 21 to 14 degC."""
    payloads = []
    t = time.time()
    indoor_temp = 21.0
    for i in range(BURST_COUNT):
        indoor_temp = max(-5.0, indoor_temp - random.uniform(0.3, 0.4))
        payloads.append({
            **_base_payload(station_id, i, t + i),
            "hvac_pressure": round(0.25 + random.gauss(0, 0.08), 3),
            "indoor_temp":   round(indoor_temp + random.gauss(0, 0.1), 2),
        })
    return payloads

def reset_payloads(station_id: str) -> list:
    """Five nominal readings to show recovery."""
    t = time.time()
    return [_base_payload(station_id, i, t + i) for i in range(5)]

# ---------------------------------------------------------------------------
# Send helpers
# ---------------------------------------------------------------------------

def post_payload(payload: dict, label: str) -> bool:
    try:
        resp = requests.post(BACKEND_URL, json=payload, timeout=5)
        ok = resp.status_code == 200
        icon = f"{GREEN}OK{RESET}" if ok else f"{RED}ERR {resp.status_code}{RESET}"
        print(
            f"  [{label}] RPM:{payload.get('generator_rpm', '?'):6}  "
            f"Vib:{payload.get('vibration_level', '?'):5}  "
            f"Fuel:{payload.get('fuel_level_liters', '?'):7}L  "
            f"Indoor:{payload.get('indoor_temp', '?'):5}degC  "
            f"HVAC:{payload.get('hvac_pressure', '?'):5} bar  {icon}"
        )
        return ok
    except requests.exceptions.ConnectionError:
        print(f"  [{label}] {RED}Connection refused — is the backend running on {BACKEND_URL}?{RESET}")
        return False
    except Exception as exc:
        print(f"  [{label}] {RED}Error: {exc}{RESET}")
        return False

def send_burst(payloads: list, station_id: str, fault_name: str):
    sent = 0
    for i, payload in enumerate(payloads):
        ok = post_payload(payload, f"{station_id} #{i+1:02d}/{len(payloads)}")
        if ok:
            sent += 1
        time.sleep(BURST_DELAY)
    print(f"\n  {GREEN}Sent {sent}/{len(payloads)} packets for {station_id} [{fault_name}]{RESET}")

def write_fault_state(stations: list, fault: str):
    """Update fault_state.json so the running telemetry_generator picks it up."""
    current = {}
    if FAULT_STATE_PATH.exists():
        try:
            current = json.loads(FAULT_STATE_PATH.read_text())
        except Exception:
            pass
    for s in stations:
        current[s] = fault if fault != "reset" else None
    FAULT_STATE_PATH.write_text(json.dumps(current, indent=2))
    print(f"  [fault_state.json] Updated: {current}")

# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

FAULT_REGISTRY = {
    "blizzard":    (blizzard_payloads,    CYAN,    "BLIZZARD",    "Outdoor temp -52 degC | Vibration 5.8 mm/s | Elevated fuel burn"),
    "gen_failure": (gen_failure_payloads, RED,     "GEN FAILURE", "RPM collapse 1500->250 | Vibration 8.5 mm/s | Battery drain"),
    "fuel_low":    (fuel_low_payloads,    YELLOW,  "FUEL LOW",    "Tank draining 1800->near-empty at 15 L/reading"),
    "hvac_fault":  (hvac_fault_payloads,  MAGENTA, "HVAC FAULT",  "Pressure 0.25 bar | Indoor temp 21->14 degC"),
    "reset":       (reset_payloads,       GREEN,   "RESET",       "5 nominal readings — system returning to normal"),
}

def print_usage():
    print(f"""
{BOLD}Polar Twin — Scenario Trigger{RESET}

Usage:
    python scenario_triggers.py <fault> [station]

Faults:
    blizzard    Severe Antarctic storm
    gen_failure Generator RPM collapse
    fuel_low    Rapid fuel depletion
    hvac_fault  HVAC pressure failure
    reset       Return to normal readings

Stations (optional, default ALL):
    BHARATI     Larsemann Hills station
    MAITRI      Schirmacher Oasis station
    ALL         Both stations (default)

Examples:
    python scenario_triggers.py blizzard
    python scenario_triggers.py gen_failure BHARATI
    python scenario_triggers.py reset ALL
""")

def main():
    if len(sys.argv) < 2 or sys.argv[1] not in FAULT_REGISTRY:
        print_usage()
        sys.exit(0 if len(sys.argv) < 2 else 1)

    fault_name = sys.argv[1]
    station_arg = sys.argv[2].upper() if len(sys.argv) > 2 else "ALL"

    if station_arg == "ALL":
        stations = ["BHARATI", "MAITRI"]
    elif station_arg in ["BHARATI", "MAITRI"]:
        stations = [station_arg]
    else:
        print(f"{RED}Unknown station '{station_arg}'. Use BHARATI, MAITRI, or ALL.{RESET}")
        sys.exit(1)

    factory_fn, colour, label, description = FAULT_REGISTRY[fault_name]

    print(f"\n{BOLD}{colour}{'='*60}{RESET}")
    print(f"{BOLD}{colour}  SCENARIO: {label}{RESET}")
    print(f"{colour}  {description}{RESET}")
    print(f"{colour}  Stations : {', '.join(stations)}{RESET}")
    print(f"{colour}  Burst    : {BURST_COUNT} readings x {BURST_DELAY}s delay{RESET}")
    print(f"{BOLD}{colour}{'='*60}{RESET}\n")

    write_fault_state(stations, fault_name)

    for station_id in stations:
        print(f"{colour}--- {station_id} ---{RESET}")
        payloads = factory_fn(station_id)
        send_burst(payloads, station_id, label)
        print()

    print(f"{GREEN}[Done] Scenario '{fault_name}' injected for {stations}.{RESET}")
    if fault_name != "reset":
        print(f"{YELLOW}Tip: Run 'python scenario_triggers.py reset' to restore normal readings.{RESET}")

if __name__ == "__main__":
    main()
