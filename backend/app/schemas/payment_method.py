from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class PaymentMethodBase(BaseModel):
    name: str
    card_last_four: str | None = None
    card_type: str = "credit"
    expiry_date: date | None = None
    is_active: bool = True
    notes: str | None = None


class PaymentMethodCreate(PaymentMethodBase):
    pass


class PaymentMethodUpdate(BaseModel):
    name: str | None = None
    card_last_four: str | None = None
    card_type: str | None = None
    expiry_date: date | None = None
    is_active: bool | None = None
    notes: str | None = None


class PaymentMethodResponse(PaymentMethodBase):
    id: int
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class PaymentMethodWithSubscriptions(PaymentMethodResponse):
    subscription_count: int = 0
    total_monthly_cost: Decimal = Decimal("0")
