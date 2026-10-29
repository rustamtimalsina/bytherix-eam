from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)


class OrganizationOut(BaseModel):
    id: str
    name: str
    slug: str
    plan_tier: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: str = Field(default="viewer", description="Role to grant: admin, developer, analyst, viewer")


class MembershipOut(BaseModel):
    id: str
    user_id: str
    organization_id: str
    role: str
    status: str
    user_email: Optional[str] = None
    user_full_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AcceptInviteRequest(BaseModel):
    token: str
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2)
