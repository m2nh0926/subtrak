from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.price_history import PriceHistory
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.price_history import PriceHistoryCreate, PriceHistoryResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/subscriptions", tags=["price-history"])


@router.get("/{sub_id}/price-history", response_model=list[PriceHistoryResponse])
async def list_price_history(
    sub_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Subscription).where(Subscription.id == sub_id, Subscription.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="구독을 찾을 수 없습니다")

    result = await db.execute(
        select(PriceHistory)
        .where(PriceHistory.subscription_id == sub_id)
        .order_by(PriceHistory.changed_at.desc())
    )
    return result.scalars().all()


@router.post("/{sub_id}/price-history", response_model=PriceHistoryResponse, status_code=201)
async def create_price_history(
    sub_id: int,
    data: PriceHistoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Subscription).where(Subscription.id == sub_id, Subscription.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="구독을 찾을 수 없습니다")

    record = PriceHistory(subscription_id=sub_id, **data.model_dump())
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record
