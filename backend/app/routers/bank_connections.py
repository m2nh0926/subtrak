from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.bank_connection import BankConnection
from app.models.user import User
from app.schemas.bank_connection import BankConnectionCreate, BankConnectionResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/bank-connections", tags=["bank-connections"])


@router.get("/", response_model=list[BankConnectionResponse])
async def list_connections(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(BankConnection)
        .where(BankConnection.user_id == current_user.id)
        .order_by(BankConnection.institution_name)
    )
    return result.scalars().all()


@router.post("/", response_model=BankConnectionResponse, status_code=201)
async def create_connection(
    data: BankConnectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conn = BankConnection(
        user_id=current_user.id,
        provider=data.provider,
        institution_name=data.institution_name,
        account_identifier=data.account_identifier,
        access_token_encrypted=data.access_token,
        status="connected",
    )
    db.add(conn)
    await db.flush()
    await db.refresh(conn)
    return conn


@router.get("/{conn_id}", response_model=BankConnectionResponse)
async def get_connection(
    conn_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(BankConnection).where(
            BankConnection.id == conn_id, BankConnection.user_id == current_user.id
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="연결 정보를 찾을 수 없습니다")
    return conn


@router.delete("/{conn_id}", status_code=204)
async def delete_connection(
    conn_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(BankConnection).where(
            BankConnection.id == conn_id, BankConnection.user_id == current_user.id
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="연결 정보를 찾을 수 없습니다")
    await db.delete(conn)


@router.post("/{conn_id}/sync")
async def sync_connection(
    conn_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(BankConnection).where(
            BankConnection.id == conn_id, BankConnection.user_id == current_user.id
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="연결 정보를 찾을 수 없습니다")
    raise HTTPException(
        status_code=501,
        detail="Codef 연동은 API 키 설정 후 사용 가능합니다. https://codef.io 에서 API 키를 발급받으세요.",
    )
