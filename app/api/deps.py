from dataclasses import dataclass

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.api.errors import AppError
from app.core.security import decode_access_token
from app.db.models import Membership, Organization, User
from app.db.session import get_db
from app.repositories.organization_repository import OrganizationRepository
from app.repositories.user_repository import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class CurrentContext:
    """Who is calling, and which organization (tenant) they are acting in.

    Both are derived from the database using the token's user id, never from
    anything the client sends about its organization.
    """

    user: User
    organization: Organization
    membership: Membership


def _not_authenticated(code: str = "NOT_AUTHENTICATED") -> AppError:
    return AppError(401, code, "Authentication required.")


def get_current_context(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> CurrentContext:
    if credentials is None:
        raise _not_authenticated()

    try:
        user_id = decode_access_token(credentials.credentials)
    except (jwt.PyJWTError, ValueError):
        raise _not_authenticated("INVALID_TOKEN")

    user = UserRepository(db).get_by_id(user_id)
    if user is None or not user.is_active:
        raise _not_authenticated("INVALID_TOKEN")

    membership = OrganizationRepository(db).get_active_membership(user.id)
    if membership is None:
        raise AppError(403, "NO_ORGANIZATION", "This account has no active organization.")

    return CurrentContext(user=user, organization=membership.organization, membership=membership)
