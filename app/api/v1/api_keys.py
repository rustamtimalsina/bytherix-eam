from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.permissions import Permission
from app.core.security import generate_api_key
from app.core.tenant_context import TenantContext, require_permission
from app.db.models.api_key import APIKey
from app.db.session import get_db
from app.schemas.api_key import APIKeyCreate, APIKeyCreatedResponse, APIKeyOut
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api-keys", tags=["API Keys"])


@router.get("", response_model=List[APIKeyOut])
def list_api_keys(
    context: TenantContext = Depends(require_permission(Permission.API_KEYS_READ)),
    db: Session = Depends(get_db)
):
    """List API key metadata for the current organization (Section 7.2 & 10.2)."""
    keys = db.query(APIKey).filter(
        APIKey.organization_id == context.organization.id,
        APIKey.is_revoked == False
    ).order_by(APIKey.created_at.desc()).all()
    return [APIKeyOut.model_validate(k) for k in keys]


@router.post("", response_model=APIKeyCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_key(
    data: APIKeyCreate,
    context: TenantContext = Depends(require_permission(Permission.API_KEYS_CREATE)),
    db: Session = Depends(get_db)
):
    """Generate a scoped high-entropy API key. Raw key is displayed only once (Section 7.2)."""
    raw_key, hashed_key = generate_api_key(prefix="bx_live_")
    
    expires_at = None
    if data.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=data.expires_in_days)

    user_id = context.user.id if context.user else "system"
    api_key_rec = APIKey(
        organization_id=context.organization.id,
        user_id=user_id,
        name=data.name,
        prefix=raw_key[:12] + "...",
        key_hash=hashed_key,
        scopes=data.scopes,
        expires_at=expires_at,
        is_revoked=False
    )
    db.add(api_key_rec)
    db.commit()
    db.refresh(api_key_rec)

    AuditService.record_event(
        db=db,
        organization_id=context.organization.id,
        action="security.api_key_created",
        resource_type="api_key",
        resource_id=api_key_rec.id,
        actor_email=context.user.email if context.user else "system",
        actor_id=user_id,
        severity="warning",
        details={"name": data.name, "prefix": api_key_rec.prefix, "scopes": data.scopes}
    )

    response_dict = APIKeyOut.model_validate(api_key_rec).model_dump()
    response_dict["raw_key"] = raw_key
    return APIKeyCreatedResponse(**response_dict)


@router.delete("/{key_id}", status_code=status.HTTP_200_OK)
def revoke_key(
    key_id: str,
    context: TenantContext = Depends(require_permission(Permission.API_KEYS_REVOKE)),
    db: Session = Depends(get_db)
):
    """Revoke an API key immediately (Section 7.2)."""
    key_rec = db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.organization_id == context.organization.id
    ).first()

    if not key_rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    key_rec.is_revoked = True
    db.commit()

    AuditService.record_event(
        db=db,
        organization_id=context.organization.id,
        action="security.api_key_revoked",
        resource_type="api_key",
        resource_id=key_id,
        actor_email=context.user.email if context.user else "system",
        actor_id=context.user.id if context.user else None,
        severity="warning",
        details={"name": key_rec.name, "prefix": key_rec.prefix}
    )

    return {"message": "API key revoked successfully"}
