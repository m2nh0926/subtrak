from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models.bank_connection import BankConnection
from app.models.payment_method import PaymentMethod
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.payment_method import (
    PaymentMethodCreate,
    PaymentMethodResponse,
    PaymentMethodUpdate,
    PaymentMethodWithSubscriptions,
)
from app.schemas.subscription import SubscriptionResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/payment-methods", tags=["payment-methods"])


@router.get("/", response_model=list[PaymentMethodResponse])
async def list_payment_methods(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PaymentMethod)
        .options(selectinload(PaymentMethod.bank_connection))
        .where(PaymentMethod.user_id == current_user.id)
        .order_by(PaymentMethod.name)
    )
    methods = result.scalars().all()
    response = []
    for m in methods:
        data = PaymentMethodResponse.model_validate(m).model_dump()
        if m.bank_connection:
            data["bank_connection_status"] = m.bank_connection.status
            data["bank_connection_last_synced_at"] = m.bank_connection.last_synced_at
        response.append(PaymentMethodResponse(**data))
    return response


@router.get("/expiring", response_model=list[PaymentMethodWithSubscriptions])
async def list_expiring_cards(
    days: int = Query(default=30),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cutoff = date.today() + timedelta(days=days)
    result = await db.execute(
        select(PaymentMethod)
        .options(selectinload(PaymentMethod.subscriptions))
        .where(PaymentMethod.user_id == current_user.id)
        .where(PaymentMethod.expiry_date <= cutoff)
        .where(PaymentMethod.expiry_date.isnot(None))
        .where(PaymentMethod.is_active.is_(True))
    )
    methods = result.scalars().all()
    response = []
    for m in methods:
        active_subs = [s for s in m.subscriptions if s.is_active]
        total = sum(s.amount for s in active_subs if s.billing_cycle == "monthly")
        total += sum(s.amount / 12 for s in active_subs if s.billing_cycle == "yearly")
        total += (
            sum(s.amount * 4 for s in active_subs if s.billing_cycle == "weekly") / 12
        )
        total += sum(
            s.amount / 3 for s in active_subs if s.billing_cycle == "quarterly"
        )
        response.append(
            PaymentMethodWithSubscriptions(
                **PaymentMethodResponse.model_validate(m).model_dump(),
                subscription_count=len(active_subs),
                total_monthly_cost=total,
            )
        )
    return response


@router.get("/{pm_id}", response_model=PaymentMethodResponse)
async def get_payment_method(
    pm_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PaymentMethod).where(
            PaymentMethod.id == pm_id, PaymentMethod.user_id == current_user.id
        )
    )
    pm = result.scalar_one_or_none()
    if not pm:
        raise HTTPException(status_code=404, detail="Payment method not found")
    return pm


@router.get("/{pm_id}/subscriptions", response_model=list[SubscriptionResponse])
async def get_card_subscriptions(
    pm_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Subscription).where(
            Subscription.payment_method_id == pm_id,
            Subscription.user_id == current_user.id,
            Subscription.is_active.is_(True),
        )
    )
    return result.scalars().all()


@router.post("/", response_model=PaymentMethodResponse, status_code=201)
async def create_payment_method(
    data: PaymentMethodCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pm = PaymentMethod(**data.model_dump(), user_id=current_user.id)
    db.add(pm)
    await db.flush()
    await db.refresh(pm)
    return pm


@router.put("/{pm_id}", response_model=PaymentMethodResponse)
async def update_payment_method(
    pm_id: int,
    data: PaymentMethodUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PaymentMethod).where(
            PaymentMethod.id == pm_id, PaymentMethod.user_id == current_user.id
        )
    )
    pm = result.scalar_one_or_none()
    if not pm:
        raise HTTPException(status_code=404, detail="Payment method not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(pm, key, value)
    await db.flush()
    await db.refresh(pm)
    return pm


@router.delete("/{pm_id}", status_code=204)
async def delete_payment_method(
    pm_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PaymentMethod).where(
            PaymentMethod.id == pm_id, PaymentMethod.user_id == current_user.id
        )
    )
    pm = result.scalar_one_or_none()
    if not pm:
        raise HTTPException(status_code=404, detail="Payment method not found")
    await db.delete(pm)


class MigrateRequest(BaseModel):
    subscription_ids: list[int] | None = None


@router.post("/{old_pm_id}/migrate/{new_pm_id}")
async def migrate_payment_method(
    old_pm_id: int,
    new_pm_id: int,
    body: MigrateRequest = MigrateRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify both payment methods belong to the user
    for pm_id in (old_pm_id, new_pm_id):
        result = await db.execute(
            select(PaymentMethod).where(
                PaymentMethod.id == pm_id, PaymentMethod.user_id == current_user.id
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=404, detail=f"결제수단 {pm_id}을(를) 찾을 수 없습니다"
            )

    query = select(Subscription).where(
        Subscription.payment_method_id == old_pm_id,
        Subscription.user_id == current_user.id,
        Subscription.is_active.is_(True),
    )
    if body.subscription_ids:
        query = query.where(Subscription.id.in_(body.subscription_ids))

    result = await db.execute(query)
    subs = result.scalars().all()
    count = 0
    for sub in subs:
        sub.payment_method_id = new_pm_id
        count += 1
    await db.flush()
    return {
        "migrated": count,
        "from_payment_method_id": old_pm_id,
        "to_payment_method_id": new_pm_id,
    }
