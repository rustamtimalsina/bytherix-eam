from dataclasses import dataclass
from typing import Optional, Set
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.permissions import Permission, Role, ROLE_PERMISSIONS, has_permission
from app.core.security import decode_token, hash_api_key
from app.db.models.api_key import APIKey
from app.db.models.membership import Membership
from app.db.models.organization import Organization
from app.db.models.user import User
from app.db.session import get_db

security_scheme = HTTPBearer(auto_error=False)


@dataclass
class TenantContext:
    user: Optional[User]
    organization: Organization
    role: Role
    permissions: Set[Permission]
    is_api_key: bool = False
    api_key_name: Optional[str] = None


def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Validate JWT bearer token and return authenticated User."""
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    try:
        payload = decode_token(auth.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Missing subject in token")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or disabled"
        )
    return user


def get_tenant_context(
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-Id"),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> TenantContext:
    """
    Resolve tenant boundary from API key OR authenticated user session (Section 3.2).
    Never trusts client input without verifying actual membership in the database.
    """
    # 1. API Key Authentication (Section 7.2)
    if x_api_key:
        hashed = hash_api_key(x_api_key)
        api_key_rec = db.query(APIKey).filter(
            APIKey.key_hash == hashed,
            APIKey.is_revoked == False
        ).first()
        
        if not api_key_rec:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or revoked API key"
            )
        
        org = db.query(Organization).filter(
            Organization.id == api_key_rec.organization_id,
            Organization.is_active == True
        ).first()
        
        if not org:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization inactive or suspended"
            )
        
        # Parse API key scopes
        scopes = set()
        if api_key_rec.scopes == "*":
            scopes = ROLE_PERMISSIONS[Role.DEVELOPER]
        else:
            for s in api_key_rec.scopes.split(","):
                try:
                    scopes.add(Permission(s.strip()))
                except ValueError:
                    pass
        
        return TenantContext(
            user=None,
            organization=org,
            role=Role.DEVELOPER,
            permissions=scopes,
            is_api_key=True,
            api_key_name=api_key_rec.name
        )
    
    # 2. User Session / JWT Authentication
    user = get_current_user(auth, db)
    
    # If no explicit organization header, find the user's default/first organization
    if not x_organization_id:
        membership = db.query(Membership).filter(
            Membership.user_id == user.id,
            Membership.status == "active"
        ).first()
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not belong to any active organization"
            )
        org_id = membership.organization_id
    else:
        org_id = x_organization_id
        membership = db.query(Membership).filter(
            Membership.user_id == user.id,
            Membership.organization_id == org_id,
            Membership.status == "active"
        ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not an active member of this organization"
        )
    
    org = db.query(Organization).filter(
        Organization.id == org_id,
        Organization.is_active == True
    ).first()
    
    if not org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization not found or inactive"
        )
    
    role = Role(membership.role)
    perms = ROLE_PERMISSIONS.get(role, set())
    
    return TenantContext(
        user=user,
        organization=org,
        role=role,
        permissions=perms,
        is_api_key=False
    )


def require_permission(perm: Permission):
    """Dependency factory ensuring the caller has a required permission."""
    def dependency(context: TenantContext = Depends(get_tenant_context)) -> TenantContext:
        if perm not in context.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: Requires {perm.value}"
            )
        return context
    return dependency
