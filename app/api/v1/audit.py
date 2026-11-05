from datetime import datetime
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
    start_date: Optional[datetime] = Query(None, description="Filter events on or after this timestamp (ISO 8601)"),
    end_date: Optional[datetime] = Query(None, description="Filter events on or before this timestamp (ISO 8601)"),
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
        start_date=start_date,
        end_date=end_date,
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
def export_audit_logs(
    format: str = Query("csv", pattern="^(csv|json)$", description="Export format: 'csv' (RFC 4180) or 'json' (SIEM JSON)"),
    start_date: Optional[datetime] = Query(None, description="Filter logs starting from UTC datetime (ISO 8601)"),
    end_date: Optional[datetime] = Query(None, description="Filter logs up to UTC datetime (ISO 8601)"),
    action: Optional[str] = Query(None, description="Filter by event action (e.g. auth.*, billing.*, security.*)"),
    severity: Optional[str] = Query(None, description="Filter by severity: info, warning, critical"),
    actor_email: Optional[str] = Query(None, description="Filter by actor email"),
    context: TenantContext = Depends(require_permission(Permission.AUDIT_READ)),
    db: Session = Depends(get_db)
):
    """
    Export immutable tenant audit logs to RFC 4180 CSV or SIEM JSON format (§ 9.2 & § 10.4).
    Enforces strict tenant boundary, generates cryptographic SHA-256 integrity checksum,
    and records an immutable compliance export audit event.
    """
    import hashlib
    from datetime import timezone

    format_lower = format.lower()
    if format_lower == "json":
        content, record_count = AuditService.export_json(
            db=db,
            organization_id=context.organization.id,
            start_date=start_date,
            end_date=end_date,
            action=action,
            severity=severity,
            actor_email=actor_email,
        )
        media_type = "application/json; charset=utf-8"
        extension = "json"
    else:
        content, record_count = AuditService.export_csv(
            db=db,
            organization_id=context.organization.id,
            start_date=start_date,
            end_date=end_date,
            action=action,
            severity=severity,
            actor_email=actor_email,
        )
        media_type = "text/csv; charset=utf-8"
        extension = "csv"

    # Compute tamper-evident SHA-256 digest
    sha256_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()

    # Current UTC date stamp for clean filename
    now_stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"bytherix_audit_{context.organization.id[:8]}_{now_stamp}.{extension}"

    # Record immutable audit event for compliance tracking
    AuditService.record_event(
        db=db,
        organization_id=context.organization.id,
        action="audit.compliance_exported",
        resource_type="audit_trail",
        actor_email=context.user.email if context.user else "system@bytherix.com",
        severity="info",
        details={
            "format": format_lower,
            "record_count": record_count,
            "sha256_checksum": sha256_hash,
            "filters": {
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
                "action": action,
                "severity": severity,
                "actor_email": actor_email,
            }
        },
        ip_address="127.0.0.1"
    )

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Audit-Checksum-SHA256": sha256_hash,
            "X-Audit-Record-Count": str(record_count),
            "X-Audit-Tenant-ID": str(context.organization.id),
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
        }
    )
