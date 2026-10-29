from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash, verify_password
from app.core.tenant_context import get_current_user
from app.db.models.membership import Membership
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.auth import TokenResponse, UserCreate, UserLogin, UserOut
from app.services.organization_service import create_organization_with_owner

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(data: UserCreate, db: Session = Depends(get_db)):
    """Sign up a new user and create their initial organization (Section 7.1)."""
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists"
        )

    # 1. Create user
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        is_active=True
    )
    db.add(user)
    db.flush()

    # 2. Create organization and owner membership
    org, membership = create_organization_with_owner(
        db=db,
        user=user,
        organization_name=data.organization_name
    )

    # 3. Generate scoped JWT token
    token = create_access_token(
        subject=user.id,
        organization_id=org.id,
        role=membership.role
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
        organization_id=org.id,
        role=membership.role
    )


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate with email and password, establishing an organization session."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )

    # Find the user's active organization membership
    membership = db.query(Membership).filter(
        Membership.user_id == user.id,
        Membership.status == "active"
    ).first()

    org_id = membership.organization_id if membership else ""
    role = membership.role if membership else "viewer"

    token = create_access_token(
        subject=user.id,
        organization_id=org_id,
        role=role
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
        organization_id=org_id,
        role=role
    )


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    """Get the currently authenticated user profile."""
    return UserOut.model_validate(user)
