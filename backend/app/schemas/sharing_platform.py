from datetime import datetime

from pydantic import BaseModel


class SharingPlatformBase(BaseModel):
    name: str
    url: str | None = None
    logo_url: str | None = None
    description: str | None = None


class SharingPlatformCreate(SharingPlatformBase):
    pass


class SharingPlatformResponse(SharingPlatformBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
