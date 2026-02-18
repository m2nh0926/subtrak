from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models.organization import OrgMember, Organization
from app.models.user import User
from app.schemas.organization import (
    OrgMemberCreate,
    OrgMemberResponse,
    OrganizationCreate,
    OrganizationResponse,
    OrganizationWithMembers,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/organizations", tags=["organizations"])


async def _get_org_as_owner(org_id: int, user_id: int, db: AsyncSession) -> Organization:
    result = await db.execute(
        select(Organization).where(Organization.id == org_id, Organization.owner_id == user_id)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="조직을 찾을 수 없습니다")
    return org


@router.get("/", response_model=list[OrganizationResponse])
async def list_organizations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Organization)
        .where(Organization.owner_id == current_user.id)
        .order_by(Organization.name)
    )
    return result.scalars().all()


@router.post("/", response_model=OrganizationResponse, status_code=201)
async def create_organization(
    data: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = Organization(name=data.name, owner_id=current_user.id)
    db.add(org)
    await db.flush()
    await db.refresh(org)
    owner_member = OrgMember(organization_id=org.id, user_id=current_user.id, role="admin")
    db.add(owner_member)
    await db.flush()
    return org


@router.get("/{org_id}", response_model=OrganizationWithMembers)
async def get_organization(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Organization)
        .options(selectinload(Organization.members).selectinload(OrgMember.user))
        .where(Organization.id == org_id, Organization.owner_id == current_user.id)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="조직을 찾을 수 없습니다")
    return OrganizationWithMembers(
        **OrganizationResponse.model_validate(org).model_dump(),
        members=[
            OrgMemberResponse(
                id=m.id,
                organization_id=m.organization_id,
                user_id=m.user_id,
                user_name=m.user.name if m.user else None,
                user_email=m.user.email if m.user else None,
                role=m.role,
                joined_at=m.joined_at,
            )
            for m in org.members
        ],
    )


@router.delete("/{org_id}", status_code=204)
async def delete_organization(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = await _get_org_as_owner(org_id, current_user.id, db)
    await db.delete(org)


@router.post("/{org_id}/members", response_model=OrgMemberResponse, status_code=201)
async def add_member(
    org_id: int,
    data: OrgMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_org_as_owner(org_id, current_user.id, db)

    result = await db.execute(select(User).where(User.email == data.user_email))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="해당 이메일의 사용자를 찾을 수 없습니다")

    existing = await db.execute(
        select(OrgMember).where(
            OrgMember.organization_id == org_id, OrgMember.user_id == target_user.id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="이미 조직에 포함된 사용자입니다")

    member = OrgMember(organization_id=org_id, user_id=target_user.id, role=data.role)
    db.add(member)
    await db.flush()
    await db.refresh(member)
    return OrgMemberResponse(
        id=member.id,
        organization_id=member.organization_id,
        user_id=member.user_id,
        user_name=target_user.name,
        user_email=target_user.email,
        role=member.role,
        joined_at=member.joined_at,
    )


@router.delete("/{org_id}/members/{member_id}", status_code=204)
async def remove_member(
    org_id: int,
    member_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_org_as_owner(org_id, current_user.id, db)
    result = await db.execute(
        select(OrgMember).where(OrgMember.id == member_id, OrgMember.organization_id == org_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="멤버를 찾을 수 없습니다")
    if member.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="조직 소유자는 제거할 수 없습니다")
    await db.delete(member)
