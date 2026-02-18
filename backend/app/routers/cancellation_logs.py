from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models.cancellation_log import CancellationLog
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.cancellation_log import CancellationLogResponse
from app.schemas.dashboard import SavingsSummary
from app.services.auth import get_current_user

router = APIRouter(prefix="/cancellation-logs", tags=["cancellation-logs"])


@router.get("/", response_model=list[CancellationLogResponse])
async def list_cancellation_logs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CancellationLog)
        .join(Subscription, CancellationLog.subscription_id == Subscription.id)
        .options(selectinload(CancellationLog.subscription))
        .where(Subscription.user_id == current_user.id)
        .order_by(CancellationLog.cancelled_at.desc())
    )
    logs = result.scalars().all()
    return [
        CancellationLogResponse(
            id=log.id,
            subscription_id=log.subscription_id,
            cancelled_at=log.cancelled_at,
            reason=log.reason,
            savings_per_month=log.savings_per_month,
            subscription_name=log.subscription.name if log.subscription else None,
        )
        for log in logs
    ]


@router.get("/savings-summary", response_model=SavingsSummary)
async def savings_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(
            func.coalesce(func.sum(CancellationLog.savings_per_month), 0),
            func.count(CancellationLog.id),
        )
        .join(Subscription, CancellationLog.subscription_id == Subscription.id)
        .where(Subscription.user_id == current_user.id)
    )
    row = result.one()
    monthly_savings = row[0] or Decimal("0")
    count = row[1]
    return SavingsSummary(
        total_monthly_savings=monthly_savings,
        total_cumulative_savings=monthly_savings * 12,
        cancellation_count=count,
    )
