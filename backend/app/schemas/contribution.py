"""
Contribution schemas
"""
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional
from decimal import Decimal


class ContributionCreate(BaseModel):
    """Contribution create schema"""
    item_id: int
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="USD", max_length=3)
    message: Optional[str] = Field(None, max_length=500)


class ContributionInDB(BaseModel):
    """Contribution in database schema"""
    id: int
    item_id: int
    user_id: Optional[int] = None
    guest_session_id: Optional[int] = None
    amount: Decimal
    currency: str
    message: Optional[str] = None
    contributed_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class Contribution(ContributionInDB):
    """Contribution response schema"""
    pass


class ContributionStats(BaseModel):
    """Contribution statistics for an item"""
    total_amount: Decimal
    contributors_count: int
    progress_percentage: Optional[float] = None
