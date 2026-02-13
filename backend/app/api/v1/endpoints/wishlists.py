"""
Wishlist endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date
from pathlib import Path
import secrets
import shutil
import uuid
import json

from app.db.session import get_db
from app.schemas.wishlist import WishlistCreate, Wishlist, WishlistUpdate, WishlistSummary
from app.models.wishlist import Wishlist as WishlistModel, WishlistTypeEnum, VisibilityEnum
from app.models.user import User as UserModel
from app.models.friendship import Friendship as FriendshipModel, FriendshipStatusEnum
from app.api.dependencies import get_current_active_user
from app.api.v1.endpoints.websocket import manager

router = APIRouter()


@router.post("/", response_model=WishlistSummary, status_code=status.HTTP_201_CREATED)
async def create_wishlist(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    wishlist_type: str = Form("permanent"),
    event_name: Optional[str] = Form(None),
    event_date: Optional[str] = Form(None),
    visibility: str = Form("by_link"),
    cover_emoji: Optional[str] = Form(None),
    cover_image: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
) -> WishlistSummary:
    """
    Create new wishlist with optional cover image or emoji
    """
    # Generate unique share token
    share_token = secrets.token_urlsafe(32)
    
    cover_image_url = None
    
    # Handle cover image upload
    if cover_image:
        uploads_dir = Path("uploads/wishlists")
        uploads_dir.mkdir(parents=True, exist_ok=True)
        
        file_extension = Path(cover_image.filename).suffix
        filename = f"{uuid.uuid4()}{file_extension}"
        file_path = uploads_dir / filename
        
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(cover_image.file, buffer)
        
        cover_image_url = f"/uploads/wishlists/{filename}"
    
    # Parse event_date if provided
    parsed_event_date = None
    if event_date:
        try:
            from datetime import datetime
            parsed_event_date = datetime.strptime(event_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
    
    # Parse visibility enum
    try:
        visibility_enum = VisibilityEnum(visibility)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid visibility value: {visibility}. Must be one of: public, by_link, friends_only"
        )
    
    # Parse wishlist_type enum
    try:
        wishlist_type_enum = WishlistTypeEnum(wishlist_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid wishlist_type value: {wishlist_type}. Must be one of: permanent, event"
        )
    
    wishlist = WishlistModel(
        owner_id=current_user.id,
        title=title,
        description=description,
        wishlist_type=wishlist_type_enum,
        event_name=event_name,
        event_date=parsed_event_date,
        visibility=visibility_enum,
        share_token=share_token,
        cover_image_url=cover_image_url,
        cover_emoji=cover_emoji,
    )
    
    db.add(wishlist)
    await db.commit()
    await db.refresh(wishlist)
    
    # Build WS message
    websocket_message = json.dumps({
        "type": "wishlist",
        "action": "created",
        "wishlist_id": wishlist.id,
        "owner_id": current_user.id,
        "owner_username": current_user.username,
        "title": wishlist.title,
        "visibility": wishlist.visibility.value
    })

    # Notify the owner (for other tabs/devices)
    await manager.send_personal_message(websocket_message, str(current_user.id))

    # Notify friends if visibility allows
    result = await db.execute(
        select(FriendshipModel).where(
            and_(
                or_(
                    FriendshipModel.user_id == current_user.id,
                    FriendshipModel.friend_id == current_user.id
                ),
                FriendshipModel.status == FriendshipStatusEnum.ACCEPTED
            )
        )
    )
    friendships = result.scalars().all()
    for friendship in friendships:
        friend_id = friendship.friend_id if friendship.user_id == current_user.id else friendship.user_id
        await manager.send_personal_message(websocket_message, str(friend_id))
    
    return wishlist


@router.get("/", response_model=List[WishlistSummary])
async def get_my_wishlists(
    skip: int = 0,
    limit: int = 100,
    include_archived: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
) -> List[WishlistSummary]:
    """
    Get current user's wishlists
    """
    query = (
        select(WishlistModel)
        .options(selectinload(WishlistModel.items))
        .where(WishlistModel.owner_id == current_user.id)
    )
    
    if not include_archived:
        query = query.where(WishlistModel.is_archived == False)
    
    query = query.offset(skip).limit(limit).order_by(WishlistModel.created_at.desc())
    
    result = await db.execute(query)
    wishlists = result.scalars().all()
    
    # Build summaries with items_count
    summaries = []
    for wl in wishlists:
        s = WishlistSummary.model_validate(wl)
        s.items_count = len(wl.items) if wl.items else 0
        summaries.append(s)
    
    return summaries


@router.get("/{wishlist_id}", response_model=Wishlist)
async def get_wishlist(
    wishlist_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
):
    """
    Get wishlist by ID (owner view - hides reservation info)
    """
    result = await db.execute(
        select(WishlistModel)
        .options(selectinload(WishlistModel.items))
        .where(WishlistModel.id == wishlist_id)
    )
    wishlist = result.scalar_one_or_none()
    
    if not wishlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist not found"
        )
    
    # Check access rights
    if wishlist.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # CRITICAL: Convert to Pydantic FIRST, then hide reservation info
    # NEVER mutate ORM objects — session.commit() would persist zeroed values to DB
    response = Wishlist.model_validate(wishlist)
    if response.items:
        for item in response.items:
            item.is_reserved = False
            item.reserved_by_name = None
            item.collected_amount = 0
            item.contributors = []
    
    return response


@router.get("/share/{share_token}", response_model=Wishlist)
async def get_wishlist_by_token(
    share_token: str,
    db: AsyncSession = Depends(get_db),
) -> Wishlist:
    """
    Get wishlist by share token (for guests and friends)
    """
    result = await db.execute(
        select(WishlistModel)
        .options(selectinload(WishlistModel.items))
        .where(WishlistModel.share_token == share_token)
    )
    wishlist = result.scalar_one_or_none()
    
    if not wishlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist not found"
        )
    
    if wishlist.is_archived:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This wishlist is archived"
        )
    
    return wishlist


@router.delete("/{wishlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wishlist(
    wishlist_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
):
    """
    Delete a wishlist
    """
    result = await db.execute(
        select(WishlistModel).where(WishlistModel.id == wishlist_id)
    )
    wishlist = result.scalar_one_or_none()
    
    if not wishlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist not found"
        )
    
    if wishlist.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to delete this wishlist"
        )

    wishlist_id_val = wishlist.id
    wishlist_title = wishlist.title
    await db.delete(wishlist)
    await db.commit()

    # Notify owner + friends
    ws_msg = json.dumps({
        "type": "wishlist",
        "action": "deleted",
        "wishlist_id": wishlist_id_val,
        "owner_id": current_user.id,
        "title": wishlist_title,
    })
    await manager.send_personal_message(ws_msg, str(current_user.id))
    result = await db.execute(
        select(FriendshipModel).where(
            and_(
                or_(
                    FriendshipModel.user_id == current_user.id,
                    FriendshipModel.friend_id == current_user.id
                ),
                FriendshipModel.status == FriendshipStatusEnum.ACCEPTED
            )
        )
    )
    for f in result.scalars().all():
        fid = f.friend_id if f.user_id == current_user.id else f.user_id
        await manager.send_personal_message(ws_msg, str(fid))

    return None


@router.patch("/{wishlist_id}", response_model=WishlistSummary)
async def update_wishlist(
    wishlist_id: int,
    wishlist_in: WishlistUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
) -> WishlistSummary:
    """
    Update wishlist
    """
    result = await db.execute(
        select(WishlistModel).where(WishlistModel.id == wishlist_id)
    )
    wishlist = result.scalar_one_or_none()
    
    if not wishlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist not found"
        )
    
    if wishlist.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Update fields
    update_data = wishlist_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(wishlist, field, value)
    
    await db.commit()
    await db.refresh(wishlist)

    # Notify owner + friends
    ws_msg = json.dumps({
        "type": "wishlist",
        "action": "updated",
        "wishlist_id": wishlist.id,
        "owner_id": current_user.id,
        "title": wishlist.title,
    })
    await manager.send_personal_message(ws_msg, str(current_user.id))
    result = await db.execute(
        select(FriendshipModel).where(
            and_(
                or_(
                    FriendshipModel.user_id == current_user.id,
                    FriendshipModel.friend_id == current_user.id
                ),
                FriendshipModel.status == FriendshipStatusEnum.ACCEPTED
            )
        )
    )
    for f in result.scalars().all():
        fid = f.friend_id if f.user_id == current_user.id else f.user_id
        await manager.send_personal_message(ws_msg, str(fid))

    return wishlist


@router.patch("/{wishlist_id}/cover-image", response_model=WishlistSummary)
async def update_wishlist_cover(
    wishlist_id: int,
    cover_image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
) -> WishlistSummary:
    """
    Update wishlist cover image
    """
    result = await db.execute(
        select(WishlistModel).where(WishlistModel.id == wishlist_id)
    )
    wishlist = result.scalar_one_or_none()
    
    if not wishlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist not found"
        )
    
    if wishlist.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Delete old cover image if exists
    if wishlist.cover_image_url:
        old_path = Path(f".{wishlist.cover_image_url}")
        if old_path.exists():
            old_path.unlink()
    
    # Save new cover image
    uploads_dir = Path("uploads/wishlists")
    uploads_dir.mkdir(parents=True, exist_ok=True)
    
    file_extension = Path(cover_image.filename).suffix
    filename = f"{uuid.uuid4()}{file_extension}"
    file_path = uploads_dir / filename
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(cover_image.file, buffer)
    
    wishlist.cover_image_url = f"/uploads/wishlists/{filename}"
    wishlist.cover_emoji = None  # Clear emoji when setting image
    
    await db.commit()
    await db.refresh(wishlist)
    
    # Notify owner + friends
    ws_msg = json.dumps({
        "type": "wishlist",
        "action": "updated",
        "wishlist_id": wishlist.id,
        "owner_id": current_user.id,
        "title": wishlist.title,
    })
    await manager.send_personal_message(ws_msg, str(current_user.id))
    result = await db.execute(
        select(FriendshipModel).where(
            and_(
                or_(
                    FriendshipModel.user_id == current_user.id,
                    FriendshipModel.friend_id == current_user.id
                ),
                FriendshipModel.status == FriendshipStatusEnum.ACCEPTED
            )
        )
    )
    for f in result.scalars().all():
        fid = f.friend_id if f.user_id == current_user.id else f.user_id
        await manager.send_personal_message(ws_msg, str(fid))
    
    return wishlist
