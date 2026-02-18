"""
Codef API router for card registration and transaction scraping.

Endpoints:
- GET  /codef/status          - Check if Codef is configured
- GET  /codef/card-companies  - List supported card companies
- POST /codef/register-card   - Register a card via Codef
- POST /codef/scrape          - Scrape transactions from a registered card
- POST /codef/detect          - Detect subscriptions from scraped transactions
- POST /codef/import          - Import detected subscriptions
- DELETE /codef/connection/{id} - Remove a Codef card connection
"""

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.bank_connection import BankConnection
from app.models.payment_method import PaymentMethod
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.codef import (
    CodefCardOrg,
    CodefDetectResponse,
    CodefRegisterCardRequest,
    CodefRegisterCardResponse,
    CodefScrapeRequest,
    CodefScrapeResponse,
    CodefStatusResponse,
    CodefTransaction,
    DetectedSubscription,
)
from app.services.auth import get_current_user
from app.services.codef import CARD_ORGS, codef_client

router = APIRouter(prefix="/codef", tags=["codef"])


@router.get("/status", response_model=CodefStatusResponse)
async def get_codef_status():
    """Check if Codef API is configured and ready."""
    return CodefStatusResponse(
        configured=codef_client.is_configured,
        demo_mode="development" in codef_client.base_url,
        base_url=codef_client.base_url,
    )


@router.get("/card-companies", response_model=list[CodefCardOrg])
async def list_card_companies():
    """List supported card companies with their organization codes."""
    return [CodefCardOrg(code=code, name=name) for code, name in CARD_ORGS.items()]


@router.post("/register-card", response_model=CodefRegisterCardResponse)
async def register_card(
    data: CodefRegisterCardRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register a card via Codef and create a bank connection record."""
    if not codef_client.is_configured:
        raise HTTPException(status_code=503, detail="Codef API가 설정되지 않았습니다")

    org_name = CARD_ORGS.get(data.organization_code)
    if not org_name:
        raise HTTPException(status_code=400, detail="지원하지 않는 카드사 코드입니다")

    # Check if user already has a connection for this card company
    existing = await db.execute(
        select(BankConnection).where(
            BankConnection.user_id == current_user.id,
            BankConnection.organization_code == data.organization_code,
            BankConnection.provider == "codef",
            BankConnection.status == "connected",
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409, detail=f"{org_name}은(는) 이미 등록되어 있습니다"
        )

    # Check if user has existing connected_id from other card registrations
    existing_conn = await db.execute(
        select(BankConnection).where(
            BankConnection.user_id == current_user.id,
            BankConnection.provider == "codef",
            BankConnection.connected_id.isnot(None),
        )
    )
    existing_record = existing_conn.scalar_one_or_none()
    existing_connected_id = existing_record.connected_id if existing_record else None

    try:
        connected_id = await codef_client.register_card_and_get_connected_id(
            organization=data.organization_code,
            card_login_id=data.login_id,
            card_login_pw=data.login_password,
            birthday=data.birthday,
            existing_connected_id=existing_connected_id,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    # Create bank connection record
    conn = BankConnection(
        user_id=current_user.id,
        provider="codef",
        institution_name=org_name,
        organization_code=data.organization_code,
        connected_id=connected_id,
        status="connected",
    )
    db.add(conn)
    await db.flush()
    await db.refresh(conn)

    return CodefRegisterCardResponse(
        connected_id=connected_id,
        bank_connection_id=conn.id,
        organization_code=data.organization_code,
        organization_name=org_name,
    )


@router.post("/scrape", response_model=CodefScrapeResponse)
async def scrape_transactions(
    data: CodefScrapeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Scrape card transaction history from a registered card."""
    if not codef_client.is_configured:
        raise HTTPException(status_code=503, detail="Codef API가 설정되지 않았습니다")

    result = await db.execute(
        select(BankConnection).where(
            BankConnection.id == data.bank_connection_id,
            BankConnection.user_id == current_user.id,
            BankConnection.provider == "codef",
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="카드 연결 정보를 찾을 수 없습니다")

    if not conn.connected_id or not conn.organization_code:
        raise HTTPException(status_code=400, detail="Codef 연동 정보가 없습니다")

    try:
        transactions = await codef_client.scrape_transactions(
            connected_id=conn.connected_id,
            organization=conn.organization_code,
            months_back=data.months_back,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    # Update last_synced_at
    conn.last_synced_at = datetime.now()
    await db.flush()

    return CodefScrapeResponse(
        transactions=[
            CodefTransaction(
                date=tx["date"],
                time=tx["time"],
                merchant=tx["merchant"],
                amount=tx["amount"],
                status=tx["status"],
                card_name=tx["card_name"],
                card_no=tx["card_no"],
                category=tx["category"],
            )
            for tx in transactions
        ],
        total_count=len(transactions),
    )


@router.post("/detect", response_model=CodefDetectResponse)
async def detect_subscriptions(
    data: CodefScrapeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Scrape transactions and detect recurring subscription patterns."""
    if not codef_client.is_configured:
        raise HTTPException(status_code=503, detail="Codef API가 설정되지 않았습니다")

    result = await db.execute(
        select(BankConnection).where(
            BankConnection.id == data.bank_connection_id,
            BankConnection.user_id == current_user.id,
            BankConnection.provider == "codef",
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="카드 연결 정보를 찾을 수 없습니다")

    if not conn.connected_id or not conn.organization_code:
        raise HTTPException(status_code=400, detail="Codef 연동 정보가 없습니다")

    try:
        transactions = await codef_client.scrape_transactions(
            connected_id=conn.connected_id,
            organization=conn.organization_code,
            months_back=data.months_back,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    conn.last_synced_at = datetime.now()
    await db.flush()

    detected = codef_client.detect_subscriptions(transactions)

    return CodefDetectResponse(
        detected=[DetectedSubscription(**d) for d in detected],
        total_transactions_analyzed=len(transactions),
    )


from pydantic import BaseModel


class ImportSubscriptionItem(BaseModel):
    name: str
    amount: int
    billing_cycle: str = "monthly"
    billing_day: int = 1


class ImportRequest(BaseModel):
    bank_connection_id: int
    subscriptions: list[ImportSubscriptionItem]


class ImportResponse(BaseModel):
    imported: int
    skipped: int
    details: list[str]


@router.post("/import", response_model=ImportResponse)
async def import_detected_subscriptions(
    data: ImportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Import detected subscriptions as actual subscription records."""
    result = await db.execute(
        select(BankConnection).where(
            BankConnection.id == data.bank_connection_id,
            BankConnection.user_id == current_user.id,
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="카드 연결 정보를 찾을 수 없습니다")

    # Find or create payment method for this card
    pm_result = await db.execute(
        select(PaymentMethod).where(
            PaymentMethod.user_id == current_user.id,
            PaymentMethod.name == conn.institution_name,
        )
    )
    payment_method = pm_result.scalar_one_or_none()
    if not payment_method:
        payment_method = PaymentMethod(
            user_id=current_user.id,
            name=conn.institution_name,
            card_type="credit",
            is_active=True,
        )
        db.add(payment_method)
        await db.flush()
        await db.refresh(payment_method)

    imported = 0
    skipped = 0
    details: list[str] = []

    for sub_item in data.subscriptions:
        # Check if subscription with same name already exists
        existing = await db.execute(
            select(Subscription).where(
                Subscription.user_id == current_user.id,
                Subscription.name == sub_item.name,
                Subscription.is_active.is_(True),
            )
        )
        if existing.scalar_one_or_none():
            skipped += 1
            details.append(f"'{sub_item.name}' - 이미 등록된 구독")
            continue

        # Calculate next payment date based on billing day
        today = date.today()
        if today.day >= sub_item.billing_day:
            # Next payment is next month
            if today.month == 12:
                next_payment = date(today.year + 1, 1, sub_item.billing_day)
            else:
                next_payment = date(today.year, today.month + 1, sub_item.billing_day)
        else:
            next_payment = date(today.year, today.month, sub_item.billing_day)

        subscription = Subscription(
            user_id=current_user.id,
            name=sub_item.name,
            amount=sub_item.amount,
            currency="KRW",
            billing_cycle=sub_item.billing_cycle,
            billing_day=sub_item.billing_day,
            next_payment_date=next_payment,
            payment_method_id=payment_method.id,
            is_active=True,
            auto_renew=True,
            start_date=today,
        )
        db.add(subscription)
        imported += 1
        details.append(f"'{sub_item.name}' - ₩{sub_item.amount:,} ({sub_item.billing_cycle})")

    await db.flush()

    return ImportResponse(imported=imported, skipped=skipped, details=details)


@router.delete("/connection/{conn_id}", status_code=204)
async def delete_codef_connection(
    conn_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a Codef card connection."""
    result = await db.execute(
        select(BankConnection).where(
            BankConnection.id == conn_id,
            BankConnection.user_id == current_user.id,
            BankConnection.provider == "codef",
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="카드 연결 정보를 찾을 수 없습니다")

    # Try to delete from Codef as well
    if conn.connected_id and conn.organization_code:
        try:
            await codef_client.delete_account(
                connected_id=conn.connected_id,
                organization=conn.organization_code,
            )
        except Exception:
            pass  # Best-effort Codef cleanup

    await db.delete(conn)
