from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class CancellationLogCreate(BaseModel):
    subscription_id: int
    reason: str | None = None
    savings_per_month: Decimal | None = None


class CancellationLogResponse(BaseModel):
    id: int
    subscription_id: int
    cancelled_at: datetime
    reason: str | None = None
    savings_per_month: Decimal | None = None
    subscription_name: str | None = None

    model_config = {"from_attributes": True}
