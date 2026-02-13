"""
Item model
"""
from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSON
from app.db.base import Base
import enum


class PriorityEnum(str, enum.Enum):
    """Priority enum"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Item(Base):
    """Item model"""
    __tablename__ = "items"
    
    id = Column(Integer, primary_key=True, index=True)
    wishlist_id = Column(Integer, ForeignKey("wishlists.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    url = Column(String(1000), nullable=True)
    image_url = Column(String(500), nullable=True)  # Legacy single image, deprecated
    images = Column(JSON, nullable=True, default=list)  # New: array of image URLs
    
    # Цена и складчины
    price = Column(Numeric(10, 2), nullable=True)
    currency = Column(String(10), default="₽")
    target_amount = Column(Numeric(10, 2), nullable=True)
    collected_amount = Column(Numeric(10, 2), default=0)
    
    priority = Column(Enum(PriorityEnum), default=PriorityEnum.MEDIUM, nullable=False)
    is_reserved = Column(Boolean, default=False)
    is_purchased = Column(Boolean, default=False)
    
    # Кто забронировал (имя для анонимных пользователей)
    reserved_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reserved_by_name = Column(String(100), nullable=True)  # Имя анонимного бронирующего
    contributors = Column(JSON, nullable=True, default=list)  # [{name, amount}]
    
    position_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    wishlist = relationship("Wishlist", back_populates="items")
    reserved_by = relationship("User", foreign_keys=[reserved_by_id])
    reservations = relationship("Reservation", back_populates="item", cascade="all, delete-orphan")
    contributions = relationship("Contribution", back_populates="item", cascade="all, delete-orphan")
