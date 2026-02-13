"""
Friendship model
"""
from sqlalchemy import Column, Integer, DateTime, Enum, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class FriendshipStatusEnum(str, enum.Enum):
    """Friendship status enum"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    BLOCKED = "blocked"


class Friendship(Base):
    """Friendship model"""
    __tablename__ = "friendships"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    friend_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    requester_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)  # Who sent the request
    
    status = Column(Enum(FriendshipStatusEnum), default=FriendshipStatusEnum.PENDING, nullable=False)
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="friendships_sent")
    friend = relationship("User", foreign_keys=[friend_id], back_populates="friendships_received")
    
    __table_args__ = (
        CheckConstraint("user_id < friend_id", name="check_user_friend_order"),
        UniqueConstraint("user_id", "friend_id", name="unique_friendship"),
    )
