from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import init_db
from app.api.v1 import stations, telemetry, simulation, websockets, weather, auth
from app.models import telemetry as tel_model, inventory as inv_model, weather as weather_model

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # seed inventory if empty
    yield

app = FastAPI(title=settings.APP_NAME, version=settings.VERSION, lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(stations.router, prefix="/api/v1/stations", tags=["stations"])
app.include_router(telemetry.router, prefix="/api/v1/telemetry", tags=["telemetry"])
app.include_router(simulation.router, prefix="/api/v1/simulation", tags=["simulation"])
app.include_router(weather.router, prefix="/api/v1/weather", tags=["weather"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(websockets.router, prefix="/ws", tags=["websocket"])

@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.VERSION}
