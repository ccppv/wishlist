"""
Guest session schemas
"""
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional


class GuestSessionCreate(BaseModel):
    """Guest session create schema"""
    display_name: Optional[str] = Field(None, max_length=100)


class GuestSessionInDB(BaseModel):
    """Guest session in database schema"""
    id: int
    session_token: str
    display_name: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class GuestSession(GuestSessionInDB):
    """Guest session response schema"""
    pass
