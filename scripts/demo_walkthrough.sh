#!/usr/bin/env bash
# ==============================================================================
# Dhruv Drishti (ध्रुव दृष्टि) — Interactive Demo Walkthrough
# Built for WeMakeDevs x AWS Environmental Hacks 2026
# ==============================================================================

set -e

GREEN='\033[032m'
BLUE='\033[034m'
YELLOW='\033[1;33m'
RED='\033[031m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}  ❄️ Dhruv Drishti — Extreme Climate Digital Twin Demo Walkthrough${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo ""

echo -e "${YELLOW}[1/4] Checking environment prerequisites...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is required but not installed. Aborting.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python 3 environment verified.${NC}"
echo ""

echo -e "${YELLOW}[2/4] Verifying station telemetry simulation components...${NC}"
if [ -f "./simulator/scenario_triggers.py" ]; then
    echo -e "${GREEN}✓ Fault injection CLI ready: ./simulator/scenario_triggers.py${NC}"
else
    echo -e "${RED}Simulator scripts not found in current directory.${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}[3/4] Interactive Scenario Triggers:${NC}"
echo "  1) Baseline Normal Operations (Maitri & Bharati nominal)"
echo "  2) Inject Antarctic Blizzard at Maitri (Temp: -52°C, Vib: 5.8 mm/s)"
echo "  3) Trigger Critical Generator Failure at Bharati (RPM: 1500 -> 250)"
echo "  4) Trigger Fuel Leak Emergency at Maitri (1800 -> 400L)"
echo "  5) Full System Reset to Baseline"
echo "  6) Exit"
echo ""

read -p "Select a scenario to trigger [1-6]: " choice

case $choice in
    1)
        echo -e "${GREEN}Setting nominal telemetry baselines...${NC}"
        python3 ./simulator/scenario_triggers.py reset ALL || true
        ;;
    2)
        echo -e "${RED}Injecting severe cyclonic blizzard at Maitri Station...${NC}"
        python3 ./simulator/scenario_triggers.py blizzard MAITRI || true
        ;;
    3)
        echo -e "${RED}Collapsing Bharati main generator load...${NC}"
        python3 ./simulator/scenario_triggers.py gen_failure BHARATI || true
        ;;
    4)
        echo -e "${RED}Triggering rapid fuel depletion at Maitri...${NC}"
        python3 ./simulator/scenario_triggers.py fuel_low MAITRI || true
        ;;
    5)
        echo -e "${GREEN}Restoring all telemetry channels to nominal...${NC}"
        python3 ./simulator/scenario_triggers.py reset ALL || true
        ;;
    6)
        echo "Exiting demo."
        exit 0
        ;;
    *)
        echo "Invalid selection. Exiting."
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}✓ Scenario command dispatched! View real-time twin at http://localhost:5173${NC}"
echo -e "${BLUE}======================================================================${NC}"
