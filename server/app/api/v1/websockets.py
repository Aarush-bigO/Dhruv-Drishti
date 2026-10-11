from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.ws_manager import manager

router = APIRouter()

@router.websocket("/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # wait for messages (not expected from client, but keep connection open)
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
