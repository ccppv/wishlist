"""
Reservation model
"""
from sqlalchemy import Column, Integer, DateTime, Enum, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class ReservationStatusEnum(str, enum.Enum):
    """Reservation status enum"""
    ACTIVE = "active"
    CANCELLED = "cancelled"
    PURCHASED = "purchased"


class Reservation(Base):
    """Reservation model"""
    __tablename__ = "reservations"
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Кто зарезервировал (user ИЛИ guest)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    guest_session_id = Column(Integer, ForeignKey("guest_sessions.id", ondelete="SET NULL"), nullable=True)
    
    status = Column(Enum(ReservationStatusEnum), default=ReservationStatusEnum.ACTIVE, nullable=False)
    reserved_at = Column(DateTime(timezone=True), server_default=func.now())
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    purchased_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    item = relationship("Item", back_populates="reservations")
    user = relationship("User", back_populates="reservations")
    guest_session = relationship("GuestSession", back_populates="reservations")
    
    __table_args__ = (
        CheckConstraint(
            "(user_id IS NOT NULL AND guest_session_id IS NULL) OR (user_id IS NULL AND guest_session_id IS NOT NULL)",
            name="check_reservation_owner"
        ),
    )
