"""
Polar Twin Multi-Physics Scenario Simulation Engine.
Models coupled thermal dynamics (Newton's cooling), generator load balancing,
battery bank discharge curves, bulk fuel reserve mass balance, and compound logistics resupply margins.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List

class SimulationEngine:
    def run_whatif(self, params: dict) -> dict:
        station_id = params.get('station_id', 'BHARATI')
        outdoor_temp = float(params.get('outdoor_temp', -45.0))
        storm_duration = int(params.get('storm_duration_hours', 240))
        gens_offline = int(params.get('generators_offline', 0))
        supply_delay = int(params.get('supply_delay_days', 21))

        # Station Bulk Fuel & Inventory Reserve Parameters
        # Antarctic research stations (Bharati/Maitri) maintain bulk fuel storage (ISO tank depots)
        # capable of sustaining wintering operations over prolonged periods.
        total_seasonal_bulk_fuel = 85000.0   # Liters total seasonal reserve
        initial_temp_in = 21.0              # °C
        initial_battery_soc = 85.0          # %
        base_food_days = 120                # Days of standard food rations
        critical_fuel_reserve = 5000.0      # Liters (Emergency Reserve Threshold)

        # Dynamic Multipliers based on Polar Environmental Physics
        # Sub-zero outdoor temp increases building envelope heat loss and electrical trace-heating demand
        cold_delta = max(0.0, abs(outdoor_temp) - 20.0)
        thermal_demand_mult = 1.0 + (cold_delta * 0.025)

        # Generator Operation Modes
        # Normal (gens_offline == 0): 1 Active Generator (65% load) + 1 Standby auto-failover
        # Strained (gens_offline == 1): 1 Active Generator (88% load, higher fuel burn, NO redundancy)
        # Catastrophic (gens_offline == 2): 0 Generators operating -> Full Main Power Loss
        if gens_offline == 0:
            fuel_burn_rate_lph = 68.0 * thermal_demand_mult
            generators_active = 1
            has_redundancy = True
        elif gens_offline == 1:
            fuel_burn_rate_lph = 86.0 * thermal_demand_mult  # Higher strain fuel burn
            generators_active = 1
            has_redundancy = False
        else: # gens_offline == 2
            fuel_burn_rate_lph = 0.0  # Engines stopped
            generators_active = 0
            has_redundancy = False

        # Supply ship delay directly reduces the station's available fuel buffer
        # In Antarctica, supply ships replenish the bulk fuel tanks for the season.
        # Every day of delay means the station is consuming from its pre-resupply reserves!
        daily_baseline_burn = 24.0 * 68.0  # ~1,632 L/day
        effective_starting_fuel = max(8000.0, total_seasonal_bulk_fuel - (supply_delay * 720.0))

        timeline: List[Dict[str, Any]] = []
        milestones: List[Dict[str, Any]] = []

        fuel = effective_starting_fuel
        temp_in = initial_temp_in
        battery_soc = initial_battery_soc
        total_hours = max(24, storm_duration)
        step_hours = 3 if total_hours <= 120 else (6 if total_hours <= 360 else 12)

        blackout_hour = None
        freezing_hour = None
        fuel_depleted_hour = None
        battery_exhausted_hour = None
        critical_fuel_hour = None

        for h in range(0, total_hours + 1):
            is_storm_active = (h <= storm_duration)
            current_out_temp = outdoor_temp if is_storm_active else min(-15.0, outdoor_temp + 15.0)

            # 1. Fuel Depletion & Generator Operation
            if generators_active > 0 and fuel > 0:
                fuel_consumed = fuel_burn_rate_lph * 1.0
                fuel = max(0.0, fuel - fuel_consumed)
                
                # Check critical reserve threshold (5,000L)
                if fuel <= critical_fuel_reserve and critical_fuel_hour is None:
                    critical_fuel_hour = h
                    milestones.append({
                        "hour": h,
                        "severity": "ultra_high",
                        "title": "Critical Fuel Buffer Breach (< 5,000L)",
                        "description": "Station bulk reserve has fallen below emergency reserve threshold. Enforce strict electrical load shedding."
                    })

                if fuel <= 0 and fuel_depleted_hour is None:
                    fuel_depleted_hour = h
                    generators_active = 0
                    milestones.append({
                        "hour": h,
                        "severity": "critical",
                        "title": "Fuel Starvation — Generators Offline",
                        "description": "Station fuel reserves completely exhausted. Prime movers starved of fuel."
                    })
            else:
                # Generators offline
                pass

            # 2. Battery Bank Dynamics
            if generators_active > 0:
                # Generator powers station and maintains battery float charge
                battery_soc = min(95.0, battery_soc + 0.5)
            else:
                # Battery discharges supplying critical emergency circuits (draw ~18.5% per hour)
                battery_soc = max(0.0, battery_soc - 18.5)
                if battery_soc <= 20.0 and battery_soc > 0 and battery_exhausted_hour is None:
                    milestones.append({
                        "hour": h,
                        "severity": "ultra_high",
                        "title": "Battery Bank Critical Cutoff (20% SOC)",
                        "description": "Emergency battery bank approaching deep discharge threshold."
                    })
                if battery_soc <= 0 and battery_exhausted_hour is None:
                    battery_exhausted_hour = h
                    if blackout_hour is None:
                        blackout_hour = h
                    milestones.append({
                        "hour": h,
                        "severity": "critical",
                        "title": "Total Station Blackout",
                        "description": "Emergency battery bank exhausted. All telemetry, life support, and communications collapsed."
                    })

            # 3. Thermal Dynamics (Newton's Cooling Law)
            if generators_active > 0:
                # HVAC actively running
                if gens_offline == 0:
                    target_temp = 21.0
                    temp_in = temp_in + (target_temp - temp_in) * 0.15
                else:
                    # Strained heating in extreme cold with 1 gen
                    target_temp = max(15.0, 20.0 - (cold_delta * 0.12))
                    temp_in = temp_in + (target_temp - temp_in) * 0.10
            else:
                # Heat loss rate based on building envelope insulation coefficient ~ 0.052 / hr
                heat_loss_rate = 0.052 * (temp_in - current_out_temp)
                temp_in = max(current_out_temp, temp_in - heat_loss_rate)

            # Record milestone when indoor crosses freezing point (0°C)
            if temp_in <= 0.0 and freezing_hour is None:
                freezing_hour = h
                milestones.append({
                    "hour": h,
                    "severity": "critical",
                    "title": "Habitat Freeze Breach (0°C)",
                    "description": "Internal temperature fell below 0°C. Water lines and central plumbing at immediate risk of bursting."
                })

            # 4. Habitability & Survivability Index (0 to 100%)
            temp_score = max(0.0, min(100.0, ((temp_in - 0.0) / 21.0) * 100.0))
            power_score = 100.0 if generators_active > 0 else (battery_soc * 0.8)
            habitability = round((temp_score * 0.6) + (power_score * 0.4), 1)

            # Append to timeline at sample steps
            if h % step_hours == 0 or h == total_hours:
                timeline.append({
                    "hour": h,
                    "fuel_remaining": round(fuel, 1),
                    "temp_indoor": round(temp_in, 1),
                    "temp_outdoor": round(current_out_temp, 1),
                    "battery_soc": round(battery_soc, 1),
                    "habitability_index": max(0.0, habitability)
                })

        # =========================================================================
        # COMPOUND MULTI-PHYSICS RISK EVALUATION (5 DISTINCT TIERS)
        # Levels: LOW, MEDIUM, HIGH, ULTRA HIGH, CRITICAL
        # =========================================================================
        
        # 1. Storm Duration Stress (Scaled progressively so ~80% of 720h reaches max/critical)
        norm_storm = min(1.0, storm_duration / 720.0)
        # 80% of 720h = 576h. At 120h, this is only ~9.5%. At 576h (80%), it hits ~80-85%.
        f_storm = min(100.0, ((norm_storm / 0.80) ** 1.35) * 82.0)

        # 2. Supply Ship Delay Stress (Directly compounds into blackout risk!)
        norm_delay = min(1.0, supply_delay / 60.0)
        # 0d=0%, 15d=15%, 30d=38%, 48d(80%)=75%, 60d=100%
        f_ship = min(100.0, (norm_delay ** 1.3) * 85.0)

        # 3. Generator Reliability Stress
        if gens_offline == 2:
            f_gen = 100.0
        elif gens_offline == 1:
            f_gen = 42.0  # Operating without N-1 redundancy
        else:
            f_gen = 0.0

        # 4. Thermal Shock Stress
        f_temp = min(35.0, (cold_delta / 60.0) * 35.0)

        # 5. Compound Interaction (Long storm burning fuel while supply ship is delayed)
        interaction = (norm_storm * norm_delay) * 22.0

        if gens_offline == 2:
            blackout_score = 100.0
            blackout_risk = "CRITICAL"
            heating_risk = "CRITICAL"
            fuel_depletion_hours = 0
            blackout_eta_hours = 4.5
        else:
            # Composite Blackout Risk calculation
            base_composite = (0.42 * f_storm) + (0.35 * f_ship) + f_gen + (0.23 * f_temp) + interaction
            
            # Individual dominant driver overrides:
            storm_alone_score = min(100.0, ((norm_storm / 0.80) ** 1.35) * 85.0)
            ship_alone_score = min(100.0, ((norm_delay / 0.80) ** 1.35) * 80.0) + (f_gen * 0.5)

            blackout_score = max(base_composite, storm_alone_score, ship_alone_score)
            
            # If 1 generator is offline, floor the risk at High (~45%)
            if gens_offline == 1:
                blackout_score = max(blackout_score, 45.0 + (storm_alone_score * 0.4))
            
            # If fuel actually depleted during simulation, immediate Critical
            if fuel_depleted_hour is not None and fuel_depleted_hour <= storm_duration:
                blackout_score = 98.0
            elif critical_fuel_hour is not None:
                blackout_score = max(blackout_score, 75.0)

            blackout_score = min(100.0, max(0.0, round(blackout_score, 1)))

            # Map to 5 distinct tiers with clean thresholds
            if blackout_score < 20.0:
                blackout_risk = "LOW"
            elif blackout_score < 42.0:
                blackout_risk = "MEDIUM"
            elif blackout_score < 65.0:
                blackout_risk = "HIGH"
            elif blackout_score < 82.0:
                blackout_risk = "ULTRA HIGH"
            else:
                blackout_risk = "CRITICAL"

            fuel_depletion_hours = int(effective_starting_fuel / fuel_burn_rate_lph) if fuel_burn_rate_lph > 0 else 999
            blackout_eta_hours = fuel_depletion_hours + 4.5

        # Heating Risk Classification (5 Tiers)
        if gens_offline == 2 or (freezing_hour is not None and freezing_hour <= storm_duration):
            heating_risk = "CRITICAL"
        elif temp_in <= 4.0 or (gens_offline == 1 and outdoor_temp < -60.0):
            heating_risk = "ULTRA HIGH"
        elif temp_in <= 12.0 or (gens_offline == 1 and outdoor_temp < -45.0):
            heating_risk = "HIGH"
        elif temp_in <= 17.0 or outdoor_temp < -40.0:
            heating_risk = "MEDIUM"
        else:
            heating_risk = "LOW"

        # Food & Supply Delay Calculation
        storm_days = storm_duration / 24.0
        remaining_food_days = max(0, int(base_food_days - supply_delay - (storm_days * 0.5)))
        fuel_autonomy_days = round(fuel_depletion_hours / 24.0, 1)
        resupply_deficit_days = max(0, supply_delay - int(fuel_autonomy_days))

        # =========================================================================
        # ACTIONABLE ENGINEERING RECOMMENDATIONS (TUNED TO 5 TIERS)
        # =========================================================================
        recommendations = []
        if blackout_risk == "CRITICAL":
            recommendations.append("🚨 EMERGENCY PROTOCOL: Grid collapse threshold reached. Attempt immediate cold-start on emergency auxiliary generator.")
            recommendations.append("Concentrate station crew in central insulated habitat module (Living Quarters); seal thermal airlocks.")
            recommendations.append("Conserve remaining battery bank: shed 100% auxiliary circuits, retain VSAT beacon and life support only.")
            recommendations.append("Broadcast formal polar distress message to NCPOR Operations Control and neighboring stations.")
        elif blackout_risk == "ULTRA HIGH":
            recommendations.append("⚠️ TIER-3 ENERGY RATIONING: Compound threat detected (extended storm duration + logistics delay).")
            recommendations.append("Reduce habitat thermal thermostat setpoints to 16.5°C; power down non-vital scientific laboratories.")
            recommendations.append("Pre-heat standby generator crankcase manifolds via secondary thermal trace to ensure instant load pickup.")
            recommendations.append("Logistics Warning: Request emergency ski-plane or heavy-lift helicopter fuel transfer window.")
        elif blackout_risk == "HIGH":
            recommendations.append("⚡ ELEVATED ALERT: Operating without N-1 redundancy or facing significant supply ship delay.")
            recommendations.append("Implement Tier-2 Load Shedding: cycle generator loads every 96 hours to prevent thermal fatigue.")
            recommendations.append("Connect auxiliary transfer pump lines between bulk fuel containers and primary day tanks.")
        elif blackout_risk == "MEDIUM":
            recommendations.append("ℹ️ MODERATE VULNERABILITY: Monitor outdoor wind chill index and generator bus frequency every 4 hours.")
            recommendations.append("Verify fuel heating trace lines on exterior exposed pipe runs to prevent wax precipitation.")
            recommendations.append("Maintain routine satellite telemetry handshake with NCPOR headquarters.")
        else:
            recommendations.append("✅ NOMINAL STABILITY: All power generation, thermal loops, and fuel margins well within safety envelope.")
            recommendations.append("Standard dual-generator load rotation scheduled at next regular 120-hour interval.")

        if resupply_deficit_days > 0:
            recommendations.append(f"🚢 LOGISTICS DEFICIT: Supply ship delay ({supply_delay}d) exceeds fuel reserve autonomy by {resupply_deficit_days} days. Prioritize resupply routing.")

        blackout_timestamp = (datetime.now(timezone.utc) + timedelta(hours=blackout_eta_hours)).strftime("%Y-%m-%dT%H:%M:%SZ")

        return {
            "fuel_depletion_hours": fuel_depletion_hours,
            "blackout_risk": blackout_risk,
            "blackout_risk_score": blackout_score,
            "risk_tier": blackout_risk,
            "threat_breakdown": {
                "blizzard_stress": round(min(100.0, f_storm), 1),
                "ship_delay_stress": round(min(100.0, f_ship), 1),
                "generator_stress": round(min(100.0, f_gen), 1),
                "thermal_stress": round(min(100.0, f_temp), 1)
            },
            "estimated_blackout_at": blackout_timestamp,
            "blackout_eta_hours": round(blackout_eta_hours, 1),
            "freezing_hour": freezing_hour,
            "food_remaining_days": remaining_food_days,
            "battery_backup_hours": 4.5 if gens_offline == 2 else 12.0,
            "heating_failure_risk": heating_risk,
            "resupply_deficit_days": resupply_deficit_days,
            "fuel_autonomy_days": fuel_autonomy_days,
            "milestones": milestones,
            "recommended_actions": recommendations,
            "timeline": timeline
        }

simulation_engine = SimulationEngine()
