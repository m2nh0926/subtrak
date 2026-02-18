from datetime import date, timedelta
from decimal import Decimal

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.calendar import CalendarEvent, CalendarMonth
from app.services.auth import get_current_user

router = APIRouter(prefix="/calendar", tags=["calendar"])


def _get_payments_in_month(sub: Subscription, year: int, month: int) -> list[date]:
    """Calculate all payment dates for a subscription within a given month."""
    month_start = date(year, month, 1)
    if month == 12:
        month_end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = date(year, month + 1, 1) - timedelta(days=1)

    dates: list[date] = []
    payment_date = sub.next_payment_date

    if sub.billing_cycle == "monthly":
        step = relativedelta(months=1)
    elif sub.billing_cycle == "yearly":
        step = relativedelta(years=1)
    elif sub.billing_cycle == "weekly":
        step = timedelta(weeks=1)
    elif sub.billing_cycle == "quarterly":
        step = relativedelta(months=3)
    else:
        step = relativedelta(months=1)

    # Go backward from next_payment_date to find earliest relevant date
    current = payment_date
    while current > month_start:
        current = current - step
    if current < month_start:
        current = current + step

    # Collect all dates in the month
    while current <= month_end:
        if current >= month_start:
            dates.append(current)
        current = current + step

    return dates


@router.get("/{year}/{month}", response_model=CalendarMonth)
async def get_calendar_month(
    year: int,
    month: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == current_user.id, Subscription.is_active.is_(True))
    )
    subs = result.scalars().all()

    events: list[CalendarEvent] = []
    total = Decimal("0")

    for sub in subs:
        payment_dates = _get_payments_in_month(sub, year, month)
        for d in payment_dates:
            events.append(
                CalendarEvent(
                    subscription_id=sub.id,
                    subscription_name=sub.name,
                    amount=sub.amount,
                    currency=sub.currency,
                    date=d.isoformat(),
                    logo_url=sub.logo_url,
                )
            )
            total += sub.amount

    events.sort(key=lambda e: e.date)

    return CalendarMonth(year=year, month=month, events=events, total_amount=total)
