from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class UpcomingPayment(BaseModel):
    subscription_name: str
    amount: Decimal
    date: date
    days_until: int


class CategorySpending(BaseModel):
    category_name: str
    color: str
    total_amount: Decimal
    percentage: float


class CardSpending(BaseModel):
    card_name: str
    card_last_four: str | None
    total_amount: Decimal
    subscription_count: int


class DashboardSummary(BaseModel):
    total_monthly_cost: Decimal
    total_yearly_cost: Decimal
    active_count: int
    upcoming_payments: list[UpcomingPayment]
    category_breakdown: list[CategorySpending]
    card_breakdown: list[CardSpending]
    total_savings_from_cancellations: Decimal


class SavingsSummary(BaseModel):
    total_monthly_savings: Decimal
    total_cumulative_savings: Decimal
    cancellation_count: int
