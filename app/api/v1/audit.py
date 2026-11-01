from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.permissions import Permission
from app.core.tenant_context import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.audit import AuditLogListResponse, AuditStatsResponse, AuditLogResponse
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit-logs", tags=["Audit & Compliance"])


@router.get("", response_model=AuditLogListResponse, status_code=status.HTTP_200_OK)
def list_audit_logs(
    action: Optional[str] = Query(None, description="Filter by event action"),
    severity: Optional[str] = Query(None, description="Filter by severity (info, warning, critical)"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: TenantContext = Depends(require_permission(Permission.AUDIT_READ)),
    db: Session = Depends(get_db)
):
    """
    Query enterprise audit trail logs with tenant isolation (Section 10 & 13).
    """
    items, total = AuditService.list_events(
        db=db,
        organization_id=context.organization.id,
        action=action,
        severity=severity,
        resource_type=resource_type,
        limit=limit,
        offset=offset
    )

    return AuditLogListResponse(
        items=[AuditLogResponse.model_validate(i) for i in items],
        total=total,
        page=(offset // limit) + 1,
        limit=limit
    )


@router.get("/stats", response_model=AuditStatsResponse, status_code=status.HTTP_200_OK)
def get_audit_stats(
    context: TenantContext = Depends(require_permission(Permission.AUDIT_READ)),
    db: Session = Depends(get_db)
):
    """
    Get aggregated severity counts for audit telemetry gauges (Section 10.2).
    """
    stats = AuditService.get_stats(db, context.organization.id)
    return AuditStatsResponse(**stats)


@router.get("/export", status_code=status.HTTP_200_OK)
def export_audit_logs_csv(
    context: TenantContext = Depends(require_permission(Permission.AUDIT_READ)),
    db: Session = Depends(get_db)
):
    """
    Export immutable tenant audit logs to RFC 4180 CSV file (Section 10.4).
    """
    csv_content = AuditService.export_csv(db, context.organization.id)
    filename = f"bytherix_audit_trail_{context.organization.id[:8]}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Cache-Control": "no-store"
        }
    )
