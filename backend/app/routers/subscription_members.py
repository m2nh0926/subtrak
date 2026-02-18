from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.subscription import Subscription
from app.models.subscription_member import SubscriptionMember
from app.models.user import User
from app.schemas.subscription_member import (
    SubscriptionMemberCreate,
    SubscriptionMemberResponse,
    SubscriptionMemberUpdate,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/subscriptions", tags=["subscription-members"])


async def _verify_subscription_owner(sub_id: int, user_id: int, db: AsyncSession) -> Subscription:
    result = await db.execute(
        select(Subscription).where(Subscription.id == sub_id, Subscription.user_id == user_id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="구독을 찾을 수 없습니다")
    return sub


@router.get("/{sub_id}/members", response_model=list[SubscriptionMemberResponse])
async def list_members(
    sub_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _verify_subscription_owner(sub_id, current_user.id, db)
    result = await db.execute(
        select(SubscriptionMember).where(SubscriptionMember.subscription_id == sub_id)
    )
    return result.scalars().all()


@router.post("/{sub_id}/members", response_model=SubscriptionMemberResponse, status_code=201)
async def add_member(
    sub_id: int,
    data: SubscriptionMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _verify_subscription_owner(sub_id, current_user.id, db)
    member = SubscriptionMember(subscription_id=sub_id, **data.model_dump())
    db.add(member)
    await db.flush()
    await db.refresh(member)
    return member


@router.put("/{sub_id}/members/{member_id}", response_model=SubscriptionMemberResponse)
async def update_member(
    sub_id: int,
    member_id: int,
    data: SubscriptionMemberUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _verify_subscription_owner(sub_id, current_user.id, db)
    result = await db.execute(
        select(SubscriptionMember).where(
            SubscriptionMember.id == member_id,
            SubscriptionMember.subscription_id == sub_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="멤버를 찾을 수 없습니다")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(member, key, value)
    await db.flush()
    await db.refresh(member)
    return member


@router.delete("/{sub_id}/members/{member_id}", status_code=204)
async def remove_member(
    sub_id: int,
    member_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _verify_subscription_owner(sub_id, current_user.id, db)
    result = await db.execute(
        select(SubscriptionMember).where(
            SubscriptionMember.id == member_id,
            SubscriptionMember.subscription_id == sub_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="멤버를 찾을 수 없습니다")
    await db.delete(member)
