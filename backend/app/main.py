import logging
import traceback
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

from app.config import settings
from app.db import Base, async_session, engine
from app.routers import (
    admin,
    auth,
    bank_connections,
    calendar_view,
    cancellation_logs,
    categories,
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
from app.services.scheduler import check_expiring_cards, check_upcoming_payments, update_next_payment_dates

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
