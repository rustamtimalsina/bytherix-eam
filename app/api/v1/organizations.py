from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.permissions import Permission, Role
from app.core.tenant_context import TenantContext, get_current_user, get_tenant_context, require_permission
from app.db.models.membership import Membership
from app.db.models.organization import Organization
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.organization import (
    AcceptInviteRequest,
    InviteMemberRequest,
    MembershipOut,
    OrganizationCreate,
    OrganizationOut,
)
from app.services.organization_service import (
    accept_invite,
    create_organization_with_owner,
    invite_member,
)

router = APIRouter(prefix="/organizations", tags=["Organizations & Members"])


@router.get("", response_model=List[OrganizationOut])
def list_my_organizations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all organizations the authenticated user belongs to."""
    orgs = db.query(Organization).join(Membership).filter(
        Membership.user_id == user.id,
        Membership.status == "active",
        Organization.is_active == True
    ).all()
    return [OrganizationOut.model_validate(o) for o in orgs]


@router.post("", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
def create_organization(
    data: OrganizationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new organization and assign caller as Owner."""
    org, _ = create_organization_with_owner(db, user, data.name)
    return OrganizationOut.model_validate(org)


@router.get("/{organization_id}/members", response_model=List[MembershipOut])
def list_members(
    organization_id: str,
    context: TenantContext = Depends(require_permission(Permission.MEMBERS_READ)),
    db: Session = Depends(get_db)
):
    """List members of the organization (Section 3.1 & 10.2)."""
    if context.organization.id != organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-tenant access forbidden")

    memberships = db.query(Membership).filter(
        Membership.organization_id == organization_id
    ).all()

    result = []
    for m in memberships:
        user = db.query(User).filter(User.id == m.user_id).first()
        out = MembershipOut(
            id=m.id,
            user_id=m.user_id,
            organization_id=m.organization_id,
            role=m.role,
            status=m.status,
            user_email=user.email if user else None,
            user_full_name=user.full_name if user else None,
            created_at=m.created_at
        )
        result.append(out)
    return result


@router.post("/{organization_id}/members/invite", response_model=MembershipOut, status_code=status.HTTP_201_CREATED)
def invite(
    organization_id: str,
    data: InviteMemberRequest,
    context: TenantContext = Depends(require_permission(Permission.MEMBERS_INVITE)),
    db: Session = Depends(get_db)
):
    """Invite a new member with scoped role (Section 7.1)."""
    if context.organization.id != organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-tenant access forbidden")

    membership = invite_member(
        db=db,
        organization_id=organization_id,
        email=data.email,
        role=data.role
    )
    user = db.query(User).filter(User.id == membership.user_id).first()
    return MembershipOut(
        id=membership.id,
        user_id=membership.user_id,
        organization_id=membership.organization_id,
        role=membership.role,
        status=membership.status,
        user_email=user.email if user else None,
        user_full_name=user.full_name if user else None,
        created_at=membership.created_at
    )


@router.post("/accept-invite", status_code=status.HTTP_200_OK)
def accept_invitation(
    data: AcceptInviteRequest,
    db: Session = Depends(get_db)
):
    """Accept an organization invitation, set password, and activate account."""
    user, org = accept_invite(db, data.token, data.password, data.full_name)
    return {"message": f"Successfully joined {org.name}", "email": user.email, "organization_id": org.id}
