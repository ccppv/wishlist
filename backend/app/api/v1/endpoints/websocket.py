"""
WebSocket endpoints - supports both user IDs and share_token channels
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from typing import Dict, List, Optional
from jose import JWTError, jwt
from app.core.config import settings
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
async def websocket_endpoint(
    websocket: WebSocket,
    client_id: str,
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint with JWT authentication.
    - For user_id channels (numeric client_id): JWT token required
    - For share_token channels (client_id starting with 'share_'): token optional
    - Token passed as query parameter: ?token=xxx
    """
    # Check if this is a user channel (numeric ID) or share token channel
    is_user_channel = client_id.isdigit()
    
    # Verify JWT token if provided or required
    authenticated_user_id = None
    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            authenticated_user_id = payload.get("sub")
        except JWTError:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
            return
    
    # For user channels, require authentication and verify user owns the channel
    if is_user_channel:
        if not authenticated_user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication required")
            return
        if str(authenticated_user_id) != client_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized")
            return
    
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
