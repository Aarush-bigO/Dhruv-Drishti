# 📡 Dhruv Drishti — MQTT Topic Architecture & QoS Specification
### Edge-to-Cloud IoT Routing for Antarctica Ground Stations

---

## 1. Topic Hierarchy Design

Dhruv Drishti follows an enterprise topic tree optimized for AWS IoT Core rules and EventBridge routing:

```
polar/
├── stations/
│   ├── {station_id}/
│   │   ├── telemetry        # 2-second machinery readings (QoS 0 / QoS 1)
│   │   ├── weather          # 10-minute NPDC observations (QoS 1)
│   │   └── heartbeat        # 30-second edge liveness beacon (QoS 0)
│   └── alerts/
│       ├── {station_id}/
│       │   └── critical     # P0 Emergency alarms (QoS 2, Retained)
```

---

## 2. Topic Definitions & QoS Levels

| Topic Pattern | Direction | QoS | Description |
|---|---|---|---|
| `polar/stations/+/telemetry` | Edge → AWS | 1 | Real-time generator RPM, vibration, fuel, HVAC |
| `polar/stations/+/weather` | Edge → AWS | 1 | Authentic NPDC Automatic Weather Station observations |
| `polar/stations/+/heartbeat` | Edge → AWS | 0 | Sub-minute gateway health and VSAT latency |
| `polar/alerts/+/critical` | AWS ↔ Edge | 2 | Emergency blizzard or life-support failure triggers |

---

## 3. AWS IoT Core Rule SQL Example

```sql
SELECT 
    station_id,
    timestamp,
    outdoor_temp,
    generator_rpm,
    vibration_level,
    fuel_level_liters
FROM 'polar/stations/+/telemetry'
WHERE vibration_level > 3.5 OR fuel_level_liters < 2000
```
This rule triggers an instantaneous AWS Lambda anomaly handler and SNS SMS alert.
