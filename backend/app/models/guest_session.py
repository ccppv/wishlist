"""
GuestSession model
"""
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class GuestSession(Base):
    """Guest session model"""
    __tablename__ = "guest_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_token = Column(String(64), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Relationships
    reservations = relationship("Reservation", back_populates="guest_session")
    contributions = relationship("Contribution", back_populates="guest_session")
