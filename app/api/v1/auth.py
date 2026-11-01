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
    return AuthResponse(
        access_token=result.access_token,
        expires_in=result.expires_in,
        user=UserOut.model_validate(result.user),
        organization=OrganizationOut.model_validate(result.organization),
        role=result.membership.role,
    )


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> AuthResponse:
    return _to_response(AuthService(db).signup(payload))


@router.post("/login", response_model=AuthResponse)
def login(
    payload: LoginRequest, request: Request, db: Session = Depends(get_db)
) -> AuthResponse:
    # NOTE: behind a reverse proxy this is the proxy's address. Configure your
    # server (e.g. uvicorn --proxy-headers --forwarded-allow-ips=<proxy ip>)
    # rather than trusting X-Forwarded-For yourself.
    ip_address = request.client.host if request.client else "unknown"
    return _to_response(AuthService(db).login(payload, ip_address))


@router.get("/me", response_model=MeResponse)
def me(ctx: CurrentContext = Depends(get_current_context)) -> MeResponse:
    return MeResponse(
        user=UserOut.model_validate(ctx.user),
        organization=OrganizationOut.model_validate(ctx.organization),
        role=ctx.membership.role,
    )
