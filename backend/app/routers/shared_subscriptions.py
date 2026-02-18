from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models.shared_subscription import SharedSubscription
from app.models.user import User
from app.schemas.shared_subscription import (
    SharedSubscriptionCreate,
    SharedSubscriptionResponse,
    SharedSubscriptionUpdate,
    SharedSubscriptionWithDetails,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/shared-subscriptions", tags=["shared-subscriptions"])


@router.get("/", response_model=list[SharedSubscriptionWithDetails])
async def list_shared(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SharedSubscription)
        .options(selectinload(SharedSubscription.subscription), selectinload(SharedSubscription.platform))
        .where(SharedSubscription.user_id == current_user.id)
        .order_by(SharedSubscription.created_at.desc())
    )
    items = result.scalars().all()
    return [
        SharedSubscriptionWithDetails(
            **SharedSubscriptionResponse.model_validate(s).model_dump(),
            subscription_name=s.subscription.name if s.subscription else None,
            platform_name=s.platform.name if s.platform else None,
        )
        for s in items
    ]


@router.get("/{shared_id}", response_model=SharedSubscriptionWithDetails)
async def get_shared(
    shared_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SharedSubscription)
        .options(selectinload(SharedSubscription.subscription), selectinload(SharedSubscription.platform))
        .where(SharedSubscription.id == shared_id, SharedSubscription.user_id == current_user.id)
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="공유 구독을 찾을 수 없습니다")
    return SharedSubscriptionWithDetails(
        **SharedSubscriptionResponse.model_validate(s).model_dump(),
        subscription_name=s.subscription.name if s.subscription else None,
        platform_name=s.platform.name if s.platform else None,
    )


@router.post("/", response_model=SharedSubscriptionResponse, status_code=201)
async def create_shared(
    data: SharedSubscriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shared = SharedSubscription(user_id=current_user.id, **data.model_dump())
    db.add(shared)
    await db.flush()
    await db.refresh(shared)
    return shared


@router.put("/{shared_id}", response_model=SharedSubscriptionResponse)
async def update_shared(
    shared_id: int,
    data: SharedSubscriptionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SharedSubscription).where(
            SharedSubscription.id == shared_id, SharedSubscription.user_id == current_user.id
        )
    )
    shared = result.scalar_one_or_none()
    if not shared:
        raise HTTPException(status_code=404, detail="공유 구독을 찾을 수 없습니다")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(shared, key, value)
    await db.flush()
    await db.refresh(shared)
    return shared


@router.delete("/{shared_id}", status_code=204)
async def delete_shared(
    shared_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SharedSubscription).where(
            SharedSubscription.id == shared_id, SharedSubscription.user_id == current_user.id
        )
    )
    shared = result.scalar_one_or_none()
    if not shared:
        raise HTTPException(status_code=404, detail="공유 구독을 찾을 수 없습니다")
    await db.delete(shared)
