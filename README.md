# ❄️ Dhruv Drishti (ध्रुव दृष्टि)
## Autonomous Extreme Climate Digital Twin & Polar Life-Support Intelligence Platform
### Built for **WeMakeDevs × AWS Environmental Hacks** (Bharat Builds Tour 2026) | Team: **Dhruv Drishti**

[![AWS Hackathon](https://img.shields.io/badge/AWS%20Hackathon-Environmental%20Hacks-FF9900?logo=amazon-aws&logoColor=white)](https://wemadevs.org/aws/env)
[![Team](https://img.shields.io/badge/Team-Dhruv%20Drishti-232F3E?logo=github)](https://github.com/Aarush-bigO)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org)
[![Three.js](https://img.shields.io/badge/Three.js-3D%20Digital%20Twin-black?logo=three.js)](https://threejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2F%20Aurora-336791?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 🌍 Executive Summary & Problem Statement

Antarctica's extreme cryosphere drives Earth's climate balance, jet streams, and deep-ocean circulation. In this hyper-fragile wilderness, India maintains two vital scientific outposts:
- **Bharati Station** (69°24′S, 76°11′E — Larsemann Hills)
- **Maitri Station** (70°46′S, 11°44′E — Schirmacher Oasis)

Operating in temperatures plunging below **-55°C**, hurricane-force katabatic winds exceeding **160 km/h**, and complete seasonal isolation with **zero resupply for up to 8 months**, environmental anomalies and life-support equipment failures are existential threats.

### The Environmental & Operational Challenge
1. **Extreme Weather Shocks**: Severe cyclonic blizzards and rapid barometric pressure drops trigger instantaneous freeze-up of critical station systems.
2. **Isolated Critical Infrastructure**: Heating, micro-hydro water reclamation, battery storage, and diesel generation operate at their physical limits. Unnoticed mechanical drift leads to catastrophic failure.
3. **High-Latency, Intermittent Satellite Connectivity (VSAT)**: Traditional cloud-only monitoring fails when geomagnetic storms sever communications. Telemetry must survive edge disconnections without data loss.
4. **Disjointed Environmental Intelligence**: Station telemetry and meteorological data are siloed, preventing unified situational awareness.

### The Solution: Dhruv Drishti
**Dhruv Drishti (ध्रुव दृष्टि — "Polar Vision")** is an **autonomous environmental digital twin and predictive life-support intelligence platform**. It ingests authentic **National Polar Data Center (NPDC) Automatic Weather Station (AWS)** observations alongside real-time station mechanical telemetry, using **dual-layer Isolation Forest ML models** to detect atmospheric hazards and equipment wear, visualized through a modern, cybernetic mission-control cockpit.

---

## 📸 Platform Visual Showcase

### 1. Polar Mission Control & Interactive Antarctic Satellite Overview
> High-resolution orthographic projection displaying real-time weather stations, active marine supply vessel tracking (*RV Saraswati*), and live satellite communication telemetry.
![Polar Mission Control Landing Page](./docs/screenshots/landingPage.png)

---

### 2. Live 2D/3D Cybernetic Digital Twin & NPDC AWS Weather Deck
> Real-time sensor monitoring across 9 mechanical channels, live 16-sector Wind Rose radar, 24h barometric & temperature trends, and 4-state data freshness verification.
![Digital Twin Dashboard](./docs/screenshots/dashboard.png)

---

### 3. Dual-Layer ML Anomaly Detection & Fault Injection Diagnostics
> Continuous Isolation Forest scoring classifying meteorological anomalies (rapid pressure drops, sensor freezes) and mechanical failure risks with automated alert triaging.
![Fault Injection & ML Diagnostics](./docs/screenshots/faultInjection.png)

---

### 4. Physics-Based What-If & Resupply Simulation Engine
> Interactive scenario planning tool enabling NCPOR mission controllers to model severe blizzard impacts, fuel depletion curves, and emergency resupply logistics.
![What-If Simulation Engine](./docs/screenshots/whatIf.png)

---

## ⚡ Key Features & Technical Innovations

### 1. Authentic NPDC AWS Weather Pipeline & Data Freshness Machine
- **Real Antarctic Observations**: Direct integration of real meteorological observation records for Bharati & Maitri (Air Temperature, Pressure, Wind Speed/Direction, Relative Humidity).
- **Composite Unique Ingestion Engine**: Deduplication via `(station_id + source + observed_at)` with SHA256 integrity verification.
- **4-State Freshness Machine**: Dynamically grades data freshness into `LIVE (<15m)`, `DELAYED (15–45m)`, `STALE (>45m)`, or `OFFLINE (≥3 failures)`.
- **Watermark Synchronizer**: Zero fake-point synthesis; true time-series watermarking with real-time WebSocket broadcasting.

### 2. Dual-Layer Machine Learning Anomaly Intelligence
- **Layer 1: Environmental / Meteorological Anomaly Engine (Isolation Forest)**:
  - Trained on authentic polar weather patterns.
  - Feature engineering: Sine/cosine encoding of 360° circular wind vectors, 1-hour pressure deltas ($\Delta P/\Delta t$), and cyclical seasonal patterns.
  - Detects `RAPID_PRESSURE_DROP`, `HIGH_WIND_EVENT`, `EXTREME_COLD_EVENT`, and `SENSOR_FREEZE`.
- **Layer 2: Station Life-Support & Machinery Anomaly Engine**:
  - Dynamically scores multi-variate telemetry streams (Generator RPM, bearing vibration, HVAC pressure, fuel flow rate, battery SOC).
  - Preemptively flags mechanical degradation before catastrophic bearing seizure.

### 3. Resilient Edge Store-and-Forward (Survives VSAT Outages)
- Embedded SQLite edge queue buffers all telemetry packets during satellite blackouts.
- Automatic flushing with backpressure management upon VSAT reconnection, ensuring 100% data fidelity.

### 4. Historical Cyclone Playback & Fault Injection CLI
- Built-in simulation tool to replay historical Antarctic cyclonic events at `1x`, `5x`, `10x`, and `20x` speed.
- Interactive CLI for live stress-testing: trigger blizzards, generator dropouts, fuel line breaches, or HVAC depressurization on demand.

### 5. Polar 16-Sector Wind Rose & Katabatic Radar
- Polar coordinate wind velocity and direction radar matching NCPOR scientific station specifications.
- Instantaneous visual classification of hazardous katabatic wind shears descending from the polar ice cap.

---

## ☁️ AWS Cloud-Native Architecture

Dhruv Drishti is designed to scale on **Amazon Web Services (AWS)** using modern serverless, containerized, and ML primitives:

```
                          ANTARCTICA (EDGE)                                                    AWS CLOUD INFRASTRUCTURE
   +--------------------------------------------------------+                 +-------------------------------------------------------------+
   |   Bharati Station & Maitri Station                     |                 |                                                             |
   |                                                        |                 |                 +-----------------------+                   |
   |   [NPDC Automatic Weather Stations]                    |   VSAT Link     |                 |     AWS IoT Core      |                   |
   |   - Barometric Pressure, Temp, Wind Velocity           | ------------->  |                 | (MQTT Telemetry Broker|                   |
   |                                                        |   (Satellite)   |                 +-----------+-----------+                   |
   |   [Life Support & Machinery IoT Sensors]               |                 |                             |                               |
   |   - Generators, Batteries, Fuel Reserves, HVAC         |                 |                             v                               |
   |                                                        |                 |                 +-----------------------+                   |
   |   [Edge Store-and-Forward Engine]                      |                 |                 |   Amazon EventBridge  |                   |
   |   - SQLite local buffer survives satellite blackouts   |                 |                 +-----+-----------+-----+                   |
   +--------------------------------------------------------+                 |                       |           |                         |
                                                                              |       +---------------+           +---------------+         |
                                                                              |       v                                           v         |
                                                                              | +-------------------+                   +-----------------+ |
                                                                              | |  Amazon ECS / Fargate                 | AWS Lambda      | |
                                                                              | |  (FastAPI Backend)|                   | (Alert Triggers)| |
                                                                              | +---------+---------+                   +--------+--------+ |
                                                                              |           |                                      |          |
                                                                              |           v                                      v          |
                                                                              | +-------------------+                   +-----------------+ |
                                                                              | | Amazon Aurora     |                   | Amazon SNS      | |
                                                                              | | PostgreSQL        |                   | (SMS/Email Ops) | |
                                                                              | +---------+---------+                   +-----------------+ |
                                                                              |           |                                                 |
                                                                              |           v                                                 |
                                                                              | +-------------------+       +-----------------------------+ |
                                                                              | | Amazon S3 Archive | <---> | Amazon SageMaker AI         | |
                                                                              | | (Raw NPDC Blobs)  |       | (Isolation Forest Training) | |
                                                                              | +-------------------+       +-----------------------------+ |
                                                                              |                                                             |
                                                                              |   +-----------------------------------------------------+   |
                                                                              |   | CloudFront + Amplify Hosting                        |   |
                                                                              |   | (React 18 + Three.js Mission Control Cockpit)       |   |
                                                                              |   +-----------------------------------------------------+   |
                                                                              +-------------------------------------------------------------+
```

### AWS Services Utilized / Architected:
| AWS Service | Function in Dhruv Drishti |
|---|---|
| **AWS IoT Core** | Secure ingestion of high-frequency station sensor packets over satellite MQTT. |
| **Amazon ECS / Fargate** | Highly scalable, containerized execution of the FastAPI async backend and ingestion workers. |
| **Amazon Aurora PostgreSQL** | High-performance multi-AZ relational database storing normalized telemetry and weather time series. |
| **Amazon SageMaker AI** | Distributed training and deployment endpoint for dual-layer Isolation Forest anomaly detection. |
| **Amazon S3** | Durable cold-tier archival of raw NPDC meteorological observations with SHA256 verification. |
| **AWS Lambda & EventBridge** | Event-driven microservices for immediate alert generation and webhook dispatch. |
| **Amazon CloudWatch** | System telemetry, API latency monitoring, and automated operational health dashboards. |
| **AWS Amplify / CloudFront** | Low-latency global CDN distribution for the React 18 / Three.js digital twin dashboard. |

---

## 🛠️ Tech Stack & Libraries

| Tier | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Three.js, React-Leaflet, Lucide Icons, Recharts, TailwindCSS, Framer Motion |
| **Backend & APIs** | FastAPI, Python 3.11, Uvicorn, AsyncIO, WebSocket Protocol, Pydantic v2 |
| **Database & ORM** | PostgreSQL 16 / Amazon Aurora, SQLAlchemy 2.0 (Async), SQLite3 (Edge Queue) |
| **Machine Learning** | Scikit-Learn, Isolation Forest, NumPy, Pandas, Joblib |
| **DevOps & Containers** | Docker, Docker Compose, Nginx, Git |

---

## 📂 Project Structure

```
Dhruv-Drishti/
├── client/                     # React 18 + Three.js + Vite Mission Control
│   ├── src/
│   │   ├── components/         # StationCard, AlertPanel, WeatherCards, WindRoseRadar
│   │   ├── hooks/              # useWebSocket, useTelemetry, useWeather
│   │   ├── pages/              # Overview, StationTwin, WhatIfSimulation, Logistics
│   │   └── utils/              # Polar coordinate math, formatters
│   ├── public/                 # Static assets & Antarctic orthographic maps
│   └── package.json
│
├── server/                     # FastAPI Real-time Async Server
│   ├── app/
│   │   ├── api/v1/             # REST endpoints (telemetry, weather, alerts, replay)
│   │   ├── models/             # SQLAlchemy ORM (weather, raw_archive, alerts)
│   │   ├── services/           # Freshness state machine, quality checker, anomaly scorer
│   │   └── workers/            # NPDC poller worker, cyclone replay scheduler
│   ├── main.py                 # FastAPI application & WebSocket router
│   ├── requirements.txt
│   └── Dockerfile
│
├── simulator/                  # Edge Simulator & Telemetry Engine
│   ├── telemetry_generator.py  # Continuous sensor streaming (2s cadence)
│   ├── scenario_triggers.py    # Fault injection CLI (blizzards, failures)
│   └── offline_queue.db        # Auto-provisioned SQLite store-and-forward queue
│
├── ml_engine/                  # Dual-Layer Anomaly Detection Engines
│   ├── anomaly_detector.py     # Machinery degradation model
│   ├── models/                 # Pretrained scikit-learn models
│   └── requirements.txt
│
├── data/                       # Seeded Authentic NPDC Observations
│   ├── raw/npdc/bharati/       # Real AWS observations from Bharati Station
│   └── processed/              # Normalized weather sets
│
├── docs/screenshots/           # UI screenshots for platform evaluation
└── docker-compose.yml          # One-command orchestration file
```

---

## 🚀 Quick Start Guide

### Option 1: One-Command Docker Launch (Recommended)

Clone the repository and run:

```bash
docker compose up --build
```

Access the interfaces once loaded:
- 🖥️ **Mission Control Dashboard**: [http://localhost:5173](http://localhost:5173)
- 📖 **Interactive Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- 🔌 **Raw API Endpoint**: [http://localhost:8000](http://localhost:8000)
- 🐘 **PostgreSQL Port**: `localhost:5432`

---

### Option 2: Local Development (3 Terminals)

#### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- PostgreSQL 16 (or spin up container: `docker run -d -e POSTGRES_DB=polar_twin -e POSTGRES_USER=polar -e POSTGRES_PASSWORD=polar_secret -p 5432:5432 postgres:16-alpine`)

#### Terminal 1 — Backend (FastAPI)
```bash
cd server
pip install -r requirements.txt
DATABASE_URL=postgresql+asyncpg://polar:polar_secret@localhost:5432/polar_twin python -m uvicorn main:app --reload --port 8000
```

#### Terminal 2 — Frontend (React 18 + Vite)
```bash
cd client
npm install
npm run dev
# Dashboard live at http://localhost:5173
```

#### Terminal 3 — Edge Simulator & Telemetry Streamer
```bash
cd simulator
pip install requests
python telemetry_generator.py
# Streams telemetry every 2 seconds to the backend
```

---

## 🧪 Interactive Fault Injection & Live Demo Script

Demonstrate platform resilience in under 3 minutes using the fault injection CLI:

### 1. View Normal Baseline
Open [http://localhost:5173](http://localhost:5173). Notice nominal telemetry:
- Generator RPM ~1490–1500 RPM
- Outdoor Temperature: -35°C to -40°C
- Vibration: 2.1–2.4 mm/s
- All system status indicators are green (`NOMINAL`).

### 2. Inject Antarctic Blizzard at Maitri
```bash
cd simulator
python scenario_triggers.py blizzard MAITRI
```
> **Observed Behavior**: Outdoor temperature collapses to **-52°C**, wind loads push generator vibration to **5.8 mm/s**, fuel burn accelerates 2x, and `HIGH_WIND_EVENT` alert fires instantly.

### 3. Trigger Critical Generator Failure at Bharati
```bash
python scenario_triggers.py gen_failure BHARATI
```
> **Observed Behavior**: Generator RPM collapses from **1500 → 250 RPM**, vibration spikes to **8.5 mm/s**, battery SOC begins rapid emergency drain, triggering a high-priority `CRITICAL_FAILURE` alert.

### 4. Trigger Fuel Leak Emergency
```bash
python scenario_triggers.py fuel_low MAITRI
```
> **Observed Behavior**: Tank volume falls precipitously (**1800 → 900 → 400L**). The digital twin displays emergency red reserve warnings.

### 5. Trigger HVAC De-pressurization
```bash
python scenario_triggers.py hvac_fault BHARATI
```
> **Observed Behavior**: HVAC pressure drops from **1.02 bar → 0.25 bar**. Habitat indoor temperature slides rapidly from **21°C → 14°C**.

### 6. Full System Recovery
```bash
python scenario_triggers.py reset ALL
```
> **Observed Behavior**: All sensor metrics stabilize to nominal baselines; alarms automatically clear.

---

## 📡 Core API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/telemetry/ingest` | `POST` | Ingest real-time telemetry from edge stations |
| `/api/v1/telemetry/latest` | `GET` | Fetch latest telemetry readings across all stations |
| `/api/v1/telemetry/history` | `GET` | Query historical time series with range filtering |
| `/api/v1/weather/latest/{station_id}` | `GET` | Get authentic NPDC AWS weather readings & freshness |
| `/api/v1/weather/history/{station_id}` | `GET` | 24-hour meteorological trends for charts & radar |
| `/api/v1/weather/anomalies/{station_id}`| `GET` | Retrieve logged meteorological anomalies |
| `/api/v1/weather/replay` | `POST` | Control historical storm playback speed (1x to 20x) |
| `/api/v1/alerts` | `GET` | Retrieve active system & environmental alerts |
| `/api/v1/alerts/{id}/ack` | `PUT` | Acknowledge active alert |
| `/ws/live` | `WS` | Real-time WebSocket feed for live twin visualization |
| `/docs` | `GET` | Interactive Swagger UI API documentation |


