"""
Authentication endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime, timedelta
import secrets
import shutil
from pathlib import Path
import uuid

from app.db.session import get_db
from app.models.guest_session import GuestSession
from app.schemas.user import (
    TokenWithUser, UserCreate, User, OnboardingComplete,
    RegisterResponse, VerifyEmailRequest, ResendCodeRequest,
)
from app.models.user import User as UserModel
from app.core.security import create_access_token, get_password_hash, verify_password
from app.core.config import settings
from app.api.dependencies import get_current_user
from app.services.email import send_verification_email
from app.services.verification import generate_verification_code, verify_code, get_resend_attempts

router = APIRouter()


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> RegisterResponse:
    """
    Register new user. Sends verification code to email.
    """
    # Check if user exists
    result = await db.execute(
        select(UserModel).where(
            (UserModel.email == user_in.email) | (UserModel.username == user_in.username)
        )
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        if existing_user.email == user_in.email:
            # If user exists but not verified, resend code
            if not existing_user.email_verified:
                code = await generate_verification_code(user_in.email)
                await send_verification_email(user_in.email, code)
                return RegisterResponse(
                    message="Код подтверждения повторно отправлен на вашу почту",
                    email=user_in.email,
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )

    # Create new user (unverified)
    user = UserModel(
        email=user_in.email,
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        email_verified=False,
        onboarding_completed=False,
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Generate and send verification code
    code = await generate_verification_code(user_in.email)
    await send_verification_email(user_in.email, code)

    return RegisterResponse(
        message="Код подтверждения отправлен на вашу почту",
        email=user_in.email,
    )


@router.post("/verify-email", response_model=TokenWithUser)
async def verify_email(
    data: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenWithUser:
    """
    Verify email with 6-digit code. Returns token on success.
    """
    # Check code
    is_valid = await verify_code(data.email, data.code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный или просроченный код"
        )

    # Find user and mark as verified
    result = await db.execute(
        select(UserModel).where(UserModel.email == data.email)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )

    user.email_verified = True
    await db.commit()
    await db.refresh(user)

    # Create access token
    access_token = create_access_token(subject=user.id)
    return TokenWithUser(access_token=access_token, token_type="bearer", user=user)


@router.post("/resend-code", response_model=RegisterResponse)
async def resend_code(
    data: ResendCodeRequest,
    db: AsyncSession = Depends(get_db),
) -> RegisterResponse:
    """
    Resend verification code to email.
    """
    # Check rate limit
    attempts = await get_resend_attempts(data.email)
    if attempts >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Слишком много попыток. Попробуйте через час."
        )

    # Check user exists
    result = await db.execute(
        select(UserModel).where(UserModel.email == data.email)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )

    if user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email уже подтверждён"
        )

    # Generate and send new code
    code = await generate_verification_code(data.email)
    await send_verification_email(data.email, code)

    return RegisterResponse(
        message="Код подтверждения повторно отправлен",
        email=data.email,
    )


@router.post("/forgot-password")
async def forgot_password(email: str = Body(..., embed=True)):
    """Placeholder for password reset. Returns 501 until implemented."""
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=501,
        content={"detail": "Восстановление пароля пока в разработке."},
    )


@router.post("/login", response_model=TokenWithUser)
async def login(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> TokenWithUser:
    """
    OAuth2 compatible token login
    """
    # Find user by username or email
    result = await db.execute(
        select(UserModel).where(
            (UserModel.username == form_data.username) | (UserModel.email == form_data.username)
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user has a password (might be Google-only account)
    if not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Этот аккаунт использует вход через Google"
        )

    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Аккаунт деактивирован"
        )

    # Check email verification
    if not user.email_verified:
        # Resend code automatically
        code = await generate_verification_code(user.email)
        await send_verification_email(user.email, code)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email не подтверждён. Код отправлен повторно.",
        )

    # Create access token
    access_token = create_access_token(subject=user.id)

    return TokenWithUser(access_token=access_token, token_type="bearer", user=user)


@router.get("/me", response_model=User)
async def get_me(
    current_user: UserModel = Depends(get_current_user),
) -> User:
    """Get current authenticated user"""
    return current_user



@router.post("/guest-session")
async def create_guest_session(
    request: Request,
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Create guest session for anonymous use. Display name required.
    Session expires in 90 days.
    """
    display_name = (body.get("display_name") or "").strip()
    if not display_name or len(display_name) < 2:
        raise HTTPException(status_code=400, detail="Укажите имя (минимум 2 символа)")

    session_token = secrets.token_urlsafe(32)
    guest_session = GuestSession(
        session_token=session_token,
        display_name=display_name,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        expires_at=datetime.utcnow() + timedelta(days=90),
    )
    db.add(guest_session)
    await db.commit()
    await db.refresh(guest_session)
    return {"token": session_token, "display_name": display_name, "expires_in_days": 90}

@router.post("/onboarding", response_model=User)
async def complete_onboarding(
    full_name: str = Form(default=""),
    avatar: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
) -> User:
    """
    Complete user onboarding. Idempotent: if already completed, returns 200 with user.
    """
    if current_user.onboarding_completed:
        await db.refresh(current_user)
        return current_user

    if full_name.strip():
        current_user.full_name = full_name.strip()

    if avatar and avatar.filename:
        uploads_dir = Path("uploads/avatars")
        uploads_dir.mkdir(parents=True, exist_ok=True)
        ext = Path(avatar.filename).suffix or ".jpg"
        filename = f"{uuid.uuid4()}{ext}"
        file_path = uploads_dir / filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(avatar.file, buffer)
        current_user.avatar_url = f"/uploads/avatars/{filename}"

    current_user.onboarding_completed = True
    await db.commit()
    await db.refresh(current_user)
    return current_user
