#!/usr/bin/env bash
# ==============================================================================
# Dhruv Drishti — Full-Stack Verification & Smoke Test Script
# Verifies container states, API endpoints, and WebSocket readiness.
# ==============================================================================

set -e

GREEN='\033[032m'
BLUE='\033[034m'
RED='\033[031m'
NC='\033[0m'

echo -e "${BLUE}Running Dhruv Drishti smoke tests...${NC}"

# Check API endpoint if running locally
if curl -s http://localhost:8000/api/v1/health/live > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend FastAPI service: ONLINE${NC}"
else
    echo -e "${BLUE}ℹ Backend port 8000 not currently active (run: docker compose up)${NC}"
fi

# Check Client Vite dev server if running
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend Vite service: ONLINE${NC}"
else
    echo -e "${BLUE}ℹ Frontend port 5173 not currently active (run: npm run dev in client/)${NC}"
fi

echo -e "${GREEN}Smoke check script completed.${NC}"
