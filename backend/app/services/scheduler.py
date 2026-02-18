from datetime import date, timedelta
from dateutil.relativedelta import relativedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment_method import PaymentMethod
from app.models.subscription import Subscription
from app.services.notification import send_discord_webhook


async def check_upcoming_payments(db: AsyncSession, webhook_url: str) -> None:
    """Find subscriptions with next_payment_date within 3 days and send alert."""
    cutoff = date.today() + timedelta(days=3)
    result = await db.execute(
        select(Subscription)
        .where(Subscription.is_active.is_(True))
        .where(Subscription.next_payment_date <= cutoff)
        .where(Subscription.next_payment_date >= date.today())
    )
    subs = result.scalars().all()
    if subs:
        lines = [f"- **{s.name}**: {s.amount:,.0f} {s.currency} ({s.next_payment_date})" for s in subs]
        await send_discord_webhook(
            webhook_url,
            f"결제 예정 알림 ({len(subs)}건)",
            "\n".join(lines),
            color=0xFBBF24,
        )


async def check_expiring_cards(db: AsyncSession, webhook_url: str) -> None:
    """Find payment methods with expiry_date within 30 days."""
    cutoff = date.today() + timedelta(days=30)
    result = await db.execute(
        select(PaymentMethod)
        .where(PaymentMethod.expiry_date <= cutoff)
        .where(PaymentMethod.expiry_date >= date.today())
        .where(PaymentMethod.is_active.is_(True))
    )
    cards = result.scalars().all()
    if cards:
        lines = [f"- **{c.name}** (*{c.card_last_four}): 만료일 {c.expiry_date}" for c in cards]
        await send_discord_webhook(
            webhook_url,
            f"카드 만료 임박 ({len(cards)}건)",
            "\n".join(lines),
            color=0xEF4444,
        )


async def update_next_payment_dates(db: AsyncSession) -> None:
    """For subscriptions past their next_payment_date, calculate next one."""
    result = await db.execute(
        select(Subscription)
        .where(Subscription.is_active.is_(True))
        .where(Subscription.next_payment_date < date.today())
    )
    subs = result.scalars().all()
    for sub in subs:
        if sub.billing_cycle == "monthly":
            sub.next_payment_date = sub.next_payment_date + relativedelta(months=1)
        elif sub.billing_cycle == "yearly":
            sub.next_payment_date = sub.next_payment_date + relativedelta(years=1)
        elif sub.billing_cycle == "weekly":
            sub.next_payment_date = sub.next_payment_date + timedelta(weeks=1)
        elif sub.billing_cycle == "quarterly":
            sub.next_payment_date = sub.next_payment_date + relativedelta(months=3)
    await db.commit()
