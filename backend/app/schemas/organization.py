from datetime import datetime

from pydantic import BaseModel


class OrganizationBase(BaseModel):
    name: str


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationResponse(OrganizationBase):
    id: int
    owner_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class OrgMemberCreate(BaseModel):
    user_email: str
    role: str = "member"


class OrgMemberResponse(BaseModel):
    id: int
    organization_id: int
    user_id: int
    user_name: str | None = None
    user_email: str | None = None
    role: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class OrganizationWithMembers(OrganizationResponse):
    members: list[OrgMemberResponse] = []
