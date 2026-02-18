from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class AdminUserSummary(BaseModel):
    total_users: int
    active_users: int
    new_users_this_month: int


class AdminSubscriptionStats(BaseModel):
    total_subscriptions: int
    active_subscriptions: int
    total_monthly_revenue: Decimal
    avg_monthly_per_user: Decimal


class AdminTopService(BaseModel):
    name: str
    count: int
    total_monthly_amount: Decimal


class AdminTopCard(BaseModel):
    card_type: str
    count: int
    total_monthly_amount: Decimal


class AdminCategoryStats(BaseModel):
    category_name: str
    subscription_count: int
    total_monthly_amount: Decimal


class AdminRecentUser(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime
    subscription_count: int

    model_config = {"from_attributes": True}


class AdminDashboard(BaseModel):
    user_summary: AdminUserSummary
    subscription_stats: AdminSubscriptionStats
    top_services: list[AdminTopService]
    top_cards: list[AdminTopCard]
    category_stats: list[AdminCategoryStats]
    recent_users: list[AdminRecentUser]
