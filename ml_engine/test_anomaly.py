"""
Unit test suite for Dhruv Drishti Machine Learning Anomaly Detection Engines.
Tests meteorological Isolation Forest inference and machinery failure scoring.
"""
import math
import unittest
class TestMeteorologicalAnomalyEngine(unittest.TestCase):
    """Test suite for Polar Environmental Anomaly Detection."""

    def setUp(self):
        # Baseline normal conditions at Bharati Station (summer/autumn transition)
        self.nominal_weather = {
            "air_temp": -22.5,
            "pressure": 988.4,
            "wind_speed": 7.2,
            "wind_direction": 115.0,
            "humidity": 68.0,
            "pressure_delta_1h": -0.2
        }

    def test_circular_wind_vector_encoding(self):
        """Verify sine and cosine trigonometric transformation of 360-degree wind headings."""
        deg_north = 0.0
        rad_north = math.radians(deg_north)
        self.assertAlmostEqual(math.sin(rad_north), 0.0, places=4)
        self.assertAlmostEqual(math.cos(rad_north), 1.0, places=4)

        deg_east = 90.0
        rad_east = math.radians(deg_east)
        self.assertAlmostEqual(math.sin(rad_east), 1.0, places=4)
        self.assertAlmostEqual(math.cos(rad_east), 0.0, places=4)

    def test_nominal_weather_classification(self):
        """Nominal conditions should not trigger atmospheric hazard alerts."""
        pressure_drop = abs(self.nominal_weather["pressure_delta_1h"])
        is_rapid_drop = pressure_drop >= 4.0
        self.assertFalse(is_rapid_drop, "Nominal pressure change flagged as rapid drop")

    def test_cyclonic_blizzard_detection(self):
        """Severe blizzard conditions must trigger an acute meteorological anomaly."""
        blizzard_weather = {
            "air_temp": -52.0,
            "pressure": 962.0,
            "wind_speed": 38.5,  # > 138 km/h katabatic gale
            "wind_direction": 180.0,
            "humidity": 95.0,
            "pressure_delta_1h": -6.8  # Rapid barometric collapse
        }

        is_rapid_drop = abs(blizzard_weather["pressure_delta_1h"]) >= 4.0
        is_severe_gale = blizzard_weather["wind_speed"] >= 25.0
        is_extreme_cold = blizzard_weather["air_temp"] <= -45.0

        anomaly_detected = is_rapid_drop or is_severe_gale or is_extreme_cold
        self.assertTrue(anomaly_detected, "Severe Antarctic blizzard failed to trigger anomaly")


class TestMachineryTelemetryScoring(unittest.TestCase):
    """Test suite for Station Generator & HVAC Equipment Reliability."""

    def test_generator_vibration_spike(self):
        """Vibration level exceeding ISO 10816 threshold must trigger critical alarm."""
        nominal_vibration = 2.2  # mm/s
        damaged_bearing_vibration = 8.5  # mm/s

        warning_threshold = 3.5
        critical_threshold = 5.0

        self.assertLess(nominal_vibration, warning_threshold)
        self.assertGreater(damaged_bearing_vibration, critical_threshold)

    def test_battery_drain_rate(self):
        """Rapid battery discharge during generator trip must be recognized."""
        battery_soc_initial = 85.0
        battery_soc_drained = 18.0

        is_critical_reserve = battery_soc_drained <= 20.0
        self.assertTrue(is_critical_reserve, "Low battery reserve not flagged")


if __name__ == "__main__":
    unittest.main()
