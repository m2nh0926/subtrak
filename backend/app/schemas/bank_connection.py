from datetime import datetime

from pydantic import BaseModel


class BankConnectionBase(BaseModel):
    provider: str = "codef"
    institution_name: str
    organization_code: str | None = None
    account_identifier: str | None = None


class BankConnectionCreate(BankConnectionBase):
    access_token: str | None = None


class BankConnectionResponse(BankConnectionBase):
    id: int
    user_id: int
    connected_id: str | None = None
    status: str
    last_synced_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
