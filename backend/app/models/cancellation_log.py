from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class CancellationLog(Base):
    __tablename__ = "cancellation_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    subscription_id: Mapped[int] = mapped_column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    cancelled_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    savings_per_month: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    subscription = relationship("Subscription", back_populates="cancellation_logs")
