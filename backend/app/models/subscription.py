from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="KRW")
    billing_cycle: Mapped[str] = mapped_column(String(20), default="monthly")
    billing_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    next_payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    category_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("categories.id"), nullable=True)
    payment_method_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("payment_methods.id"), nullable=True)
    cancel_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancel_method: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, onupdate=func.now(), nullable=True)

    user = relationship("User", back_populates="subscriptions")
    category = relationship("Category", back_populates="subscriptions")
    payment_method = relationship("PaymentMethod", back_populates="subscriptions")
    cancellation_logs = relationship("CancellationLog", back_populates="subscription")
    price_history = relationship("PriceHistory", back_populates="subscription", order_by="PriceHistory.changed_at.desc()")
    members = relationship("SubscriptionMember", back_populates="subscription", cascade="all, delete-orphan")
    shared_subscriptions = relationship("SharedSubscription", back_populates="subscription")
