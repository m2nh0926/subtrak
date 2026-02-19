from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    card_last_four: Mapped[str | None] = mapped_column(String(4), nullable=True)
    card_type: Mapped[str] = mapped_column(String(20), default="credit")
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Codef 연동 카드인 경우 bank_connections 테이블과 연결
    bank_connection_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("bank_connections.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, onupdate=func.now(), nullable=True
    )

    user = relationship("User", back_populates="payment_methods")
    subscriptions = relationship("Subscription", back_populates="payment_method")
    bank_connection = relationship("BankConnection", foreign_keys=[bank_connection_id])
