from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models.cancellation_log import CancellationLog
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.dashboard import (
    CardSpending, CategorySpending, DashboardSummary, UpcomingPayment,
)
from app.schemas.subscription import SubscriptionResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _monthly_amount(sub: Subscription) -> Decimal:
    if sub.billing_cycle == "monthly":
        return sub.amount
    if sub.billing_cycle == "yearly":
        return sub.amount / 12
    if sub.billing_cycle == "weekly":
        return sub.amount * Decimal("4.33")
    if sub.billing_cycle == "quarterly":
        return sub.amount / 3
    return sub.amount


@router.get("/summary", response_model=DashboardSummary)
async def get_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Subscription)
        .options(selectinload(Subscription.category), selectinload(Subscription.payment_method))
        .where(Subscription.is_active.is_(True), Subscription.user_id == current_user.id)
    )
    subs = result.scalars().all()

    total_monthly = sum(_monthly_amount(s) for s in subs)
    total_yearly = total_monthly * 12

    # Upcoming payments (next 30 days)
    today = date.today()
    upcoming = sorted(
        [s for s in subs if s.next_payment_date <= today + timedelta(days=30)],
        key=lambda s: s.next_payment_date,
    )
    upcoming_list = [
        UpcomingPayment(
            subscription_name=s.name,
            amount=s.amount,
            date=s.next_payment_date,
            days_until=(s.next_payment_date - today).days,
        )
        for s in upcoming
    ]

    # Category breakdown
    cat_map: dict[str, dict] = {}
    for s in subs:
        cat_name = s.category.name if s.category else "미분류"
        cat_color = s.category.color if s.category else "#94a3b8"
        if cat_name not in cat_map:
            cat_map[cat_name] = {"color": cat_color, "total": Decimal("0")}
        cat_map[cat_name]["total"] += _monthly_amount(s)
    category_breakdown = [
        CategorySpending(
            category_name=name,
            color=data["color"],
            total_amount=data["total"],
            percentage=float(data["total"] / total_monthly * 100) if total_monthly else 0,
        )
        for name, data in cat_map.items()
    ]

    # Card breakdown
    card_map: dict[int, dict] = {}
    for s in subs:
        if s.payment_method:
            pm_id = s.payment_method.id
            if pm_id not in card_map:
                card_map[pm_id] = {
                    "name": s.payment_method.name,
                    "last_four": s.payment_method.card_last_four,
                    "total": Decimal("0"),
                    "count": 0,
                }
            card_map[pm_id]["total"] += _monthly_amount(s)
            card_map[pm_id]["count"] += 1
    card_breakdown = [
        CardSpending(
            card_name=data["name"],
            card_last_four=data["last_four"],
            total_amount=data["total"],
            subscription_count=data["count"],
        )
        for data in card_map.values()
    ]

    # Total savings (scoped to user's subscriptions)
    savings_result = await db.execute(
        select(func.coalesce(func.sum(CancellationLog.savings_per_month), 0))
        .join(Subscription, CancellationLog.subscription_id == Subscription.id)
        .where(Subscription.user_id == current_user.id)
    )
    total_savings = savings_result.scalar() or Decimal("0")

    return DashboardSummary(
        total_monthly_cost=total_monthly,
        total_yearly_cost=total_yearly,
        active_count=len(subs),
        upcoming_payments=upcoming_list,
        category_breakdown=category_breakdown,
        card_breakdown=card_breakdown,
        total_savings_from_cancellations=total_savings,
    )


@router.get("/upcoming", response_model=list[UpcomingPayment])
async def get_upcoming(
    days: int = Query(default=30),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    cutoff = today + timedelta(days=days)
    result = await db.execute(
        select(Subscription)
        .where(
            Subscription.is_active.is_(True),
            Subscription.user_id == current_user.id,
            Subscription.next_payment_date <= cutoff,
        )
        .order_by(Subscription.next_payment_date)
    )
    subs = result.scalars().all()
    return [
        UpcomingPayment(
            subscription_name=s.name,
            amount=s.amount,
            date=s.next_payment_date,
            days_until=(s.next_payment_date - today).days,
        )
        for s in subs
    ]


@router.get("/card-change-checklist/{pm_id}", response_model=list[SubscriptionResponse])
async def card_change_checklist(
    pm_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Subscription)
        .where(
            Subscription.payment_method_id == pm_id,
            Subscription.user_id == current_user.id,
            Subscription.is_active.is_(True),
        )
        .order_by(Subscription.name)
    )
    return result.scalars().all()
