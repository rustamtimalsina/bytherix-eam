import uuid
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints

# Names are trimmed. Passwords are NOT trimmed: spaces may be part of a password.
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]


class SignupRequest(BaseModel):
    full_name: Name
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    organization_name: Name


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str


class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    plan: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut
    organization: OrganizationOut
    role: str


class MeResponse(BaseModel):
    user: UserOut
    organization: OrganizationOut
    role: str
