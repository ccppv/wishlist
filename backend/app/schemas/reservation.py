"""
Reservation schemas
"""
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.reservation import ReservationStatusEnum


class ReservationCreate(BaseModel):
    """Reservation create schema"""
    item_id: int


class ReservationUpdate(BaseModel):
    """Reservation update schema"""
    status: ReservationStatusEnum


class ReservationInDB(BaseModel):
    """Reservation in database schema"""
    id: int
    item_id: int
    user_id: Optional[int] = None
    guest_session_id: Optional[int] = None
    status: ReservationStatusEnum
    reserved_at: datetime
    cancelled_at: Optional[datetime] = None
    purchased_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class Reservation(ReservationInDB):
    """Reservation response schema"""
    pass
