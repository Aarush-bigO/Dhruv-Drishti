# 📖 Dhruv Drishti — REST & WebSocket API Specification

The Dhruv Drishti core platform exposes REST endpoints and real-time WebSocket channels documented via interactive Swagger UI at `/docs`.

---

## 1. Authentication & Protocols
- **Protocols**: HTTP/2, WebSocket (RFC 6455)
- **Content Type**: `application/json`
- **CORS Support**: Configured for local development and production cloud dashboards.

---

## 2. Telemetry Endpoints

### `POST /api/v1/telemetry/ingest`
Ingests a single multi-variate telemetry reading from an Antarctic edge station.

**Request Payload:**
```json
{
  "station_id": "BHARATI",
  "outdoor_temp": -34.5,
  "indoor_temp": 21.2,
  "generator_rpm": 1498.0,
  "fuel_level_liters": 14200.0,
  "vibration_level": 2.24,
  "hvac_pressure": 1.02,
  "water_temp": 18.5,
  "battery_soc": 78.4,
  "solar_output_kw": 0.0
}
```

**Response (`201 Created`):**
```json
{
  "status": "ingested",
  "anomaly_score": 0.12,
  "threat_level": "NOMINAL",
  "record_id": "bht-20261011-0091"
}
```

---

### `GET /api/v1/telemetry/latest`
Retrieves the most recent telemetry readings across all monitored research stations.

---

### `GET /api/v1/telemetry/history`
Query time-series telemetry with time range filters:
- `station_id`: `BHARATI` | `MAITRI`
- `start_time`: ISO 8601 string
- `end_time`: ISO 8601 string
- `limit`: Default `100`, max `1000`

---

## 3. Real-Time WebSocket Streaming

### `WS /ws/live`
Sub-second real-time broadcast of all station telemetry and active meteorological threat indices directly to connected mission-control cockpits.
