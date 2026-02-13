"""
Wishlist schemas
"""
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime, date
from typing import Optional, List
from app.models.wishlist import WishlistTypeEnum, VisibilityEnum
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.schemas.item import Item


class WishlistBase(BaseModel):
    """Wishlist base schema"""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    cover_emoji: Optional[str] = Field(None, max_length=10)
    wishlist_type: WishlistTypeEnum = WishlistTypeEnum.PERMANENT
    event_name: Optional[str] = Field(None, max_length=255)
    event_date: Optional[date] = None
    visibility: VisibilityEnum = VisibilityEnum.BY_LINK


class WishlistCreate(WishlistBase):
    """Wishlist create schema"""
    pass


class WishlistUpdate(BaseModel):
    """Wishlist update schema"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    cover_emoji: Optional[str] = Field(None, max_length=10)
    wishlist_type: Optional[WishlistTypeEnum] = None
    event_name: Optional[str] = Field(None, max_length=255)
    event_date: Optional[date] = None
    visibility: Optional[VisibilityEnum] = None
    is_archived: Optional[bool] = None


class WishlistInDB(WishlistBase):
    """Wishlist in database schema"""
    id: int
    owner_id: int
    share_token: str
    is_archived: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class WishlistSummary(WishlistInDB):
    """Wishlist summary for list views (without items)"""
    items_count: int = 0


class Wishlist(WishlistInDB):
    """Wishlist response schema with items (for detail view)"""
    items: Optional[List['Item']] = []
    
    model_config = ConfigDict(from_attributes=True)


# Import Item after Wishlist to avoid circular import
from app.schemas.item import Item
Wishlist.model_rebuild()
