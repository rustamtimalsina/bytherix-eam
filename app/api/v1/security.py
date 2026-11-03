from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.permissions import Permission
from app.core.tenant_context import TenantContext, require_permission
from app.db.session import get_db
from app.db.models.audit import AuditLog
from app.services.dlp_service import DLPShieldService, DLPResult

router = APIRouter(prefix="/security/dlp", tags=["Enterprise Security & DLP Shield"])


class DLPScanRequest(BaseModel):
    text: str = Field(min_length=1, max_length=10000, description="Payload to inspect for sensitive data")


class DLPStatsResponse(BaseModel):
    total_redaction_events: int
    shield_status: str
    active_detectors_count: int
    recent_categories: List[Dict[str, Any]]


@router.get("/rules", status_code=status.HTTP_200_OK)
def get_dlp_rules(
    context: TenantContext = Depends(require_permission(Permission.RAG_QUERY)),
):
    """
    List all active DLP Shield detectors and compliance policies (Section 12 & 15).
    """
    rules = DLPShieldService.get_supported_detectors()
    return {
        "shield_active": True,
        "engine_version": "1.4.0-bytherix",
        "rules_count": len(rules),
        "rules": rules,
    }


@router.post("/scan", response_model=DLPResult, status_code=status.HTTP_200_OK)
def scan_text_dlp(
    data: DLPScanRequest,
    context: TenantContext = Depends(require_permission(Permission.RAG_QUERY)),
):
    """
    Dry-run DLP scan to inspect and preview redactions on arbitrary text.
    """
    return DLPShieldService.scan_and_mask(data.text)


@router.get("/stats", response_model=DLPStatsResponse, status_code=status.HTTP_200_OK)
def get_dlp_stats(
    context: TenantContext = Depends(require_permission(Permission.RAG_QUERY)),
    db: Session = Depends(get_db)
):
    """
    Return organization-level DLP Shield redaction statistics and health metrics.
    """
    # Count audit logs where action contains dlp_redaction
    total_events = (
        db.query(func.count(AuditLog.id))
        .filter(
            AuditLog.organization_id == context.organization.id,
            AuditLog.action == "security.dlp_redaction"
        )
        .scalar()
        or 0
    )

    detectors = DLPShieldService.get_supported_detectors()

    return DLPStatsResponse(
        total_redaction_events=total_events,
        shield_status="ACTIVE_ENFORCING",
        active_detectors_count=len(detectors),
        recent_categories=[
            {"category": d["id"], "name": d["name"], "severity": d["severity"]}
            for d in detectors
        ]
    )
