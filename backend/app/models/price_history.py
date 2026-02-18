from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class PriceHistory(Base):
    __tablename__ = "price_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    subscription_id: Mapped[int] = mapped_column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    old_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    new_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    old_currency: Mapped[str] = mapped_column(String(3), default="KRW")
    new_currency: Mapped[str] = mapped_column(String(3), default="KRW")
    changed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    subscription = relationship("Subscription", back_populates="price_history")
