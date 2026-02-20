"""
Item schemas
"""
from pydantic import BaseModel, ConfigDict, Field, computed_field, PlainSerializer
from datetime import datetime, date
from typing import Optional, List, Annotated
from decimal import Decimal
from app.models.item import PriorityEnum

DecimalAsNum = Annotated[Decimal, PlainSerializer(lambda x: float(x) if x is not None else None)]


class ItemBase(BaseModel):
    """Item base schema"""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    url: Optional[str] = Field(None, max_length=1000)
    image_url: Optional[str] = Field(None, max_length=500)  # Legacy, deprecated
    images: Optional[List[str]] = Field(default_factory=list)  # New: array of image URLs
    price: Optional[DecimalAsNum] = None
    currency: str = Field(default="₽", max_length=10)
    target_amount: Optional[DecimalAsNum] = None
    priority: PriorityEnum = PriorityEnum.MEDIUM


class ItemCreate(ItemBase):
    """Item create schema"""
    pass


class ItemUpdate(BaseModel):
    """Item update schema"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    url: Optional[str] = Field(None, max_length=1000)
    image_url: Optional[str] = Field(None, max_length=500)
    images: Optional[List[str]] = None
    price: Optional[Decimal] = None
    currency: Optional[str] = Field(None, max_length=10)
    target_amount: Optional[Decimal] = None
    priority: Optional[PriorityEnum] = None
    position_order: Optional[int] = None


class Contributor(BaseModel):
    """A single contributor to a gift"""
    name: str
    amount: float


class ItemInDB(ItemBase):
    """Item in database schema"""
    id: int
    wishlist_id: int
    collected_amount: DecimalAsNum
    is_reserved: bool
    is_purchased: bool
    reserved_by_name: Optional[str] = None
    contributors: Optional[List[Contributor]] = Field(default_factory=list)
    position_order: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class Item(ItemInDB):
    """Item response schema with calculated fields"""
    
    @computed_field
    @property
    def contribution_progress(self) -> Optional[float]:
        """Calculate contribution progress percentage"""
        if self.target_amount and self.target_amount > 0:
            return float(self.collected_amount / self.target_amount * 100)
        if self.price and self.price > 0 and self.collected_amount > 0:
            return float(self.collected_amount / self.price * 100)
        return None


class ItemOwnerView(ItemBase):
    """Item response for wishlist owner - hides reservation info"""
    id: int
    wishlist_id: int
    collected_amount: DecimalAsNum = Field(default=Decimal(0))
    is_reserved: bool = False
    is_purchased: bool
    reserved_by_name: Optional[str] = None  # Always None for owner
    position_order: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    contribution_progress: Optional[float] = None
    
    model_config = ConfigDict(from_attributes=True)


class ReserveRequest(BaseModel):
    """Reserve item request"""
    amount: Optional[float] = None  # None = full reserve, float = partial
    name: Optional[str] = Field(None, max_length=100)  # Required for anonymous users


class ItemCopyRequest(BaseModel):
    """Request body for copying item to another wishlist"""
    target_wishlist_id: int


class WishlistInfo(BaseModel):
    """Minimal wishlist info for reserved items"""
    id: int
    title: str
    event_date: Optional[date] = None
    wishlist_type: str
    owner_username: str
    owner_fullname: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class ReservedItemDetail(ItemBase):
    """Extended item info for my-reservations endpoint"""
    id: int
    wishlist_id: int
    collected_amount: DecimalAsNum
    is_reserved: bool
    is_purchased: bool
    reserved_by_name: Optional[str] = None
    contributors: Optional[List[Contributor]] = Field(default_factory=list)
    position_order: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    reserved_at: Optional[datetime] = None  # When current user reserved it
    wishlist: Optional[WishlistInfo] = None  # Wishlist details
    
    model_config = ConfigDict(from_attributes=True)
    
    @computed_field
    @property
    def my_contribution(self) -> Optional[float]:
        """Calculate how much current user contributed"""
        return float(self.collected_amount) if self.collected_amount else None
    
    @computed_field
    @property
    def days_until_event(self) -> Optional[int]:
        """Calculate days until event"""
        if self.wishlist and self.wishlist.event_date:
            from datetime import date as dt_date
            today = dt_date.today()
            delta = self.wishlist.event_date - today
            return delta.days if delta.days >= 0 else None
        return None
