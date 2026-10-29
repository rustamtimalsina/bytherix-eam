from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class APIKeyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    scopes: str = Field(default="*", description="Comma-separated permission scopes or * for all")
    expires_in_days: Optional[int] = Field(default=None, ge=1, le=365)


class APIKeyOut(BaseModel):
    id: str
    organization_id: str
    name: str
    prefix: str
    scopes: str
    is_revoked: bool
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class APIKeyCreatedResponse(APIKeyOut):
    raw_key: str = Field(description="The full raw API key. Shown only once upon creation!")
