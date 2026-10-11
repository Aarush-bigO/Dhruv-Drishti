from fastapi import APIRouter
from app.services.simulation_engine import simulation_engine

router = APIRouter()

@router.post("/whatif")
async def run_whatif(payload: dict):
    result = simulation_engine.run_whatif(payload)
    return result
