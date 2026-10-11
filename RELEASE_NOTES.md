# 🚀 Dhruv Drishti — Release v1.0.0-rc1

### **Autonomous Extreme Climate Digital Twin & Polar Life-Support Platform**
**Release Date**: October 11, 2026  
**Built for**: WeMakeDevs × AWS Environmental Hacks (Bharat Builds Tour 2026)  
**Team**: Dhruv Drishti  

---

## 🌟 What's New in v1.0.0

This initial production candidate marks the completion of the full-stack edge-to-cloud digital twin platform designed specifically for India's Antarctic research stations (**Bharati** and **Maitri**).

### 1. Authentic NPDC AWS Meteorological Pipeline
- **Real Antarctic Observations**: Direct ingestion of authentic 2026 meteorological records from the National Polar Data Center (NPDC / NCPOR).
- **Composite Unique Watermarking**: Zero duplicate row insertion via `(station_id + source + observed_at)` composite keys with SHA256 integrity validation.
- **4-State Data Freshness Machine**: Real-time classification into `LIVE (<15m)`, `DELAYED (15–45m)`, `STALE (>45m)`, and `OFFLINE (≥3 failures)`.

### 2. Dual-Layer Machine Learning Anomaly Detection
- **Layer 1 (Atmosphere)**: Isolation Forest model with circular trigonometric $(\sin \theta, \cos \theta)$ wind vector encoding and 1-hour barometric pressure velocity ($\Delta P/\Delta t$). Accurately flags `RAPID_PRESSURE_DROP`, `HIGH_WIND_EVENT`, `EXTREME_COLD_EVENT`, and `SENSOR_FREEZE`.
- **Layer 2 (Machinery)**: Multi-variate mechanical degradation model forecasting generator bearing wear, fuel leaks, and HVAC depressurization.

### 3. Edge-to-Cloud Resilience
- **Store-and-Forward Engine**: SQLite edge queue buffering all telemetry packets during satellite VSAT blackouts, flushing on reconnection with automatic backpressure throttling.
- **AWS Cloud-Native Ready**: Full AWS SAM template (`deploy/template.yaml`) for AWS IoT Core rules, Amazon ECS Fargate containerization, AWS Lambda triggers, and S3 Glacier multi-tier archival.

### 4. Interactive Mission Control Cockpit
- **Polar 16-Sector Wind Rose Radar**: Real-time polar coordinate wind speed and heading radar matching scientific research standards.
- **Cybernetic 2D/3D Digital Twin**: Live spatial monitoring of all 9 mechanical life-support channels with sub-second WebSocket updates.
- **Fault Injection & Cyclone Replay**: CLI-driven simulation tools allowing mission operators to test extreme blizzards and equipment failures on demand.

### 5. Automated CI/CD & Testing
- Full GitHub Actions workflow (`.github/workflows/ci.yml`) validating Python 3.11 backend syntax, automated ML unit tests (`ml_engine/test_anomaly.py`), and Vite production bundle generation.

---

<p align="center">
  <b>Team Dhruv Drishti</b> | <i>Built with ❤️ on AWS for Environmental Hacks 2026</i>
</p>
