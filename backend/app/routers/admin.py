from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.category import Category
from app.models.payment_method import PaymentMethod
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.admin import (
    AdminCategoryStats,
    AdminDashboard,
    AdminRecentUser,
    AdminSubscriptionStats,
    AdminTopCard,
    AdminTopService,
    AdminUserSummary,
)
from app.services.auth import get_admin_user

router = APIRouter(prefix="/admin", tags=["admin"])


def _monthly_amount(amount: Decimal, billing_cycle: str) -> Decimal:
    if billing_cycle == "monthly":
        return amount
    if billing_cycle == "yearly":
        return amount / 12
    if billing_cycle == "weekly":
        return amount * Decimal("4.33")
    if billing_cycle == "quarterly":
        return amount / 3
    return amount


@router.get("/dashboard", response_model=AdminDashboard)
async def admin_dashboard(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # --- User summary ---
    total_users = await db.scalar(select(func.count(User.id))) or 0
    active_users = await db.scalar(
        select(func.count(User.id)).where(User.is_active.is_(True))
    ) or 0
    new_users_this_month = await db.scalar(
        select(func.count(User.id)).where(User.created_at >= month_start)
    ) or 0

    user_summary = AdminUserSummary(
        total_users=total_users,
        active_users=active_users,
        new_users_this_month=new_users_this_month,
    )

    # --- Subscription stats ---
    total_subs = await db.scalar(select(func.count(Subscription.id))) or 0
    active_subs = await db.scalar(
        select(func.count(Subscription.id)).where(Subscription.is_active.is_(True))
    ) or 0

    # Get all active subs for monthly revenue calc
    result = await db.execute(
        select(Subscription.amount, Subscription.billing_cycle).where(
            Subscription.is_active.is_(True)
        )
    )
    active_sub_rows = result.all()
    total_monthly = sum(_monthly_amount(row[0], row[1]) for row in active_sub_rows)
    avg_per_user = total_monthly / active_users if active_users > 0 else Decimal("0")

    subscription_stats = AdminSubscriptionStats(
        total_subscriptions=total_subs,
        active_subscriptions=active_subs,
        total_monthly_revenue=total_monthly,
        avg_monthly_per_user=avg_per_user,
    )

    # --- Top services (most subscribed) ---
    top_svc_result = await db.execute(
        select(
            Subscription.name,
            func.count(Subscription.id).label("count"),
        )
        .where(Subscription.is_active.is_(True))
        .group_by(Subscription.name)
        .order_by(func.count(Subscription.id).desc())
        .limit(10)
    )
    # Need to also get monthly amounts per service
    top_services = []
    for row in top_svc_result.all():
        svc_amount_result = await db.execute(
            select(Subscription.amount, Subscription.billing_cycle).where(
                Subscription.is_active.is_(True),
                Subscription.name == row[0],
            )
        )
        svc_total = sum(
            _monthly_amount(r[0], r[1]) for r in svc_amount_result.all()
        )
        top_services.append(
            AdminTopService(name=row[0], count=row[1], total_monthly_amount=svc_total)
        )

    # --- Top card types ---
    top_card_result = await db.execute(
        select(
            PaymentMethod.card_type,
            func.count(PaymentMethod.id).label("count"),
        )
        .where(PaymentMethod.is_active.is_(True))
        .group_by(PaymentMethod.card_type)
        .order_by(func.count(PaymentMethod.id).desc())
        .limit(10)
    )
    top_cards = []
    for row in top_card_result.all():
        # Get subscriptions linked to this card type
        card_ids_result = await db.execute(
            select(PaymentMethod.id).where(
                PaymentMethod.card_type == row[0],
                PaymentMethod.is_active.is_(True),
            )
        )
        card_ids = [r[0] for r in card_ids_result.all()]
        card_subs_result = await db.execute(
            select(Subscription.amount, Subscription.billing_cycle).where(
                Subscription.is_active.is_(True),
                Subscription.payment_method_id.in_(card_ids) if card_ids else False,
            )
        )
        card_total = sum(
            _monthly_amount(r[0], r[1]) for r in card_subs_result.all()
        )
        top_cards.append(
            AdminTopCard(card_type=row[0], count=row[1], total_monthly_amount=card_total)
        )

    # --- Category stats ---
    cat_result = await db.execute(
        select(
            Category.name,
            func.count(Subscription.id).label("sub_count"),
        )
        .join(Subscription, Subscription.category_id == Category.id, isouter=True)
        .where(Subscription.is_active.is_(True))
        .group_by(Category.id, Category.name)
        .order_by(func.count(Subscription.id).desc())
    )
    category_stats = []
    for row in cat_result.all():
        # Get monthly total for this category
        cat_subs_result = await db.execute(
            select(Subscription.amount, Subscription.billing_cycle)
            .join(Category, Subscription.category_id == Category.id)
            .where(
                Subscription.is_active.is_(True),
                Category.name == row[0],
            )
        )
        cat_total = sum(
            _monthly_amount(r[0], r[1]) for r in cat_subs_result.all()
        )
        category_stats.append(
            AdminCategoryStats(
                category_name=row[0],
                subscription_count=row[1],
                total_monthly_amount=cat_total,
            )
        )

    # --- Recent users ---
    recent_result = await db.execute(
        select(User).order_by(User.created_at.desc()).limit(10)
    )
    recent_users_raw = recent_result.scalars().all()
    recent_users = []
    for u in recent_users_raw:
        sub_count = await db.scalar(
            select(func.count(Subscription.id)).where(Subscription.user_id == u.id)
        ) or 0
        recent_users.append(
            AdminRecentUser(
                id=u.id,
                name=u.name,
                email=u.email,
                created_at=u.created_at,
                subscription_count=sub_count,
            )
        )

    return AdminDashboard(
        user_summary=user_summary,
        subscription_stats=subscription_stats,
        top_services=top_services,
        top_cards=top_cards,
        category_stats=category_stats,
        recent_users=recent_users,
    )


@router.post("/promote/{user_id}", status_code=200)
async def promote_to_admin(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    user.is_admin = True
    await db.flush()
    return {"message": f"{user.email}을(를) 관리자로 승격했습니다"}


@router.post("/demote/{user_id}", status_code=200)
async def demote_from_admin(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="자기 자신의 관리자 권한은 해제할 수 없습니다")
    user.is_admin = False
    await db.flush()
    return {"message": f"{user.email}의 관리자 권한을 해제했습니다"}
