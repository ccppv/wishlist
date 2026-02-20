"""
Users endpoints
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, and_, or_
from typing import List, Optional
from pathlib import Path
import shutil
import uuid

from app.db.session import get_db
from app.schemas.user import User, UserCreate, UserUpdate
from app.schemas.wishlist import WishlistSummary
from app.models.user import User as UserModel
from app.models.wishlist import Wishlist as WishlistModel, VisibilityEnum
from app.models.friendship import Friendship as FriendshipModel, FriendshipStatusEnum
from app.api.dependencies import get_current_active_user, get_current_user_optional

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/me", response_model=User)
async def read_current_user(
    current_user: UserModel = Depends(get_current_active_user),
) -> User:
    """
    Get current user
    """
    return current_user


@router.patch("/me", response_model=User)
async def update_current_user(
    full_name: Optional[str] = Form(None),
    avatar: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
) -> User:
    """
    Update current user profile
    """
    logger.info("[PATCH /users/me] user_id=%d username=%s | full_name received=%r | avatar received=%s (filename=%r content_type=%r)",
                current_user.id, current_user.username, full_name,
                avatar is not None, avatar.filename if avatar else None, avatar.content_type if avatar else None)

    if full_name is not None:
        old_name = current_user.full_name
        current_user.full_name = full_name
        logger.info("[PATCH /users/me] full_name updated: %r -> %r", old_name, full_name)

    # Handle avatar upload
    if avatar:
        # Validate file type
        ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
        
        if not avatar.content_type or not avatar.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image"
            )
        
        # Read and validate file size
        contents = await avatar.read()
        if len(contents) > 5 * 1024 * 1024:  # 5MB
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image must be less than 5MB"
            )
        
        # Validate extension
        ext = avatar.filename.rsplit(".", 1)[-1].lower() if avatar.filename and "." in avatar.filename else "jpg"
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file extension. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        uploads_dir = Path("uploads/avatars")
        uploads_dir.mkdir(parents=True, exist_ok=True)
        
        filename = f"{uuid.uuid4()}.{ext}"
        file_path = uploads_dir / filename
        
        # Write the already-read contents
        with file_path.open("wb") as buffer:
            buffer.write(contents)

        old_avatar = current_user.avatar_url
        current_user.avatar_url = f"/uploads/avatars/{filename}"
        logger.info("[PATCH /users/me] avatar updated: %r -> %r | file_size=%d bytes", old_avatar, current_user.avatar_url, len(contents))

    await db.commit()
    result = await db.execute(select(UserModel).where(UserModel.id == current_user.id))
    updated_user = result.scalar_one()
    logger.info("[PATCH /users/me] OK user_id=%d full_name=%r avatar_url=%r", updated_user.id, updated_user.full_name, updated_user.avatar_url)
    return updated_user


@router.patch("/me/json", response_model=User)
async def update_current_user_json(
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
) -> User:
    """Update user profile via JSON (for full_name only)"""
    logger.info("[PATCH /users/me/json] user_id=%d username=%s | body=%r",
                current_user.id, current_user.username, user_update.model_dump(exclude_none=True))

    if user_update.full_name is not None:
        old_name = current_user.full_name
        current_user.full_name = user_update.full_name
        logger.info("[PATCH /users/me/json] full_name updated: %r -> %r", old_name, user_update.full_name)

    await db.commit()
    result = await db.execute(select(UserModel).where(UserModel.id == current_user.id))
    updated_user = result.scalar_one()
    logger.info("[PATCH /users/me/json] OK user_id=%d full_name=%r", updated_user.id, updated_user.full_name)
    return updated_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
):
    """
    Delete current user account
    """
    await db.delete(current_user)
    await db.commit()
    return None


@router.get("/search", response_model=List[User])
async def search_users(
    query: str,
    db: AsyncSession = Depends(get_db),
    limit: int = 10,
) -> List[User]:
    """
    Search users by username or email
    """
    search_pattern = f"%{query}%"
    result = await db.execute(
        select(UserModel)
        .where(
            (UserModel.username.ilike(search_pattern)) |
            (UserModel.email.ilike(search_pattern))
        )
        .limit(limit)
    )
    users = result.scalars().all()
    return users


@router.get("/{username}", response_model=User)
async def get_user_by_username(
    username: str,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get user by username
    """
    result = await db.execute(
        select(UserModel).where(UserModel.username == username)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.get("/{username}/wishlists", response_model=List[WishlistSummary])
async def get_user_wishlists(
    username: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
) -> List[WishlistSummary]:
    """
    Get wishlists for a user by username.
    Shows by_link wishlists for everyone.
    Shows friends_only wishlists if requester is a friend.
    """
    # Get user
    result = await db.execute(
        select(UserModel).where(UserModel.username == username)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    # If user is viewing their own profile, show all wishlists
    if current_user and current_user.id == user.id:
        result = await db.execute(
            select(WishlistModel)
            .options(selectinload(WishlistModel.items))
            .where(
                WishlistModel.owner_id == user.id,
                WishlistModel.is_archived == False
            )
            .order_by(WishlistModel.created_at.desc())
        )
        wishlists = result.scalars().all()
        summaries = []
        for wl in wishlists:
            s = WishlistSummary.model_validate(wl)
            s.items_count = len(wl.items) if wl.items else 0
            summaries.append(s)
        return summaries

    # Check if current user is friends with this user
    is_friend = False
    if current_user and current_user.id != user.id:
        # Normalize IDs for database constraint
        user_id_min = min(current_user.id, user.id)
        user_id_max = max(current_user.id, user.id)
        
        result = await db.execute(
            select(FriendshipModel).where(
                and_(
                    FriendshipModel.user_id == user_id_min,
                    FriendshipModel.friend_id == user_id_max,
                    FriendshipModel.status == FriendshipStatusEnum.ACCEPTED
                )
            )
        )
        friendship = result.scalar_one_or_none()
        is_friend = friendship is not None
    
    # Build visibility conditions:
    # - Public lists доступны всем
    # - Friends_only показываем только друзьям
    visibility_conditions = [WishlistModel.visibility == VisibilityEnum.PUBLIC]
    if is_friend:
        visibility_conditions.append(WishlistModel.visibility == VisibilityEnum.FRIENDS_ONLY)

    result = await db.execute(
        select(WishlistModel)
        .options(selectinload(WishlistModel.items))
        .where(
            WishlistModel.owner_id == user.id,
            WishlistModel.is_archived == False,
            or_(*visibility_conditions),
        )
        .order_by(WishlistModel.created_at.desc())
    )
    wishlists = result.scalars().all()
    summaries = []
    for wl in wishlists:
        s = WishlistSummary.model_validate(wl)
        s.items_count = len(wl.items) if wl.items else 0
        summaries.append(s)
    return summaries


@router.get("/", response_model=List[User])
async def get_users(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> List[User]:
    """
    Retrieve users
    """
    # TODO: Implement get users
    return []


@router.post("/", response_model=User)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Create new user
    """
    # TODO: Implement create user
    pass


@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get user by ID
    """
    # TODO: Implement get user
    pass


@router.put("/{user_id}", response_model=User)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Update user
    """
    # TODO: Implement update user
    pass


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete user
    """
    # TODO: Implement delete user
    pass
