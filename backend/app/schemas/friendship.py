"""
Friendship schemas
"""
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.friendship import FriendshipStatusEnum
from app.schemas.user import UserPublic


class FriendshipCreate(BaseModel):
    """Friendship create schema"""
    friend_id: int


class FriendshipUpdate(BaseModel):
    """Friendship update schema"""
    status: FriendshipStatusEnum


class FriendshipInDB(BaseModel):
    """Friendship in database schema"""
    id: int
    user_id: int
    friend_id: int
    status: FriendshipStatusEnum
    requested_at: datetime
    accepted_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class Friendship(FriendshipInDB):
    """Friendship response schema"""
    pass


class FriendshipWithUser(BaseModel):
    """Friendship with user info"""
    id: int
    status: FriendshipStatusEnum
    friend: UserPublic
    requested_at: datetime
    accepted_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)
