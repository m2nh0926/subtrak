from decimal import Decimal

from pydantic import BaseModel


class CalendarEvent(BaseModel):
    subscription_id: int
    subscription_name: str
    amount: Decimal
    currency: str
    date: str
    logo_url: str | None = None


class CalendarMonth(BaseModel):
    year: int
    month: int
    events: list[CalendarEvent]
    total_amount: Decimal
