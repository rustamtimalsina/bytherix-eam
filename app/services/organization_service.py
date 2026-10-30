from datetime import datetime, timedelta, timezone
import re
import secrets
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.permissions import Role
from app.core.security import get_password_hash
from app.db.models.membership import Membership
from app.db.models.organization import Organization
from app.db.models.user import User


def slugify(text: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", slug)


def create_organization_with_owner(
    db: Session,
    user: User,
    organization_name: str
) -> tuple[Organization, Membership]:
    """Create a new tenant organization and assign the creator as Owner transactionally (Section 7.1)."""
    base_slug = slugify(organization_name)
    slug = base_slug
    counter = 1
    while db.query(Organization).filter(Organization.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    org = Organization(
        name=organization_name,
        slug=slug,
        plan_tier="starter",
        is_active=True
    )
    db.add(org)
    db.flush()

    membership = Membership(
        user_id=user.id,
        organization_id=org.id,
        role=Role.OWNER.value,
        status="active"
    )
    db.add(membership)
    db.commit()
    db.refresh(org)
    db.refresh(membership)
    return org, membership


def invite_member(
    db: Session,
    organization_id: str,
    email: str,
    role: str
) -> Membership:
    """Invite a new member via time-limited, single-use token (Section 7.1)."""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        existing_mem = db.query(Membership).filter(
            Membership.user_id == existing_user.id,
            Membership.organization_id == organization_id
        ).first()
        if existing_mem and existing_mem.status == "active":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User is already an active member of this organization"
            )

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    # If user doesn't exist yet, create a placeholder user or save invitation
    if not existing_user:
        placeholder_user = User(
            email=email,
            full_name=email.split("@")[0],
            hashed_password=get_password_hash(secrets.token_hex(16)),  # Unusable temp password
            is_active=True
        )
        db.add(placeholder_user)
        db.flush()
        user_id = placeholder_user.id
    else:
        user_id = existing_user.id

    membership = Membership(
        user_id=user_id,
        organization_id=organization_id,
        role=role,
        status="invited",
        invitation_token=token,
        invitation_expires_at=expires_at
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


def accept_invite(
    db: Session,
    token: str,
    password: str,
    full_name: str
) -> tuple[User, Organization]:
    """Accept an invitation, set password, and activate membership."""
    membership = db.query(Membership).filter(
        Membership.invitation_token == token,
        Membership.status == "invited"
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invitation token"
        )

    if membership.invitation_expires_at:
        expires_at = membership.invitation_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation has expired"
            )

    user = db.query(User).filter(User.id == membership.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.full_name = full_name
    user.hashed_password = get_password_hash(password)
    user.is_active = True

    membership.status = "active"
    membership.invitation_token = None
    membership.invitation_expires_at = None

    db.commit()
    db.refresh(user)
    org = db.query(Organization).filter(Organization.id == membership.organization_id).first()
    return user, org
