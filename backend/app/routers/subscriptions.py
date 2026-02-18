from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models.cancellation_log import CancellationLog
from app.models.price_history import PriceHistory
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.subscription import (
    SubscriptionCreate, SubscriptionResponse, SubscriptionUpdate, SubscriptionWithDetails,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("/", response_model=list[SubscriptionWithDetails])
async def list_subscriptions(
    is_active: bool | None = Query(default=None),
    category_id: int | None = Query(default=None),
    payment_method_id: int | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Subscription).options(
        selectinload(Subscription.category),
        selectinload(Subscription.payment_method),
    ).where(Subscription.user_id == current_user.id)
    if is_active is not None:
        query = query.where(Subscription.is_active == is_active)
    if category_id is not None:
        query = query.where(Subscription.category_id == category_id)
    if payment_method_id is not None:
        query = query.where(Subscription.payment_method_id == payment_method_id)
    query = query.order_by(Subscription.next_payment_date)
    result = await db.execute(query)
    subs = result.scalars().all()
    return [
        SubscriptionWithDetails(
            **SubscriptionResponse.model_validate(s).model_dump(),
            category_name=s.category.name if s.category else None,
            category_color=s.category.color if s.category else None,
            payment_method_name=s.payment_method.name if s.payment_method else None,
            payment_method_last_four=s.payment_method.card_last_four if s.payment_method else None,
        )
        for s in subs
    ]


@router.get("/{sub_id}", response_model=SubscriptionWithDetails)
async def get_subscription(
    sub_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Subscription)
        .options(selectinload(Subscription.category), selectinload(Subscription.payment_method))
        .where(Subscription.id == sub_id, Subscription.user_id == current_user.id)
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return SubscriptionWithDetails(
        **SubscriptionResponse.model_validate(s).model_dump(),
        category_name=s.category.name if s.category else None,
        category_color=s.category.color if s.category else None,
        payment_method_name=s.payment_method.name if s.payment_method else None,
        payment_method_last_four=s.payment_method.card_last_four if s.payment_method else None,
    )


@router.post("/", response_model=SubscriptionResponse, status_code=201)
async def create_subscription(
    data: SubscriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sub = Subscription(**data.model_dump(), user_id=current_user.id)
    db.add(sub)
    await db.flush()
    await db.refresh(sub)
    return sub


@router.put("/{sub_id}", response_model=SubscriptionResponse)
async def update_subscription(
    sub_id: int,
    data: SubscriptionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Subscription).where(Subscription.id == sub_id, Subscription.user_id == current_user.id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    update_data = data.model_dump(exclude_unset=True)

    # Auto-create price history if amount changed
    if "amount" in update_data and update_data["amount"] is not None and update_data["amount"] != sub.amount:
        price_record = PriceHistory(
            subscription_id=sub.id,
            old_amount=sub.amount,
            new_amount=update_data["amount"],
            old_currency=sub.currency,
            new_currency=update_data.get("currency", sub.currency),
        )
        db.add(price_record)

    for key, value in update_data.items():
        setattr(sub, key, value)
    await db.flush()
    await db.refresh(sub)
    return sub


@router.delete("/{sub_id}", status_code=204)
async def delete_subscription(
    sub_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Subscription).where(Subscription.id == sub_id, Subscription.user_id == current_user.id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    sub.is_active = False
    await db.flush()


class CancelRequest(BaseModel):
    reason: str | None = None


@router.post("/{sub_id}/cancel", status_code=200)
async def cancel_subscription(
    sub_id: int,
    body: CancelRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Subscription).where(Subscription.id == sub_id, Subscription.user_id == current_user.id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    log = CancellationLog(
        subscription_id=sub.id,
        reason=body.reason,
        savings_per_month=sub.amount if sub.billing_cycle == "monthly" else sub.amount / 12,
    )
    db.add(log)
    sub.is_active = False
    sub.auto_renew = False
    await db.flush()
    return {"message": "Subscription cancelled", "savings_per_month": float(log.savings_per_month or 0)}
