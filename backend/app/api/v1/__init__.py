"""
API v1 router
"""
from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, websocket, wishlists, friendships, items

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(wishlists.router, prefix="/wishlists", tags=["wishlists"])
api_router.include_router(friendships.router, prefix="/friendships", tags=["friendships"])
api_router.include_router(items.router, prefix="/items", tags=["items"])
api_router.include_router(websocket.router, prefix="/ws", tags=["websocket"])

