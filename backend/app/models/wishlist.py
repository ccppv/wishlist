"""
Wishlist model
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Date, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class WishlistTypeEnum(str, enum.Enum):
    """Wishlist type enum"""
    PERMANENT = "permanent"
    EVENT = "event"


class VisibilityEnum(str, enum.Enum):
    """Visibility enum"""
    PUBLIC = "public"
    BY_LINK = "by_link"
    FRIENDS_ONLY = "friends_only"


class Wishlist(Base):
    """Wishlist model"""
    __tablename__ = "wishlists"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    cover_image_url = Column(String(500), nullable=True)
    cover_emoji = Column(String(10), nullable=True)  # For emoji covers
    
    # Тип вишлиста
    wishlist_type = Column(Enum(WishlistTypeEnum), default=WishlistTypeEnum.PERMANENT, nullable=False)
    event_name = Column(String(255), nullable=True)
    event_date = Column(Date, nullable=True)
    
    # Приватность
    visibility = Column(Enum(VisibilityEnum), default=VisibilityEnum.BY_LINK, nullable=False)
    share_token = Column(String(64), unique=True, nullable=False, index=True)
    
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="wishlists")
    items = relationship("Item", back_populates="wishlist", cascade="all, delete-orphan")
