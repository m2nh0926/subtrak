from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class SharedSubscription(Base):
    __tablename__ = "shared_subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    subscription_id: Mapped[int] = mapped_column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    platform_id: Mapped[int] = mapped_column(Integer, ForeignKey("sharing_platforms.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    my_role: Mapped[str] = mapped_column(String(20), default="파티원")  # 파티장 | 파티원
    monthly_share_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    total_members: Mapped[int] = mapped_column(Integer, default=1)
    party_status: Mapped[str] = mapped_column(String(20), default="active")  # active | matching | ended
    deposit_paid: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    platform_fee: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, onupdate=func.now(), nullable=True)

    subscription = relationship("Subscription", back_populates="shared_subscriptions")
    platform = relationship("SharingPlatform", back_populates="shared_subscriptions")
