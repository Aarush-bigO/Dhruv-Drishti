# 🎙️ Dhruv Drishti — Executive Pitch Deck & Judge Guide
### WeMakeDevs × AWS Environmental Hacks (Bharat Builds Tour 2026) | Team: **Dhruv Drishti**

---

## 🧭 Executive Summary

| Category | Detail |
|---|---|
| **Project** | **Dhruv Drishti (ध्रुव दृष्टि)** — Autonomous Polar Digital Twin Platform |
| **Track** | **Track 01: Air & Extreme Climate Resilience** |
| **Target Deployment** | Bharati Station (69°S) & Maitri Station (70°S), Antarctica |
| **Cloud Backbone** | AWS IoT Core, Amazon ECS Fargate, Amazon Aurora, Amazon S3 Glacier |
| **ML Engine** | Dual-Layer Isolation Forest (Meteorological & Mechanical Telemetry) |

---

## 📊 Problem & Environmental Crisis in Antarctica

1. **Extreme Polar Cryosphere**:
   - Sub-zero operational envelope: temperatures plummet below **-55°C** with katabatic wind gusts topping **160 km/h**.
   - Zero physical resupply for **8 consecutive months** during the polar winter.
2. **The Fragile Threshold**:
   - A rapid 5 hPa barometric drop indicates cyclonic blizzard onset within 45 minutes.
   - Bearing vibration exceeding 4.5 mm/s heralds diesel generator seizure within hours.
   - Traditional cloud systems fail when geomagnetic storms disrupt VSAT satellite links.

---

## ⚡ The Solution: Dhruv Drishti

An end-to-end digital twin uniting edge resilience with cloud-scale ML:

```
[Edge: Antarctic Station]                  [Satellite: VSAT]              [AWS Cloud Infrastructure]
Automatic Weather Stations (NPDC)  --->   Intermittent Link   --->   AWS IoT Core (MQTT Ingestion)
Machinery & Power Telemetry        --->   (Store-and-Forward) --->   AWS Lambda (Threshold Logic)
Offline SQLite Queue (Zero Loss)                                 --->   Amazon ECS Fargate (FastAPI)
                                                                 --->   Amazon S3 Glacier (Cold Archive)
                                                                 --->   Amazon SNS (Critical Alarms)
```

---

## 🏆 Key Technical Innovations

### 1. Authentic NPDC Data Pipeline
- Real Automatic Weather Station records directly from NCPOR/NPDC for Bharati and Maitri.
- 4-state data freshness verification (`LIVE <15m`, `DELAYED`, `STALE`, `OFFLINE`).

### 2. Dual-Layer ML Anomaly Detection
- **Layer 1 (Atmosphere)**: Evaluates non-linear polar wind vectors and pressure rate-of-change ($\Delta P/\Delta t$) to classify storm fronts before visual onset.
- **Layer 2 (Machinery)**: Vibration frequency and load curve modeling to forecast bearing and HVAC failures.

### 3. Edge Store-and-Forward Engine
- SQLite edge queue stores sensor packets during geomagnetic satellite blackouts.
- Zero data loss: automatically flushes buffered telemetry upon link restoration.

### 4. Interactive 2D/3D Cockpit
- Real-time 16-sector Wind Rose radar for katabatic wind shear detection.
- Physics-based resupply and what-if blizzard simulation engine.

---

## ☁️ Why AWS?

- **Velocity**: Built and simulated serverless event rules locally using **AWS SAM CLI** and **LocalStack**.
- **Serverless Reliability**: **AWS IoT Core** provides enterprise-grade MQTT connectivity for extreme edge devices.
- **Zero Ops**: **Amazon ECS on Fargate** runs our full-stack container without server provisioning.
- **Cost Efficiency**: Multi-tier **S3 Glacier** archival reduces cold-tier telemetry storage costs by 80%.

---

## 💬 Frequently Asked Questions (Judge Q&A)

**Q: How does the system handle complete satellite dropouts?**  
*A: Our edge engine logs every reading to an ACID-compliant local SQLite queue. When the VSAT link reconnects, packets are streamed to AWS IoT Core with composite unique constraints preventing duplicate records.*

**Q: How is the ML model trained?**  
*A: We trained Isolation Forest models on historical Antarctic AWS meteorological observations, using circular sine/cosine wind encodings and 1-hour barometric delta metrics.*

---

<p align="center">
  <b>Team Dhruv Drishti</b> | <i>Built with ❤️ on AWS for Environmental Hacks 2026</i>
</p>
