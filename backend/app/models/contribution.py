"""
Contribution model
"""
from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Contribution(Base):
    """Contribution model"""
    __tablename__ = "contributions"
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Кто внес вклад
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    guest_session_id = Column(Integer, ForeignKey("guest_sessions.id", ondelete="SET NULL"), nullable=True)
    
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    message = Column(Text, nullable=True)
    
    contributed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    item = relationship("Item", back_populates="contributions")
    user = relationship("User", back_populates="contributions")
    guest_session = relationship("GuestSession", back_populates="contributions")
