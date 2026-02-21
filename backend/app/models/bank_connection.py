from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class BankConnection(Base):
    __tablename__ = "bank_connections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String(30), default="codef")  # codef | manual
    institution_name: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # 신한카드, KB국민카드, etc.
    organization_code: Mapped[str | None] = mapped_column(
        String(10), nullable=True
    )  # Codef org code e.g. "0306"
    connected_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # Codef connectedId
    account_identifier: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # masked account/card number
    business_type: Mapped[str] = mapped_column(
        String(2), default="CD"
    )  # CD=카드, BK=은행
    card_no: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )  # Codef API 거래조회용 카드번호
    account_password: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )  # 은행 거래조회용 계좌비밀번호
    access_token_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="connected"
    )  # connected | disconnected | error
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="bank_connections")
