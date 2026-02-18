from fastapi import APIRouter, Depends, Query

from app.config import settings
from app.models.user import User
from app.services.auth import get_current_user
from app.services.logo import search_logo

router = APIRouter(prefix="/logo", tags=["logo"])


@router.get("/search")
async def logo_search(
    name: str = Query(..., min_length=1),
    _: User = Depends(get_current_user),
):
    return await search_logo(name, api_token=settings.LOGO_DEV_TOKEN or None)
