from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.sharing_platform import SharingPlatform
from app.models.user import User
from app.schemas.sharing_platform import SharingPlatformCreate, SharingPlatformResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/sharing-platforms", tags=["sharing-platforms"])

SEED_PLATFORMS = [
    {"name": "링키드", "url": "https://linkid.pw", "description": "구독 공유 플랫폼"},
    {"name": "피클플러스", "url": "https://pickle.plus", "description": "구독 공유 플랫폼"},
    {"name": "위즐", "url": "https://wizzle.co.kr", "description": "구독 공유 플랫폼"},
]


@router.get("/", response_model=list[SharingPlatformResponse])
async def list_platforms(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(SharingPlatform).order_by(SharingPlatform.name))
    platforms = result.scalars().all()
    if not platforms:
        for seed in SEED_PLATFORMS:
            platform = SharingPlatform(**seed)
            db.add(platform)
        await db.flush()
        result = await db.execute(select(SharingPlatform).order_by(SharingPlatform.name))
        platforms = result.scalars().all()
    return platforms


@router.post("/", response_model=SharingPlatformResponse, status_code=201)
async def create_platform(
    data: SharingPlatformCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(SharingPlatform).where(SharingPlatform.name == data.name))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="이미 등록된 플랫폼입니다")
    platform = SharingPlatform(**data.model_dump())
    db.add(platform)
    await db.flush()
    await db.refresh(platform)
    return platform
