import logging
import traceback
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

from sqlalchemy import select

from app.config import settings
from app.db import Base, async_session, engine
from app.routers import (
    admin,
    auth,
    bank_connections,
    calendar_view,
    cancellation_logs,
    categories,
    codef,
    dashboard,
    data_export,
    logo,
    organizations,
    payment_methods,
    price_history,
    shared_subscriptions,
    sharing_platforms,
    subscription_members,
    subscriptions,
)
from app.services.scheduler import (
    check_expiring_cards,
    check_upcoming_payments,
    update_next_payment_dates,
)

scheduler = AsyncIOScheduler()


async def run_scheduled_tasks() -> None:
    async with async_session() as db:
        await update_next_payment_dates(db)
        await check_upcoming_payments(db, settings.DISCORD_WEBHOOK_URL)
        await check_expiring_cards(db, settings.DISCORD_WEBHOOK_URL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        from sqlalchemy import text

        migrations = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE",
            "UPDATE users SET is_admin = TRUE WHERE email = 'admin@admin.com'",
            "ALTER TABLE bank_connections ADD COLUMN IF NOT EXISTS organization_code VARCHAR(10)",
            "ALTER TABLE bank_connections ADD COLUMN IF NOT EXISTS connected_id VARCHAR(100)",
            "ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS bank_connection_id INTEGER REFERENCES bank_connections(id) ON DELETE SET NULL",
        ]
        for sql in migrations:
            try:
                await conn.execute(text(sql))
            except Exception:
                pass

    # 기존 Codef BankConnection 중 PaymentMethod가 없는 것들 자동 생성
    async with async_session() as session:
        try:
            from app.models.bank_connection import BankConnection
            from app.models.payment_method import PaymentMethod

            result = await session.execute(
                select(BankConnection).where(
                    BankConnection.provider == "codef",
                    BankConnection.status == "connected",
                )
            )
            connections = result.scalars().all()
            for bc in connections:
                existing = await session.execute(
                    select(PaymentMethod).where(
                        PaymentMethod.bank_connection_id == bc.id
                    )
                )
                if not existing.scalar_one_or_none():
                    pm = PaymentMethod(
                        user_id=bc.user_id,
                        name=bc.institution_name,
                        card_type="credit",
                        is_active=True,
                        bank_connection_id=bc.id,
                    )
                    session.add(pm)
            await session.commit()
        except Exception:
            await session.rollback()

    scheduler.add_job(run_scheduled_tasks, "cron", hour=9, minute=0)
    scheduler.start()

    yield

    scheduler.shutdown()


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://subtrak-eta.vercel.app",
        "https://subtrak.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Admin
app.include_router(admin.router, prefix="/api/v1")

# Auth (no prefix needed, router already has /auth)
app.include_router(auth.router, prefix="/api/v1")

# Core resources
app.include_router(subscriptions.router, prefix="/api/v1")
app.include_router(payment_methods.router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(cancellation_logs.router, prefix="/api/v1")

# Codef integration
app.include_router(codef.router, prefix="/api/v1")

# Phase 2: New routers
app.include_router(price_history.router, prefix="/api/v1")
app.include_router(subscription_members.router, prefix="/api/v1")
app.include_router(sharing_platforms.router, prefix="/api/v1")
app.include_router(shared_subscriptions.router, prefix="/api/v1")
app.include_router(organizations.router, prefix="/api/v1")
app.include_router(bank_connections.router, prefix="/api/v1")
app.include_router(data_export.router, prefix="/api/v1")
app.include_router(logo.router, prefix="/api/v1")
app.include_router(calendar_view.router, prefix="/api/v1")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}\n{traceback.format_exc()}")
    return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
