"""
User schemas
"""
from pydantic import BaseModel, EmailStr, ConfigDict, Field
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    """User base schema"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    full_name: Optional[str] = Field(None, max_length=100)


class UserCreate(UserBase):
    """User create schema"""
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    """User update schema"""
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    full_name: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = Field(None, min_length=6)
    avatar_url: Optional[str] = None


class OnboardingComplete(BaseModel):
    """Onboarding completion schema"""
    full_name: str = Field(..., min_length=1, max_length=100)
    avatar_url: Optional[str] = None


class UserInDB(UserBase):
    """User in database schema"""
    id: int
    avatar_url: Optional[str] = None
    email_verified: bool = False
    google_id: Optional[str] = None
    onboarding_completed: bool
    telegram_user_id: Optional[int] = None
    telegram_username: Optional[str] = None
    telegram_notifications_enabled: bool
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class User(UserInDB):
    """User response schema"""
    pass


class UserPublic(BaseModel):
    """Public user info (for friends, etc)"""
    id: int
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """Token schema"""
    access_token: str
    token_type: str


class TokenWithUser(BaseModel):
    """Token with user data schema"""
    access_token: str
    token_type: str
    user: User


class TokenPayload(BaseModel):
    """Token payload schema"""
    sub: Optional[int] = None


class RegisterResponse(BaseModel):
    """Response after registration (email verification needed)"""
    message: str
    email: str


class VerifyEmailRequest(BaseModel):
    """Request to verify email with code"""
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)


class ResendCodeRequest(BaseModel):
    """Request to resend verification code"""
    email: EmailStr
