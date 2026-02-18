from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class SharedSubscriptionBase(BaseModel):
    subscription_id: int
    platform_id: int
    my_role: str = "파티원"
    monthly_share_cost: Decimal
    total_members: int = 1
    party_status: str = "active"
    deposit_paid: Decimal | None = None
    platform_fee: Decimal | None = None
    external_id: str | None = None
    notes: str | None = None


class SharedSubscriptionCreate(SharedSubscriptionBase):
    pass


class SharedSubscriptionUpdate(BaseModel):
    my_role: str | None = None
    monthly_share_cost: Decimal | None = None
    total_members: int | None = None
    party_status: str | None = None
    deposit_paid: Decimal | None = None
    platform_fee: Decimal | None = None
    external_id: str | None = None
    notes: str | None = None


class SharedSubscriptionResponse(SharedSubscriptionBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class SharedSubscriptionWithDetails(SharedSubscriptionResponse):
    subscription_name: str | None = None
    platform_name: str | None = None
