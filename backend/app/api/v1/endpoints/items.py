from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.sql import func
from sqlalchemy.orm import selectinload, joinedload
from typing import List, Optional
from decimal import Decimal
import json
import uuid
from pathlib import Path
from app.db.session import get_db
from app.models.user import User
from app.models.item import Item as ItemModel
from app.models.wishlist import Wishlist as WishlistModel
from app.models.friendship import Friendship as FriendshipModel, FriendshipStatusEnum
from app.models.reservation import Reservation, ReservationStatusEnum
from app.schemas.item import Item, ItemCreate, ItemUpdate, ReserveRequest, ReservedItemDetail, WishlistInfo, ItemCopyRequest
from app.schemas.parser import ParseProductRequest, ParsedProductData
from app.api.dependencies import get_current_user, get_current_user_optional
from app.services.parsers import parse_product_from_url, ProductParserError
from app.api.v1.endpoints.websocket import manager

router = APIRouter()

UPLOAD_DIR = Path("uploads/items")


# ── Upload ─────────────────────────────────────────────────────────────────────

@router.post("/upload-image", response_model=dict)
async def upload_item_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload an image for an item. Returns the URL."""
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
    
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be less than 5MB")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file extension. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = UPLOAD_DIR / filename
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    with open(filepath, "wb") as f:
        f.write(contents)

    return {"url": f"/uploads/items/{filename}"}


# ── Batch Delete ───────────────────────────────────────────────────────────────

@router.post("/delete-batch", status_code=status.HTTP_200_OK)
async def delete_items_batch(
    item_ids: List[int] = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete multiple items at once (owner only)"""
    if not item_ids:
        return {"deleted": [], "count": 0}
    
    # Load all items with their wishlists in one query (prevent N+1)
    result = await db.execute(
        select(ItemModel)
        .options(joinedload(ItemModel.wishlist))
        .where(ItemModel.id.in_(item_ids))
    )
    items = result.unique().scalars().all()
    
    deleted = []
    async with db.begin_nested():
        for item in items:
            # Verify ownership
            if not item.wishlist or item.wishlist.owner_id != current_user.id:
                continue
            await db.delete(item)
            deleted.append(item.id)
        
    await db.commit()
    return {"deleted": deleted, "count": len(deleted)}


# ── CRUD ───────────────────────────────────────────────────────────────────────

@router.post("", response_model=Item, status_code=status.HTTP_201_CREATED)
async def create_item(
    wishlist_id: int = Query(..., description="ID вишлиста"),
    item_data: ItemCreate = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new item in a wishlist"""
    wishlist = await _get_owned_wishlist(db, wishlist_id, current_user.id)

    item = ItemModel(
        wishlist_id=wishlist.id,
        **item_data.model_dump()
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    await _notify_wishlist_viewers(db, wishlist, current_user, "item_created", {
        "item_id": item.id,
        "title": item.title,
    })
    await _notify_share_token_viewers(wishlist, "item_created", {"item_id": item.id, "title": item.title})

    return item


@router.get("", response_model=List[Item])
async def get_items(
    wishlist_id: int = Query(..., description="ID вишлиста"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all items in a wishlist"""
    # Verify access to wishlist
    wishlist_result = await db.execute(
        select(WishlistModel).where(WishlistModel.id == wishlist_id)
    )
    wishlist = wishlist_result.scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    
    # Check if user is owner or friend
    if wishlist.owner_id != current_user.id:
        # Check friendship
        friendship_result = await db.execute(
            select(FriendshipModel).where(
                and_(
                    or_(
                        and_(FriendshipModel.user_id == current_user.id, FriendshipModel.friend_id == wishlist.owner_id),
                        and_(FriendshipModel.user_id == wishlist.owner_id, FriendshipModel.friend_id == current_user.id)
                    ),
                    FriendshipModel.status == FriendshipStatusEnum.ACCEPTED
                )
            )
        )
        if not friendship_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Access denied")
    
    result = await db.execute(
        select(ItemModel)
        .where(ItemModel.wishlist_id == wishlist_id)
        .order_by(ItemModel.position_order, ItemModel.created_at.desc())
    )
    return result.scalars().all()


@router.get("/my-reservations", response_model=List[ReservedItemDetail])
async def get_my_reservations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all items the current user has reserved with full details"""
    # МАКСИМАЛЬНО ПРОСТОЕ РЕШЕНИЕ: берём все items где reserved_by_id = current_user.id
    # ИЛИ где collected_amount > 0 (частичные резервы)
    
    result = await db.execute(
        select(ItemModel)
        .options(
            selectinload(ItemModel.wishlist).selectinload(WishlistModel.owner),
            selectinload(ItemModel.reservations)
        )
        .where(
            or_(
                ItemModel.reserved_by_id == current_user.id,
                and_(
                    ItemModel.collected_amount > 0,
                    ItemModel.contributors.isnot(None)
                )
            )
        )
        .order_by(ItemModel.created_at.desc())
    )
    all_items = result.scalars().all()
    
    # Фильтруем: оставляем только те где пользователь действительно вложился
    items = []
    user_names = {current_user.username, current_user.full_name, current_user.username.lower()}
    if current_user.full_name:
        user_names.add(current_user.full_name.lower())
    
    for item in all_items:
        # Если reserved_by_id совпадает - точно наш
        if item.reserved_by_id == current_user.id:
            items.append(item)
            continue
        
        # Если есть contributors - проверяем по именам
        if item.contributors:
            for contrib in item.contributors:
                contrib_name = contrib.get("name", "").lower() if isinstance(contrib, dict) else ""
                if contrib_name in user_names:
                    items.append(item)
                    break
    
    # Build response with additional info
    response = []
    
    for item in items:
        
        # Find reservation date - try new approach first, fallback to legacy
        reservation = next(
            (r for r in item.reservations if r.user_id == current_user.id and r.status == ReservationStatusEnum.ACTIVE),
            None
        )
        
        # For legacy reservations (no entry in reservations table), use updated_at or created_at
        reserved_at = None
        if reservation:
            reserved_at = reservation.reserved_at
        elif item.reserved_by_id == current_user.id:
            # Legacy reservation - use updated_at as approximation
            reserved_at = item.updated_at or item.created_at
        else:
            # Partial reservation - use created_at
            reserved_at = item.created_at
        
        # Build WishlistInfo
        wishlist_info = None
        if item.wishlist:
            wishlist_info = WishlistInfo(
                id=item.wishlist.id,
                title=item.wishlist.title,
                event_date=item.wishlist.event_date,
                wishlist_type=item.wishlist.wishlist_type.value,
                owner_username=item.wishlist.owner.username if item.wishlist.owner else "",
                owner_fullname=item.wishlist.owner.full_name if item.wishlist.owner else None
            )
        
        # Build ReservedItemDetail
        item_dict = {
            'id': item.id,
            'title': item.title,
            'description': item.description,
            'url': item.url,
            'image_url': item.image_url,
            'images': item.images or [],
            'price': item.price,
            'currency': item.currency,
            'target_amount': item.target_amount,
            'priority': item.priority,
            'wishlist_id': item.wishlist_id,
            'collected_amount': item.collected_amount,
            'is_reserved': item.is_reserved,
            'is_purchased': item.is_purchased,
            'reserved_by_name': item.reserved_by_name,
            'contributors': item.contributors or [],
            'position_order': item.position_order,
            'created_at': item.created_at,
            'updated_at': item.updated_at,
            'reserved_at': reserved_at,
            'wishlist': wishlist_info
        }
        
        response.append(ReservedItemDetail(**item_dict))
    
    return response


@router.post("/{item_id}/copy-to-wishlist", response_model=Item)
async def copy_item_to_wishlist(
    item_id: int,
    body: ItemCopyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a copy of an item in another wishlist.
    Only the owner of исходного и целевого вишлиста может выполнять операцию.
    """
    result = await db.execute(
        select(ItemModel)
        .options(joinedload(ItemModel.wishlist))
        .where(ItemModel.id == item_id)
    )
    source_item = result.scalar_one_or_none()
    if not source_item:
        raise HTTPException(status_code=404, detail="Item not found")

    if not source_item.wishlist or source_item.wishlist.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your wishlist")

    target_wishlist = await _get_owned_wishlist(db, body.target_wishlist_id, current_user.id)

    new_item = ItemModel(
        wishlist_id=target_wishlist.id,
        title=source_item.title,
        description=source_item.description,
        url=source_item.url,
        image_url=source_item.image_url,
        images=source_item.images,
        price=source_item.price,
        currency=source_item.currency,
        target_amount=source_item.target_amount,
        priority=source_item.priority,
        position_order=source_item.position_order,
    )

    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)

    await _notify_wishlist_viewers(db, target_wishlist, current_user, "item_created", {
        "item_id": new_item.id,
        "title": new_item.title,
    })
    await _notify_share_token_viewers(target_wishlist, "item_created", {"item_id": new_item.id, "title": new_item.title})

    return new_item


# ── Reserve / Unreserve (supports anonymous users) ─────────────────────────────

@router.post("/{item_id}/reserve", response_model=Item)
async def reserve_item(
    item_id: int,
    body: ReserveRequest = Body(ReserveRequest()),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Reserve an item. Works for both authenticated and anonymous users.
    Anonymous users must provide a name in the request body.
    """
    if current_user:
        reserver_name = current_user.full_name or current_user.username
    elif body.name:
        reserver_name = body.name.strip()
    else:
        raise HTTPException(status_code=400, detail="Укажите ваше имя для бронирования")

    amount = body.amount

    result = await db.execute(
        select(ItemModel)
        .where(ItemModel.id == item_id)
        .with_for_update()
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    wishlist_result = await db.execute(select(WishlistModel).where(WishlistModel.id == item.wishlist_id))
    wishlist = wishlist_result.scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")

    if current_user and wishlist.owner_id == current_user.id:
        raise HTTPException(status_code=403, detail="Нельзя бронировать свои подарки")

    if item.is_reserved and not amount:
        raise HTTPException(status_code=400, detail="Подарок уже забронирован")

    current_collected = Decimal(str(item.collected_amount or 0))
    if current_collected > 0 and amount is None:
        raise HTTPException(status_code=400, detail="Подарок уже частично забронирован. Можно только добавить вклад.")

    existing_contributors = list(item.contributors or [])

    if amount is None:
        item.is_reserved = True
        item.reserved_by_id = current_user.id if current_user else None
        item.reserved_by_name = reserver_name
        if item.price:
            item.collected_amount = item.price
            existing_contributors.append({"name": reserver_name, "amount": float(item.price)})
        else:
            existing_contributors.append({"name": reserver_name, "amount": 0})
        item.contributors = existing_contributors
    else:
        if not item.price:
            raise HTTPException(status_code=400, detail="У подарка нет цены для частичного бронирования")
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Сумма должна быть положительной")

        amount_decimal = Decimal(str(amount))
        price_decimal = Decimal(str(item.price))
        new_collected = current_collected + amount_decimal

        if new_collected > price_decimal:
            remaining = price_decimal - current_collected
            raise HTTPException(status_code=400, detail=f"Сумма превышает оставшуюся. Макс: {float(remaining)}")

        item.collected_amount = new_collected
        existing_contributors.append({"name": reserver_name, "amount": float(amount_decimal)})
        item.contributors = existing_contributors
        all_names = list(dict.fromkeys(c["name"] for c in existing_contributors))
        item.reserved_by_name = ", ".join(all_names)
        if not item.reserved_by_id and current_user:
            item.reserved_by_id = current_user.id

        if new_collected >= price_decimal:
            item.is_reserved = True

    if current_user:
        existing_reservation_result = await db.execute(
            select(Reservation).where(
                and_(
                    Reservation.item_id == item.id,
                    Reservation.user_id == current_user.id,
                    Reservation.status == ReservationStatusEnum.ACTIVE
                )
            )
        )
        existing_reservation = existing_reservation_result.scalar_one_or_none()

        if not existing_reservation:
            reservation = Reservation(
                item_id=item.id,
                user_id=current_user.id,
                status=ReservationStatusEnum.ACTIVE
            )
            db.add(reservation)

    await db.commit()
    await db.refresh(item)

    extra = {"item_id": item.id, "title": item.title}
    await _notify_share_token_viewers(wishlist, "item_reserved", extra)
    if current_user:
        await _notify_wishlist_viewers(db, wishlist, current_user, "item_reserved", extra)

    return item


@router.delete("/{item_id}/reserve", response_model=Item)
async def unreserve_item(
    item_id: int,
    name: Optional[str] = Query(None, description="Name of contributor to remove (for partial unreserve)"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Unreserve an item. If name is provided — remove only that contributor."""
    result = await db.execute(
        select(ItemModel)
        .where(ItemModel.id == item_id)
        .with_for_update()
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    wishlist_result = await db.execute(select(WishlistModel).where(WishlistModel.id == item.wishlist_id))
    wishlist = wishlist_result.scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")

    existing_contributors = list(item.contributors or [])

    remove_name = None
    if current_user:
        remove_name = current_user.full_name or current_user.username
    elif name:
        remove_name = name.strip()

    if remove_name and len(existing_contributors) > 1:
        remaining = []
        removed_amount = 0.0
        for c in existing_contributors:
            if c["name"] == remove_name and removed_amount == 0:
                removed_amount = float(c.get("amount", 0))
            else:
                remaining.append(c)

        if removed_amount == 0 and not remaining:
            remaining = []

        if remaining:
            item.contributors = remaining
            new_collected = Decimal(sum(Decimal(str(c.get("amount", 0))) for c in remaining))
            item.collected_amount = new_collected
            all_names = list(dict.fromkeys(c["name"] for c in remaining))
            item.reserved_by_name = ", ".join(all_names)
            item.is_reserved = bool(item.price and new_collected >= Decimal(str(item.price)))
        else:
            item.is_reserved = False
            item.reserved_by_id = None
            item.reserved_by_name = None
            item.collected_amount = 0
            item.contributors = []
    else:
        item.is_reserved = False
        item.reserved_by_id = None
        item.reserved_by_name = None
        item.collected_amount = 0
        item.contributors = []

    if current_user:
        reservation_result = await db.execute(
            select(Reservation).where(
                and_(
                    Reservation.item_id == item_id,
                    Reservation.user_id == current_user.id,
                    Reservation.status == ReservationStatusEnum.ACTIVE
                )
            )
        )
        reservation = reservation_result.scalar_one_or_none()
        if reservation:
            reservation.status = ReservationStatusEnum.CANCELLED
            reservation.cancelled_at = func.now()

    await db.commit()
    await db.refresh(item)

    extra = {"item_id": item.id, "title": item.title}
    await _notify_share_token_viewers(wishlist, "item_unreserved", extra)
    if current_user:
        await _notify_wishlist_viewers(db, wishlist, current_user, "item_unreserved", extra)

    return item


@router.get("/{item_id}", response_model=Item)
async def get_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific item"""
    result = await db.execute(
        select(ItemModel).where(ItemModel.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.patch("/{item_id}", response_model=Item)
async def update_item(
    item_id: int,
    item_data: ItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an item"""
    result = await db.execute(
        select(ItemModel).where(ItemModel.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    wishlist = await _get_owned_wishlist(db, item.wishlist_id, current_user.id)

    update_data = item_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)

    await _notify_wishlist_viewers(db, wishlist, current_user, "item_updated", {
        "item_id": item.id,
        "title": item.title,
    })
    await _notify_share_token_viewers(wishlist, "item_updated", {"item_id": item.id, "title": item.title})

    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an item"""
    result = await db.execute(
        select(ItemModel).where(ItemModel.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    wishlist = await _get_owned_wishlist(db, item.wishlist_id, current_user.id)

    item_title = item.title
    item_item_id = item.id
    await db.delete(item)
    await db.commit()

    await _notify_wishlist_viewers(db, wishlist, current_user, "item_deleted", {
        "item_id": item_item_id,
        "title": item_title,
    })
    await _notify_share_token_viewers(wishlist, "item_deleted", {"item_id": item_item_id, "title": item_title})


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _get_owned_wishlist(db: AsyncSession, wishlist_id: int, user_id: int) -> WishlistModel:
    """Get wishlist and verify ownership"""
    result = await db.execute(
        select(WishlistModel).where(WishlistModel.id == wishlist_id)
    )
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    if wishlist.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Not your wishlist")
    return wishlist


async def _notify_share_token_viewers(wishlist: WishlistModel, action: str, extra: dict = None):
    """Send WS notification to anonymous viewers connected via share_token"""
    if not wishlist.share_token:
        return
    channel = f"share_{wishlist.share_token}"
    message = json.dumps({
        "type": "wishlist_item",
        "action": action,
        "wishlist_id": wishlist.id,
        **(extra or {}),
    })
    await manager.send_personal_message(message, channel)


async def _notify_wishlist_viewers(
    db: AsyncSession,
    wishlist: WishlistModel,
    current_user: User,
    action: str,
    extra: dict = None,
):
    """Send WebSocket notification to friends (excluding owner for reservation actions)"""
    result = await db.execute(
        select(FriendshipModel).where(
            and_(
                or_(
                    FriendshipModel.user_id == wishlist.owner_id,
                    FriendshipModel.friend_id == wishlist.owner_id,
                ),
                FriendshipModel.status == FriendshipStatusEnum.ACCEPTED,
            )
        )
    )
    friendships = result.scalars().all()

    message_data = {
        "type": "wishlist_item",
        "action": action,
        "wishlist_id": wishlist.id,
        "owner_id": wishlist.owner_id,
        "from_user_id": current_user.id,
        "from_username": current_user.username,
        **(extra or {}),
    }
    message = json.dumps(message_data)

    notified = set()
    for friendship in friendships:
        friend_id = friendship.friend_id if friendship.user_id == wishlist.owner_id else friendship.user_id
        if friend_id not in notified:
            await manager.send_personal_message(message, str(friend_id))
            notified.add(friend_id)

    # For non-reservation actions, also notify owner
    if action not in ("item_reserved", "item_unreserved"):
        if wishlist.owner_id not in notified:
            await manager.send_personal_message(message, str(wishlist.owner_id))

    if current_user.id not in notified and current_user.id != wishlist.owner_id:
        await manager.send_personal_message(message, str(current_user.id))


# ── Parser ─────────────────────────────────────────────────────────────────────

@router.post("/parse-url", response_model=ParsedProductData)
async def parse_product_url(
    request: ParseProductRequest,
    current_user: User = Depends(get_current_user),
):
    """Parse product data from a URL"""
    try:
        data = await parse_product_from_url(str(request.url))
        return data
    except ProductParserError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
