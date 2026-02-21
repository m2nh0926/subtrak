from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category

DEFAULT_CATEGORIES = [
    {"name": "영상/OTT", "color": "#ef4444"},
    {"name": "음악", "color": "#f97316"},
    {"name": "소프트웨어", "color": "#3b82f6"},
    {"name": "게임", "color": "#8b5cf6"},
    {"name": "클라우드/저장소", "color": "#06b6d4"},
    {"name": "쇼핑/멤버십", "color": "#ec4899"},
    {"name": "뉴스/미디어", "color": "#64748b"},
    {"name": "교육", "color": "#22c55e"},
    {"name": "건강/피트니스", "color": "#14b8a6"},
    {"name": "기타", "color": "#6b7280"},
]


async def create_default_categories(db: AsyncSession, user_id: int) -> None:
    for cat in DEFAULT_CATEGORIES:
        db.add(Category(user_id=user_id, name=cat["name"], color=cat["color"]))
    await db.flush()


async def seed_categories_for_existing_users(db: AsyncSession) -> None:
    from app.models.user import User

    users = (await db.execute(select(User))).scalars().all()
    for user in users:
        existing = await db.execute(
            select(Category).where(Category.user_id == user.id).limit(1)
        )
        if not existing.scalar_one_or_none():
            await create_default_categories(db, user.id)
