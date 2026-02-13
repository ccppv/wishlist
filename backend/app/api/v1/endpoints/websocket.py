"""
WebSocket endpoints - supports both user IDs and share_token channels
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

router = APIRouter()


class ConnectionManager:
    """WebSocket connection manager with dead connection cleanup"""

    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        if client_id not in self.active_connections:
            self.active_connections[client_id] = []
        self.active_connections[client_id].append(websocket)

    def disconnect(self, websocket: WebSocket, client_id: str):
        if client_id in self.active_connections:
            try:
                self.active_connections[client_id].remove(websocket)
            except ValueError:
                pass
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]

    async def send_personal_message(self, message: str, client_id: str):
        """Send message to specific client, cleaning up dead connections"""
        if client_id not in self.active_connections:
            return
        dead = []
        for conn in self.active_connections[client_id]:
            try:
                await conn.send_text(message)
            except Exception:
                dead.append(conn)
        for conn in dead:
            try:
                self.active_connections[client_id].remove(conn)
            except ValueError:
                pass
        if client_id in self.active_connections and not self.active_connections[client_id]:
            del self.active_connections[client_id]


manager = ConnectionManager()


@router.websocket("/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    WebSocket endpoint.
    client_id can be a user ID (e.g. "4") or a share token channel (e.g. "share_abc123")
    """
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo/ping support
            try:
                parsed = json.loads(data)
                if parsed.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                    continue
            except (json.JSONDecodeError, AttributeError):
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)
