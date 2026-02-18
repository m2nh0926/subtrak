from datetime import datetime

from pydantic import BaseModel


class CategoryBase(BaseModel):
    name: str
    color: str = "#6366f1"
    icon: str | None = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    icon: str | None = None


class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
