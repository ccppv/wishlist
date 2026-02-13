"""Google OAuth authentication"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from urllib.parse import urlencode
import httpx

from app.db.session import get_db
from app.models.user import User as UserModel
from app.core.security import create_access_token
from app.core.config import settings

router = APIRouter()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


@router.get("/login")
async def google_login():
    """Redirect user to Google OAuth consent screen"""
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url=url)


@router.get("/callback")
async def google_callback(
    code: str = None,
    error: str = None,
    db: AsyncSession = Depends(get_db),
):
    """Handle Google OAuth callback"""
    if error:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth/login?error=google_denied"
        )

    if not code:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth/login?error=no_code"
        )

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )

        if token_resp.status_code != 200:
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/auth/login?error=google_token_failed"
            )

        token_data = token_resp.json()
        access_token = token_data["access_token"]

        # Get user info from Google
        user_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if user_resp.status_code != 200:
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/auth/login?error=google_userinfo_failed"
            )

        user_info = user_resp.json()

    google_id = str(user_info["id"])
    email = user_info.get("email")
    name = user_info.get("name")
    avatar = user_info.get("picture")

    if not email:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth/login?error=no_email"
        )

    # Find existing user by google_id or email
    result = await db.execute(
        select(UserModel).where(
            (UserModel.google_id == google_id) | (UserModel.email == email)
        )
    )
    user = result.scalar_one_or_none()

    if user:
        # Link Google account to existing user
        if not user.google_id:
            user.google_id = google_id
        if not user.email_verified:
            user.email_verified = True
        if avatar and not user.avatar_url:
            user.avatar_url = avatar
        if name and not user.full_name:
            user.full_name = name
        await db.commit()
        await db.refresh(user)
    else:
        # Create new user from Google data
        username = email.split("@")[0]
        # Ensure unique username
        base_username = username[:45]  # leave room for counter
        counter = 1
        while True:
            existing = await db.execute(
                select(UserModel).where(UserModel.username == username)
            )
            if not existing.scalar_one_or_none():
                break
            username = f"{base_username}{counter}"
            counter += 1

        user = UserModel(
            email=email,
            username=username,
            google_id=google_id,
            hashed_password=None,
            full_name=name,
            avatar_url=avatar,
            email_verified=True,
            onboarding_completed=bool(name),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Create JWT
    jwt_token = create_access_token(subject=user.id)

    # Redirect to frontend with token
    redirect_url = f"{settings.FRONTEND_URL}/auth/google/callback?token={jwt_token}"
    return RedirectResponse(url=redirect_url)
