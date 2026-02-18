from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class PriceHistoryCreate(BaseModel):
    old_amount: Decimal
    new_amount: Decimal
    old_currency: str = "KRW"
    new_currency: str = "KRW"
    notes: str | None = None


class PriceHistoryResponse(BaseModel):
    id: int
    subscription_id: int
    old_amount: Decimal
    new_amount: Decimal
    old_currency: str
    new_currency: str
    changed_at: datetime
    notes: str | None = None

    model_config = {"from_attributes": True}
