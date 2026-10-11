"""
Domain-Specific Physical & Thermodynamic Equations for Antarctic Infrastructure Equipment.
Provides specialized mechanical feature extraction, rate-of-change physics, and mass-balance calculations.
"""

import numpy as np
from typing import Dict, Any, List, Optional, Tuple

class EquipmentPhysicsEngine:
    """
    Computes physics-grounded engineering indicators for Antarctic station machinery.
    """

    @staticmethod
    def evaluate_generator(
        current_data: Dict[str, Any], 
        history_window: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Diesel Generator Diagnostics (GEN_01 / GEN_02):
        - Nominal: 1500 RPM (50 Hz synchronous speed)
        - Normal Vibration RMS: 1.5 - 2.8 mm/s
        - Critical Vibration: > 4.5 mm/s (bearing wear/misalignment)
        """
        rpm = float(current_data.get("generator_rpm", 1500.0))
        vib = float(current_data.get("vibration_level", 2.2))
        temp_in = float(current_data.get("indoor_temp", 21.0))

        # 1. Frequency / RPM Deviation Index
        rpm_delta = abs(rpm - 1500.0)
        frequency_drift_hz = (rpm / 30.0) - 50.0  # 4-pole synchronous generator f = N * P / 120

        # 2. Dynamic Mechanical Stress Index (coupled vibration and speed)
        mech_stress = (vib / 2.5) ** 1.8 + (rpm_delta / 80.0) ** 1.5

        # 3. Rolling Vibration Jitter from History
        vib_std = 0.15
        if history_window and len(history_window) >= 3:
            vibs = [float(h.get("vibration_level", vib)) for h in history_window if h.get("vibration_level") is not None]
            if len(vibs) >= 2:
                vib_std = float(np.std(vibs))

        # 4. Thermal-Vibration Coupling (High vibration + elevated indoor room temp)
        thermal_coupling_index = round((vib / 3.0) * (max(0.0, temp_in - 15.0) / 10.0), 3)

        return {
            "equipment_type": "GENERATOR",
            "rpm_nominal_delta": round(rpm_delta, 1),
            "frequency_drift_hz": round(frequency_drift_hz, 2),
            "mechanical_stress_index": round(mech_stress, 3),
            "vibration_jitter_rms": round(vib_std, 3),
            "thermal_coupling_index": thermal_coupling_index,
            "recommended_actions": (
                ["EMERGENCY: Initiate immediate load-shed and swap to backup generator", "Inspect drive-shaft coupling for dynamic angular misalignment"]
                if vib > 4.5 or mech_stress > 3.0 else
                ["Schedule preventive laser shaft alignment within 48h", "Verify lubricating oil viscosity under cold load"]
                if vib > 3.2 or mech_stress > 1.8 else
                ["Nominal steady-state generator synchronization", "Next 250-hour filter service nominal"]
            )
        }

    @staticmethod
    def evaluate_hvac(
        current_data: Dict[str, Any], 
        history_window: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        HVAC & Thermal Heat Pump System (HVAC_01):
        - Nominal pressure head: 0.95 - 1.15 bar
        - Thermal Lift: delta T = (indoor_temp - outdoor_temp)
        - Deficit: Pressure drop < 0.6 bar during severe cold indicates refrigerant leak / compressor valve failure.
        """
        pressure = float(current_data.get("hvac_pressure", 1.02))
        indoor_temp = float(current_data.get("indoor_temp", 21.0))
        outdoor_temp = float(current_data.get("outdoor_temp", -35.0))

        thermal_lift_c = indoor_temp - outdoor_temp
        pressure_head_ratio = pressure / 1.02

        # Thermal Transfer Coefficient (Coefficient of Performance proxy)
        cop_proxy = max(0.1, (thermal_lift_c / 55.0) * pressure_head_ratio)

        is_critical_deficit = pressure < 0.45 or (thermal_lift_c < 30.0 and outdoor_temp < -30.0)

        return {
            "equipment_type": "HVAC",
            "thermal_lift_c": round(thermal_lift_c, 1),
            "pressure_head_ratio": round(pressure_head_ratio, 2),
            "cop_efficiency_proxy": round(cop_proxy, 2),
            "recommended_actions": (
                ["CRITICAL: Activate emergency glycol trace heating loop immediately", "Inspect compressor expansion valve for cryogenic icing"]
                if is_critical_deficit else
                ["Schedule HVAC refrigerant pressure test", "Verify thermal trace insulation along outer intake conduit"]
                if pressure < 0.75 else
                ["Heating loop nominal", "Thermal transfer efficiency within design specification"]
            )
        }

    @staticmethod
    def evaluate_fuel_storage(
        current_data: Dict[str, Any], 
        history_window: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Polar Fuel Storage Tank (FUEL_TANK_01 / FUEL_TANK_02):
        - Mass-balance leak detection: Delta Fuel - (Burn Rate * Delta Time)
        - Extreme cold shrinkage compensation: ~0.08% volume change per °C
        """
        fuel = float(current_data.get("fuel_level_liters", 14200.0))
        temp_out = float(current_data.get("outdoor_temp", -35.0))

        # Depletion rate over historical window
        burn_rate_lph = 145.0  # Nominal liters per hour
        unmetered_loss_rate = 0.0

        if history_window and len(history_window) >= 2:
            oldest = history_window[0]
            dt_hours = max(0.01, (current_data.get("timestamp", 0) - oldest.get("timestamp", 0)) / 3600.0)
            if dt_hours > 0 and oldest.get("fuel_level_liters") is not None:
                actual_drain = float(oldest["fuel_level_liters"]) - fuel
                expected_drain = burn_rate_lph * dt_hours
                unmetered_loss_rate = max(0.0, (actual_drain - expected_drain) / dt_hours)

        days_remaining = fuel / (burn_rate_lph * 24.0)

        return {
            "equipment_type": "FUEL_STORAGE",
            "fuel_reserve_liters": round(fuel, 1),
            "estimated_days_autonomy": round(days_remaining, 1),
            "unmetered_leak_loss_lph": round(unmetered_loss_rate, 2),
            "recommended_actions": (
                ["CRITICAL: Rapid unmetered fuel loss detected — inspect fuel manifold for cryogenic pipe breach", "Lock cross-feed valve between Tank A and Tank B"]
                if unmetered_loss_rate > 50.0 or fuel < 2000.0 else
                ["Fuel reserves below 30% reserve threshold — ration non-essential generator circuits"]
                if fuel < 5000.0 else
                ["Fuel storage mass-balance nominal", "Storage tank trace heating active"]
            )
        }

    @staticmethod
    def evaluate_battery_bank(
        current_data: Dict[str, Any], 
        history_window: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Lithium/Lead-Acid Polar Battery Bank (BATT_01):
        - Nominal State of Charge (SOC): 60% - 95%
        - Critical Depth of Discharge: SOC < 20%
        """
        soc = float(current_data.get("battery_soc", 75.0))
        temp_in = float(current_data.get("indoor_temp", 21.0))

        # Battery Health degradation index (Sub-zero battery room reduces chemical capacity by 40%)
        cold_capacity_derate = max(0.0, (15.0 - temp_in) * 0.03) if temp_in < 15.0 else 0.0
        effective_capacity_pct = max(10.0, soc * (1.0 - cold_capacity_derate))

        return {
            "equipment_type": "BATTERY_BANK",
            "reported_soc_pct": round(soc, 1),
            "cold_derated_effective_capacity_pct": round(effective_capacity_pct, 1),
            "thermal_derate_loss": round(cold_capacity_derate * 100.0, 1),
            "recommended_actions": (
                ["CRITICAL: Battery bank deep discharge — initiate immediate emergency charging cycle", "Prevent cell polarity reversal under sub-zero ambient load"]
                if soc < 20.0 else
                ["Battery State of Charge below 40% — start secondary generator"]
                if soc < 40.0 else
                ["Battery bank cell voltages balanced", "DC bus float charging nominal"]
            )
        }

equipment_physics = EquipmentPhysicsEngine()

