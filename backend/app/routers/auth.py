from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.models.category import Category
from app.models.user import User
from app.schemas.user import (
    AdminBootstrap,
    TokenRefresh,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
    UserUpdate,
)
from app.services.auth import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    from app.services.seed import create_default_categories

    await create_default_categories(db, user.id)

    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다"
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="비활성화된 계정입니다")

    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: TokenRefresh, db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(
            data.refresh_token, settings.JWT_SECRET_KEY, algorithms=["HS256"]
        )
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=401, detail="유효하지 않은 리프레시 토큰입니다"
            )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=401, detail="유효하지 않은 리프레시 토큰입니다"
            )
    except JWTError:
        raise HTTPException(
            status_code=401, detail="리프레시 토큰이 만료되었거나 유효하지 않습니다"
        )

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="사용자를 찾을 수 없습니다")

    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/bootstrap-admin")
async def bootstrap_admin(
    data: AdminBootstrap,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """로그인한 유저를 JWT_SECRET_KEY로 인증하여 관리자로 승격합니다."""
    if data.secret_key != settings.JWT_SECRET_KEY:
        raise HTTPException(status_code=403, detail="시크릿 키가 올바르지 않습니다")
    current_user.is_admin = True
    await db.flush()
    await db.refresh(current_user)
    return {"message": f"{current_user.email}이(가) 관리자로 승격되었습니다"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.name is not None:
        current_user.name = data.name
    if data.password is not None:
        current_user.password_hash = hash_password(data.password)
    await db.flush()
    await db.refresh(current_user)
    return current_user
