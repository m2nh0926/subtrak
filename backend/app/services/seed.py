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

SUBSCRIPTION_PRESETS: list[dict] = [
    # 영상/OTT
    {
        "name": "넷플릭스",
        "category": "영상/OTT",
        "billing_cycle": "monthly",
        "plans": [
            {"plan": "광고형 스탠다드", "amount": 5500},
            {"plan": "스탠다드", "amount": 13500},
            {"plan": "프리미엄", "amount": 17000},
        ],
    },
    {
        "name": "유튜브 프리미엄",
        "category": "영상/OTT",
        "billing_cycle": "monthly",
        "plans": [
            {"plan": "개인", "amount": 14900},
            {"plan": "가족", "amount": 23900},
            {"plan": "학생", "amount": 8900},
        ],
    },
    {
        "name": "디즈니+",
        "category": "영상/OTT",
        "billing_cycle": "monthly",
        "plans": [
            {"plan": "스탠다드", "amount": 9900},
            {"plan": "프리미엄", "amount": 13900},
        ],
    },
    {
        "name": "티빙",
        "category": "영상/OTT",
        "billing_cycle": "monthly",
        "plans": [
            {"plan": "광고형", "amount": 5500},
            {"plan": "스탠다드", "amount": 9900},
            {"plan": "프리미엄", "amount": 13900},
        ],
    },
    {
        "name": "웨이브",
        "category": "영상/OTT",
        "billing_cycle": "monthly",
        "plans": [
            {"plan": "스탠다드", "amount": 7900},
            {"plan": "프리미엄", "amount": 13900},
        ],
    },
    {
        "name": "쿠팡플레이",
        "category": "영상/OTT",
        "billing_cycle": "monthly",
        "plans": [{"plan": "로켓와우 포함", "amount": 7890}],
    },
    {
        "name": "왓챠",
        "category": "영상/OTT",
        "billing_cycle": "monthly",
        "plans": [{"plan": "베이직", "amount": 7900}],
    },
    {
        "name": "아마존 프라임 비디오",
        "category": "영상/OTT",
        "billing_cycle": "monthly",
        "plans": [{"plan": "기본", "amount": 5900}],
    },
    {
        "name": "Apple TV+",
        "category": "영상/OTT",
        "billing_cycle": "monthly",
        "plans": [{"plan": "기본", "amount": 9900}],
    },
    # 음악
    {
        "name": "스포티파이",
        "category": "음악",
        "billing_cycle": "monthly",
        "plans": [
            {"plan": "개인", "amount": 10900},
            {"plan": "듀오", "amount": 14900},
            {"plan": "가족", "amount": 16900},
            {"plan": "학생", "amount": 5900},
        ],
    },
    {
        "name": "애플 뮤직",
        "category": "음악",
        "billing_cycle": "monthly",
        "plans": [
            {"plan": "개인", "amount": 11000},
            {"plan": "가족", "amount": 16500},
            {"plan": "학생", "amount": 5500},
        ],
    },
    {
        "name": "멜론",
        "category": "음악",
        "billing_cycle": "monthly",
        "plans": [{"plan": "스트리밍", "amount": 10900}],
    },
    {
        "name": "지니뮤직",
        "category": "음악",
        "billing_cycle": "monthly",
        "plans": [
            {"plan": "스트리밍", "amount": 8000},
            {"plan": "프리미엄", "amount": 10900},
        ],
    },
    {
        "name": "플로(FLO)",
        "category": "음악",
        "billing_cycle": "monthly",
        "plans": [
            {"plan": "스트리밍", "amount": 7900},
            {"plan": "프리미엄", "amount": 10900},
        ],
    },
    {
        "name": "유튜브 뮤직",
        "category": "음악",
        "billing_cycle": "monthly",
        "plans": [
            {"plan": "개인", "amount": 10900},
            {"plan": "가족", "amount": 16900},
        ],
    },
    # 소프트웨어
    {
        "name": "Microsoft 365",
        "category": "소프트웨어",
        "billing_cycle": "monthly",
        "plans": [
            {"plan": "퍼스널", "amount": 8900},
            {"plan": "패밀리", "amount": 12900},
        ],
    },
    {
        "name": "Adobe Creative Cloud",
        "category": "소프트웨어",
        "billing_cycle": "monthly",
        "plans": [
            {"plan": "포토그래피", "amount": 13200},
            {"plan": "단일 앱", "amount": 30800},
            {"plan": "전체 앱", "amount": 77000},
        ],
    },
    {
        "name": "노션(Notion)",
        "category": "소프트웨어",
        "billing_cycle": "monthly",
        "plans": [{"plan": "플러스", "amount": 12000}],
    },
    {
        "name": "ChatGPT Plus",
        "category": "소프트웨어",
        "billing_cycle": "monthly",
        "plans": [
            {"plan": "Plus", "amount": 29000},
            {"plan": "Pro", "amount": 290000},
        ],
    },
    {
        "name": "Claude Pro",
        "category": "소프트웨어",
        "billing_cycle": "monthly",
        "plans": [{"plan": "Pro", "amount": 29000}],
    },
    {
        "name": "1Password",
        "category": "소프트웨어",
        "billing_cycle": "monthly",
        "plans": [{"plan": "개인", "amount": 4000}],
    },
    {
        "name": "GitHub",
        "category": "소프트웨어",
        "billing_cycle": "monthly",
        "plans": [
            {"plan": "Pro", "amount": 5500},
            {"plan": "Team", "amount": 5500},
        ],
    },
    {
        "name": "Figma",
        "category": "소프트웨어",
        "billing_cycle": "monthly",
        "plans": [{"plan": "Professional", "amount": 18000}],
    },
    {
        "name": "Canva",
        "category": "소프트웨어",
        "billing_cycle": "monthly",
        "plans": [{"plan": "Pro", "amount": 15000}],
    },
    # 클라우드/저장소
    {
        "name": "iCloud+",
        "category": "클라우드/저장소",
        "billing_cycle": "monthly",
        "plans": [
            {"plan": "50GB", "amount": 1100},
            {"plan": "200GB", "amount": 3300},
            {"plan": "2TB", "amount": 11900},
        ],
    },
    {
        "name": "Google One",
        "category": "클라우드/저장소",
        "billing_cycle": "monthly",
        "plans": [
            {"plan": "100GB", "amount": 2400},
            {"plan": "200GB", "amount": 3700},
            {"plan": "2TB", "amount": 13000},
        ],
    },
    {
        "name": "Dropbox",
        "category": "클라우드/저장소",
        "billing_cycle": "monthly",
        "plans": [{"plan": "Plus", "amount": 14400}],
    },
    # 게임
    {
        "name": "PlayStation Plus",
        "category": "게임",
        "billing_cycle": "monthly",
        "plans": [
            {"plan": "Essential", "amount": 6800},
            {"plan": "Extra", "amount": 11400},
            {"plan": "Premium", "amount": 16700},
        ],
    },
    {
        "name": "Xbox Game Pass",
        "category": "게임",
        "billing_cycle": "monthly",
        "plans": [
            {"plan": "Core", "amount": 6900},
            {"plan": "Standard", "amount": 12900},
            {"plan": "Ultimate", "amount": 18900},
        ],
    },
    {
        "name": "닌텐도 온라인",
        "category": "게임",
        "billing_cycle": "yearly",
        "plans": [
            {"plan": "개인", "amount": 23000},
            {"plan": "가족", "amount": 39000},
            {"plan": "개인 + 확장팩", "amount": 53000},
        ],
    },
    # 쇼핑/멤버십
    {
        "name": "쿠팡 로켓와우",
        "category": "쇼핑/멤버십",
        "billing_cycle": "monthly",
        "plans": [{"plan": "월간", "amount": 7890}],
    },
    {
        "name": "네이버 플러스 멤버십",
        "category": "쇼핑/멤버십",
        "billing_cycle": "monthly",
        "plans": [{"plan": "월간", "amount": 4900}],
    },
    {
        "name": "배민클럽",
        "category": "쇼핑/멤버십",
        "billing_cycle": "monthly",
        "plans": [{"plan": "월간", "amount": 4900}],
    },
    {
        "name": "SSG 유니버스클럽",
        "category": "쇼핑/멤버십",
        "billing_cycle": "yearly",
        "plans": [{"plan": "연간", "amount": 49000}],
    },
    {
        "name": "아마존 프라임",
        "category": "쇼핑/멤버십",
        "billing_cycle": "monthly",
        "plans": [{"plan": "월간", "amount": 5900}],
    },
    # 뉴스/미디어
    {
        "name": "리디셀렉트",
        "category": "뉴스/미디어",
        "billing_cycle": "monthly",
        "plans": [{"plan": "기본", "amount": 9900}],
    },
    {
        "name": "밀리의 서재",
        "category": "뉴스/미디어",
        "billing_cycle": "monthly",
        "plans": [{"plan": "기본", "amount": 9900}],
    },
    # 건강/피트니스
    {
        "name": "Apple Fitness+",
        "category": "건강/피트니스",
        "billing_cycle": "monthly",
        "plans": [{"plan": "월간", "amount": 11000}],
    },
    {
        "name": "나이키 런 클럽 프리미엄",
        "category": "건강/피트니스",
        "billing_cycle": "monthly",
        "plans": [{"plan": "월간", "amount": 5900}],
    },
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
