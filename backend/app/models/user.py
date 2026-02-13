"""
User model
"""
from sqlalchemy import Column, Integer, String, BigInteger, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class User(Base):
    """User model"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)  # nullable for Google OAuth users
    full_name = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    # Email verification
    email_verified = Column(Boolean, default=False)
    google_id = Column(String(255), unique=True, nullable=True)
    
    # Онбординг
    onboarding_completed = Column(Boolean, default=False)
    
    # Telegram интеграция (для будущего)
    telegram_user_id = Column(BigInteger, unique=True, nullable=True)
    telegram_username = Column(String(100), nullable=True)
    telegram_notifications_enabled = Column(Boolean, default=False)
    
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    wishlists = relationship("Wishlist", back_populates="owner", cascade="all, delete-orphan")
    reservations = relationship("Reservation", back_populates="user")
    contributions = relationship("Contribution", back_populates="user")
    friendships_sent = relationship("Friendship", foreign_keys="Friendship.user_id", back_populates="user")
    friendships_received = relationship("Friendship", foreign_keys="Friendship.friend_id", back_populates="friend")
