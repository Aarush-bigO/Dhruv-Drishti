# 🏗️ Dhruv Drishti — Deep System Architecture Specification
### Cloud-Native Polar Digital Twin & Life-Support Intelligence Architecture

---

## 1. High-Level Edge-to-Cloud Topology

```mermaid
graph TD
    subgraph "Antarctica (Edge Ground Stations)"
        AWS_Sensors["NPDC Automatic Weather Stations<br/>(Air Temp, Pressure, Wind Vectors)"]
        Machinery_Sensors["Station Life-Support Sensors<br/>(Generators, HVAC, Fuel, Battery)"]
        EdgeQueue["SQLite Store-and-Forward Queue<br/>(ACID Buffered Storage)"]
        
        AWS_Sensors --> EdgeQueue
        Machinery_Sensors --> EdgeQueue
    end

    subgraph "Satellite Link"
        VSAT["VSAT Satellite Communications<br/>(Intermittent Link)"]
        EdgeQueue -->|Sync on Reconnect| VSAT
    end

    subgraph "Amazon Web Services (Cloud Backbone)"
        IoTCore["AWS IoT Core<br/>(MQTT Broker & Rules Engine)"]
        EventBridge["Amazon EventBridge<br/>(Event Dispatcher)"]
        Lambda["AWS Lambda<br/>(Threshold & Rule Processing)"]
        ECSFargate["Amazon ECS Fargate<br/>(FastAPI Backend & WS Streamer)"]
        Aurora["Amazon Aurora PostgreSQL<br/>(Time-Series Telemetry DB)"]
        S3Glacier["Amazon S3 Glacier<br/>(NPDC Cold Archival)"]
        SNS["Amazon SNS<br/>(SMS / Email Operations Alerts)"]
        
        VSAT --> IoTCore
        IoTCore --> EventBridge
        IoTCore --> S3Glacier
        EventBridge --> Lambda
        EventBridge --> ECSFargate
        Lambda --> SNS
        ECSFargate --> Aurora
    end

    subgraph "Mission Control Cockpit"
        Dashboard["React 18 + Three.js Mission Control<br/>(Wind Rose Radar & 2D/3D Digital Twin)"]
        ECSFargate -->|WebSocket Live Feed| Dashboard
    end
```

---

## 2. Satellite Blackout & Store-and-Forward Sequence

During geomagnetic solar storms or severe blizzard whiteouts, the station VSAT satellite link experiences intermittent dropouts. Dhruv Drishti guarantees zero telemetry loss via local ACID store-and-forward:

```mermaid
sequenceDiagram
    autonumber
    participant StationSensors as Station Edge Sensors
    participant EdgeQueue as SQLite Local Queue
    participant LinkMonitor as VSAT Health Monitor
    participant AWSIoT as AWS IoT Core
    participant Backend as ECS Fargate (FastAPI)

    StationSensors->>EdgeQueue: Emit sensor telemetry packet
    LinkMonitor->>AWSIoT: Healthcheck Ping
    alt VSAT Link Active (Normal Mode)
        LinkMonitor-->>EdgeQueue: Link status: ONLINE
        EdgeQueue->>AWSIoT: Flush telemetry batch (MQTT)
        AWSIoT->>Backend: Route packet via IoT Core Rule
    else Geomagnetic Storm (VSAT Dropout)
        LinkMonitor-->>EdgeQueue: Link status: OFFLINE
        Note over EdgeQueue: Buffer records locally.<br/>Prioritize P0 (Life-Support) & P1 (Meteorology).
    end

    Note over LinkMonitor,AWSIoT: VSAT Satellite Connection Restored
    LinkMonitor-->>EdgeQueue: Link status: ONLINE (Stabilized 15s)
    EdgeQueue->>AWSIoT: Stream buffered packets with Watermark
    AWSIoT->>Backend: Ingest & deduplicate (station_id + source + observed_at)
```

---

## 3. Dual-Layer Isolation Forest Anomaly Pipeline

Dhruv Drishti isolates environmental shocks from mechanical failures through dual independent machine learning inference pipelines:

1. **Layer 1: Environmental / Atmospheric Anomaly Detector**:
   - **Inputs**: Barometric pressure ($P$), 1-hour pressure rate-of-change ($\Delta P / \Delta t$), ambient temperature ($T$), circular wind vector $(\sin \theta, \cos \theta)$, wind velocity ($V$), relative humidity ($RH$).
   - **Classifications**: `RAPID_PRESSURE_DROP`, `HIGH_WIND_EVENT`, `EXTREME_COLD_EVENT`, `SENSOR_FREEZE`.
   - **Objective**: Forecast blizzard impact 45 minutes prior to visual onset.

2. **Layer 2: Machinery Life-Support Anomaly Detector**:
   - **Inputs**: Generator shaft RPM, bearing vibration ($mm/s$), HVAC refrigerant line pressure ($bar$), fuel flow rate ($L/h$), battery state-of-charge ($SOC\%$).
   - **Classifications**: `BEARING_DEGRADATION`, `GENERATOR_COLLAPSE`, `FUEL_LEAK`, `HVAC_DEPRESSURIZATION`.
   - **Objective**: Preempt critical mechanical failure before life-support systems fail.

---

<p align="center">
  <b>Dhruv Drishti System Architecture</b> | <i>Built for AWS Environmental Hacks 2026</i>
</p>
