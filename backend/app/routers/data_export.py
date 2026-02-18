from fastapi import APIRouter, Depends, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import io

from app.db import get_db
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.data_export import ExportFormat, ImportResult
from app.services.auth import get_current_user
from app.services.csv_excel import (
    export_subscriptions_csv,
    export_subscriptions_xlsx,
    import_subscriptions_from_file,
)

router = APIRouter(prefix="/data", tags=["data-export"])


@router.get("/export/subscriptions")
async def export_subscriptions(
    format: ExportFormat = Query(default="csv"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == current_user.id)
        .order_by(Subscription.name)
    )
    subs = result.scalars().all()

    if format == "xlsx":
        content = export_subscriptions_xlsx(subs)
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=subscriptions.xlsx"},
        )
    else:
        content = export_subscriptions_csv(subs)
        return StreamingResponse(
            io.BytesIO(content.encode("utf-8-sig")),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": "attachment; filename=subscriptions.csv"},
        )


@router.post("/import/subscriptions", response_model=ImportResult)
async def import_subscriptions(
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await import_subscriptions_from_file(file, current_user.id, db)
