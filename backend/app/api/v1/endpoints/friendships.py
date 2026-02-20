"""
Friendship endpoints
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from typing import List
from datetime import datetime
import json

from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User as UserModel
from app.models.friendship import Friendship as FriendshipModel, FriendshipStatusEnum
from app.schemas.friendship import FriendshipCreate, FriendshipWithUser, FriendshipUpdate
from app.schemas.user import UserPublic
from app.api.v1.endpoints.websocket import manager

router = APIRouter()


def _normalize_friendship_ids(user_id: int, friend_id: int):
    """Ensure user_id < friend_id for database constraint"""
    if user_id < friend_id:
        return user_id, friend_id, True  # current user is user_id
    else:
        return friend_id, user_id, False  # current user is friend_id


@router.post("/", response_model=FriendshipWithUser, status_code=status.HTTP_201_CREATED)
async def send_friend_request(
    friendship_data: FriendshipCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Send friend request"""
    if friendship_data.friend_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send friend request to yourself"
        )
    
    # Check if friend exists
    result = await db.execute(
        select(UserModel).where(UserModel.id == friendship_data.friend_id)
    )
    friend = result.scalar_one_or_none()
    if not friend:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Normalize IDs for database constraint
    user_id, friend_id, _ = _normalize_friendship_ids(current_user.id, friendship_data.friend_id)
    
    # Check if friendship already exists
    result = await db.execute(
        select(FriendshipModel).where(
            and_(
                FriendshipModel.user_id == user_id,
                FriendshipModel.friend_id == friend_id
            )
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        status_val = getattr(existing.status, "value", str(existing.status))
        status_pending = status_val == "pending"
        other_sent = existing.requester_id != current_user.id
        logging.info(
            "[Friendships] existing: status=%s requester=%d current=%d -> accept=%s",
            status_val, existing.requester_id, current_user.id, status_pending and other_sent
        )
        if status_pending and other_sent:
            existing.status = FriendshipStatusEnum.ACCEPTED
            existing.accepted_at = datetime.now()
            await db.commit()
            await db.refresh(existing)
            websocket_message = json.dumps({
                "type": "friend_request",
                "action": "updated",
                "status": "accepted",
                "from_user_id": current_user.id,
                "from_username": current_user.username,
                "friendship_id": existing.id
            })
            await manager.send_personal_message(websocket_message, str(friendship_data.friend_id))
            return FriendshipWithUser(
                id=existing.id,
                status=existing.status,
                friend=UserPublic.model_validate(friend),
                requested_at=existing.requested_at,
                accepted_at=existing.accepted_at
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Friendship request already exists"
        )
    
    # Create friendship
    db_friendship = FriendshipModel(
        user_id=user_id,
        friend_id=friend_id,
        requester_id=current_user.id,  # Track who sent the request
        status=FriendshipStatusEnum.PENDING
    )
    db.add(db_friendship)
    await db.commit()
    await db.refresh(db_friendship)
    
    # Send WebSocket notification to the friend
    websocket_message = json.dumps({
        "type": "friend_request",
        "action": "new",
        "from_user_id": current_user.id,
        "from_username": current_user.username,
        "friendship_id": db_friendship.id
    })
    await manager.send_personal_message(websocket_message, str(friendship_data.friend_id))
    
    # Return with friend info
    return FriendshipWithUser(
        id=db_friendship.id,
        status=db_friendship.status,
        friend=UserPublic.model_validate(friend),
        requested_at=db_friendship.requested_at,
        accepted_at=db_friendship.accepted_at
    )


@router.get("/requests", response_model=List[FriendshipWithUser])
async def get_friend_requests(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Get incoming friend requests (where someone else requested friendship with current user)"""
    result = await db.execute(
        select(FriendshipModel).where(
            and_(
                or_(
                    FriendshipModel.user_id == current_user.id,
                    FriendshipModel.friend_id == current_user.id
                ),
                FriendshipModel.requester_id != current_user.id,  # sent BY someone else
                FriendshipModel.status == FriendshipStatusEnum.PENDING
            )
        )
    )
    friendships = result.scalars().all()
    
    # Fetch requester info for each request
    friend_requests = []
    for friendship in friendships:
        result = await db.execute(
            select(UserModel).where(UserModel.id == friendship.requester_id)
        )
        requester = result.scalar_one()
        
        friend_requests.append(FriendshipWithUser(
            id=friendship.id,
            status=friendship.status,
            friend=UserPublic.model_validate(requester),
            requested_at=friendship.requested_at,
            accepted_at=friendship.accepted_at
        ))
    
    return friend_requests


@router.get("/", response_model=List[FriendshipWithUser])
async def get_friends(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Get all accepted friends"""
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
    
    # Fetch friend info for each friendship
    friends_list = []
    for friendship in friendships:
        # Determine who is the friend
        friend_id = friendship.friend_id if friendship.user_id == current_user.id else friendship.user_id
        
        result = await db.execute(
            select(UserModel).where(UserModel.id == friend_id)
        )
        friend = result.scalar_one()
        
        friends_list.append(FriendshipWithUser(
            id=friendship.id,
            status=friendship.status,
            friend=UserPublic.model_validate(friend),
            requested_at=friendship.requested_at,
            accepted_at=friendship.accepted_at
        ))
    
    return friends_list


@router.patch("/{friendship_id}", response_model=FriendshipWithUser)
async def update_friendship(
    friendship_id: int,
    friendship_update: FriendshipUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Accept, reject or block friend request"""
    result = await db.execute(
        select(FriendshipModel).where(FriendshipModel.id == friendship_id)
    )
    friendship = result.scalar_one_or_none()
    
    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friendship not found"
        )
    
    # Check if current user is part of this friendship
    if current_user.id not in (friendship.user_id, friendship.friend_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this friendship"
        )
    
    # Update status
    friendship.status = friendship_update.status
    if friendship_update.status == FriendshipStatusEnum.ACCEPTED:
        friendship.accepted_at = datetime.now()
    
    await db.commit()
    await db.refresh(friendship)
    
    # Get friend info
    friend_id = friendship.friend_id if friendship.user_id == current_user.id else friendship.user_id
    result = await db.execute(
        select(UserModel).where(UserModel.id == friend_id)
    )
    friend = result.scalar_one()
    
    # Send WebSocket notification to the friend
    websocket_message = json.dumps({
        "type": "friend_request",
        "action": "updated",
        "status": friendship.status.value,
        "from_user_id": current_user.id,
        "from_username": current_user.username,
        "friendship_id": friendship.id
    })
    await manager.send_personal_message(websocket_message, str(friend_id))
    # Also notify current user (for other tabs/devices)
    await manager.send_personal_message(websocket_message, str(current_user.id))
    
    return FriendshipWithUser(
        id=friendship.id,
        status=friendship.status,
        friend=UserPublic.model_validate(friend),
        requested_at=friendship.requested_at,
        accepted_at=friendship.accepted_at
    )


@router.delete("/{friendship_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_friendship(
    friendship_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Delete friendship or reject friend request"""
    result = await db.execute(
        select(FriendshipModel).where(FriendshipModel.id == friendship_id)
    )
    friendship = result.scalar_one_or_none()
    
    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friendship not found"
        )
    
    # Check if current user is part of this friendship
    if current_user.id not in (friendship.user_id, friendship.friend_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this friendship"
        )
    
    # Get the other user's ID for WebSocket notification
    other_user_id = friendship.friend_id if friendship.user_id == current_user.id else friendship.user_id
    
    await db.delete(friendship)
    await db.commit()
    
    # Send WebSocket notification to both users
    websocket_message = json.dumps({
        "type": "friend_request",
        "action": "deleted",
        "from_user_id": current_user.id,
        "friendship_id": friendship_id
    })
    await manager.send_personal_message(websocket_message, str(other_user_id))
    await manager.send_personal_message(websocket_message, str(current_user.id))
    
    return None


@router.get("/status/{user_id}")
async def get_friendship_status(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Get friendship status with specific user"""
    if user_id == current_user.id:
        return {"status": "self"}
    
    user_id_norm, friend_id_norm, _ = _normalize_friendship_ids(current_user.id, user_id)
    
    result = await db.execute(
        select(FriendshipModel).where(
            and_(
                FriendshipModel.user_id == user_id_norm,
                FriendshipModel.friend_id == friend_id_norm
            )
        )
    )
    friendship = result.scalar_one_or_none()
    
    if not friendship:
        return {"status": "none", "friendship_id": None, "requested_by_me": False}
    
    return {
        "status": friendship.status.value,
        "friendship_id": friendship.id,
        "requested_by_me": friendship.requester_id == current_user.id
    }


@router.get("/stats/counts")
async def get_friendship_counts(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Get counts of friends and followers"""
    # Count friends (accepted friendships)
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
    friends_count = len(result.scalars().all())
    
    # Count followers (pending requests where others requested friendship with current user)
    # Followers are users who sent pending requests TO current user
    result = await db.execute(
        select(FriendshipModel).where(
            and_(
                or_(
                    FriendshipModel.user_id == current_user.id,
                    FriendshipModel.friend_id == current_user.id
                ),
                FriendshipModel.requester_id != current_user.id,  # Request was sent BY someone else
                FriendshipModel.status == FriendshipStatusEnum.PENDING
            )
        )
    )
    followers_count = len(result.scalars().all())
    
    return {
        "friends_count": friends_count,
        "followers_count": followers_count
    }


@router.get("/lists/followers", response_model=List[FriendshipWithUser])
async def get_followers(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Get list of followers (users who sent pending friend requests to current user)"""
    result = await db.execute(
        select(FriendshipModel).where(
            and_(
                or_(
                    FriendshipModel.user_id == current_user.id,
                    FriendshipModel.friend_id == current_user.id
                ),
                FriendshipModel.requester_id != current_user.id,  # Request sent BY someone else
                FriendshipModel.status == FriendshipStatusEnum.PENDING
            )
        )
    )
    friendships = result.scalars().all()
    
    # Fetch follower info for each request
    followers_list = []
    for friendship in friendships:
        # The follower is the requester
        result = await db.execute(
            select(UserModel).where(UserModel.id == friendship.requester_id)
        )
        follower = result.scalar_one()
        
        followers_list.append(FriendshipWithUser(
            id=friendship.id,
            status=friendship.status,
            friend=UserPublic.model_validate(follower),
            requested_at=friendship.requested_at,
            accepted_at=friendship.accepted_at
        ))
    
    return followers_list
