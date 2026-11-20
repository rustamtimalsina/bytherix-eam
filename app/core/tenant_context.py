from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional, Set
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, APIKeyHeader
from sqlalchemy.orm import Session

from app.core.permissions import Permission, Role, ROLE_PERMISSIONS, has_permission
from app.core.security import decode_token, hash_api_key
from app.core.config import settings
from app.db.models.api_key import APIKey
from app.db.models.membership import Membership
from app.db.models.organization import Organization
from app.db.models.user import User
from app.db.session import get_db

security_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


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
    db: Session = Depends(get_db),
    x_api_key: Optional[str] = Depends(api_key_header)
) -> User:
    """Validate JWT bearer token or API key and return authenticated User."""
    DEV_MASTER_KEYS = ("bytherix-dev", "bytherix123", "admin123")
    auth_str = auth.credentials.strip() if auth and isinstance(getattr(auth, "credentials", None), str) else None
    x_api_key_str = x_api_key.strip() if isinstance(x_api_key, str) else None

    # Dev shortcut master password for rapid local testing (strictly development environment only)
    if settings.APP_ENV == "development" and (
        (auth_str and auth_str in DEV_MASTER_KEYS) or 
        (x_api_key_str and x_api_key_str in DEV_MASTER_KEYS)
    ):
        dev_user = db.query(User).filter(User.email == "rustam@bytherix.com").first()
        if not dev_user:
            dev_user = db.query(User).filter(User.is_active == True).first()
        if dev_user:
            return dev_user

    # Check API key if provided
    if x_api_key_str:
        hashed = hash_api_key(x_api_key_str)
        key_record = db.query(APIKey).filter(APIKey.key_hash == hashed, APIKey.is_active == True).first()
        if key_record and key_record.created_by_user_id:
            user = db.query(User).filter(User.id == key_record.created_by_user_id, User.is_active == True).first()
            if user:
                return user

    if not auth_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        payload = decode_token(auth_str)
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
    x_api_key: Optional[str] = Depends(api_key_header),
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> TenantContext:
    """
    Resolve tenant boundary from API key OR authenticated user session (Section 3.2).
    Never trusts client input without verifying actual membership in the database.
    """
    # 0. Dev Master Shortcut for rapid local testing (strictly development environment only)
    DEV_MASTER_KEYS = ("bytherix-dev", "bytherix123", "admin123")
    x_api_key_str = x_api_key.strip() if isinstance(x_api_key, str) else None
    auth_str = auth.credentials.strip() if auth and isinstance(getattr(auth, "credentials", None), str) else None

    is_dev_key = (
        settings.APP_ENV == "development" and (
            (x_api_key_str and x_api_key_str in DEV_MASTER_KEYS) or 
            (auth_str and auth_str in DEV_MASTER_KEYS)
        )
    )
    if is_dev_key:
        dev_user = db.query(User).filter(User.email == "rustam@bytherix.com").first()
        if not dev_user:
            dev_user = db.query(User).filter(User.is_active == True).first()
        if dev_user:
            membership = db.query(Membership).filter(
                Membership.user_id == dev_user.id,
                Membership.status == "active"
            ).first()
            if membership:
                org = db.query(Organization).filter(Organization.id == membership.organization_id).first()
                if org:
                    if x_api_key_str:
                        dev_key_rec = db.query(APIKey).filter(
                            APIKey.organization_id == org.id,
                            APIKey.name.ilike(f"%{x_api_key_str}%")
                        ).first()
                        if dev_key_rec:
                            dev_key_rec.last_used_at = datetime.now(timezone.utc) if (getattr(dev_key_rec, "created_at", None) and getattr(dev_key_rec.created_at, "tzinfo", None)) else datetime.now()
                            db.commit()

                    return TenantContext(
                        user=dev_user,
                        organization=org,
                        role=Role.OWNER,
                        permissions=set(Permission),
                        is_api_key=True if x_api_key_str else False,
                        api_key_name="Developer Master Key"
                    )

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
        
        if api_key_rec.expires_at:
            exp = api_key_rec.expires_at
            now = datetime.now(timezone.utc) if exp.tzinfo else datetime.now()
            if exp < now:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="API key has expired"
                )

        # Update last_used_at timestamp on valid API key usage
        api_key_rec.last_used_at = datetime.now(timezone.utc) if (getattr(api_key_rec, "created_at", None) and getattr(api_key_rec.created_at, "tzinfo", None)) else datetime.now()
        db.commit()
        
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
    user = get_current_user(auth=auth, db=db)
    
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
