from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class SubscriptionBase(BaseModel):
    name: str
    amount: Decimal
    currency: str = "KRW"
    billing_cycle: str = "monthly"
    billing_day: int | None = None
    next_payment_date: date
    category_id: int | None = None
    payment_method_id: int | None = None
    cancel_url: str | None = None
    cancel_method: str | None = None
    is_active: bool = True
    auto_renew: bool = True
    start_date: date
    logo_url: str | None = None
    notes: str | None = None


class SubscriptionCreate(SubscriptionBase):
    pass


class SubscriptionUpdate(BaseModel):
    name: str | None = None
    amount: Decimal | None = None
    currency: str | None = None
    billing_cycle: str | None = None
    billing_day: int | None = None
    next_payment_date: date | None = None
    category_id: int | None = None
    payment_method_id: int | None = None
    cancel_url: str | None = None
    cancel_method: str | None = None
    is_active: bool | None = None
    auto_renew: bool | None = None
    logo_url: str | None = None
    notes: str | None = None


class SubscriptionResponse(SubscriptionBase):
    id: int
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class SubscriptionWithDetails(SubscriptionResponse):
    category_name: str | None = None
    category_color: str | None = None
    payment_method_name: str | None = None
    payment_method_last_four: str | None = None
