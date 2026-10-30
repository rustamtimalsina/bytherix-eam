from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.permissions import Permission
from app.core.tenant_context import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.usage import UsageSummary
from app.services.usage_service import get_usage_summary

router = APIRouter(prefix="/usage", tags=["Usage & Quota Telemetry"])


@router.get("", response_model=UsageSummary, status_code=status.HTTP_200_OK)
def get_organization_usage(
    context: TenantContext = Depends(require_permission(Permission.ORG_READ)),
    db: Session = Depends(get_db)
):
    """
    Get organization usage and quota telemetry (Section 7.4 & 10.2).
    Tenant boundaries are strictly enforced.
    """
    return get_usage_summary(organization_id=context.organization.id, db=db)
