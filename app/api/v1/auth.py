
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentContext, get_current_context
from app.db.session import get_db

from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    MeResponse,
    OrganizationOut,
    SignupRequest,
    UserOut,
)

from app.services.auth_service import AuthResult, AuthService


router = APIRouter(prefix="/auth", tags=["auth"])


def _to_response(result: AuthResult) -> AuthResponse:
    """
    Convert the authentication service result into an API response.
    """
    return AuthResponse(
        access_token=result.access_token,
        expires_in=result.expires_in,
        user=UserOut.model_validate(result.user),
        organization=OrganizationOut.model_validate(result.organization),
        role=result.membership.role,
    )


@router.post(
    "/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
def signup(
    payload: SignupRequest,
    db: Session = Depends(get_db),
) -> AuthResponse:
    """
    Register a new user and create their initial organization.
    """
    result = AuthService(db).signup(payload)

    return _to_response(result)


@router.post(
    "/login",
    response_model=AuthResponse,
)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AuthResponse:
    """
    Authenticate a user and return an organization-scoped token.
    """

    # Behind a reverse proxy, configure trusted proxy headers
    # instead of manually trusting arbitrary X-Forwarded-For values.
    ip_address = (
        request.client.host
        if request.client
        else "unknown"
    )

    result = AuthService(db).login(payload, ip_address)

    return _to_response(result)


@router.get(
    "/me",
    response_model=MeResponse,
)
def me(
    ctx: CurrentContext = Depends(get_current_context),
) -> MeResponse:
    """
    Return the currently authenticated user and active organization.
    """
    return MeResponse(
        user=UserOut.model_validate(ctx.user),
        organization=OrganizationOut.model_validate(ctx.organization),
        role=ctx.membership.role,
    )
