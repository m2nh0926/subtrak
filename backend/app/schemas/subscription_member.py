from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class SubscriptionMemberBase(BaseModel):
    name: str
    email: str | None = None
    share_amount: Decimal | None = None
    share_percentage: float | None = None
    is_owner: bool = False


class SubscriptionMemberCreate(SubscriptionMemberBase):
    pass


class SubscriptionMemberUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    share_amount: Decimal | None = None
    share_percentage: float | None = None
    is_owner: bool | None = None


class SubscriptionMemberResponse(SubscriptionMemberBase):
    id: int
    subscription_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
