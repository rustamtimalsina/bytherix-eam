from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.permissions import Permission
from app.core.tenant_context import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.dlq import (
    DeadLetterJobListResponse,
    DeadLetterJobResponse,
    DeadLetterJobActionResponse,
)
from app.services.dlq_service import DLQService

router = APIRouter(prefix="/jobs", tags=["Jobs & Dead-Letter Queue"])


@router.get("/dlq", response_model=DeadLetterJobListResponse, status_code=status.HTTP_200_OK)
def list_dead_letter_jobs(
    status: Optional[str] = Query(None, description="Filter by status (failed, retrying, resolved, purged)"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type (document, workflow)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: TenantContext = Depends(require_permission(Permission.MONITORING_READ)),
    db: Session = Depends(get_db),
):
    """
    List poisoned/failed background tasks in the tenant's Dead-Letter Queue (Section 11.3 & 14).
    """
    items, total = DLQService.list_jobs(
        db=db,
        organization_id=context.organization.id,
        status=status,
        resource_type=resource_type,
        limit=limit,
        offset=offset,
    )
    pages = (total + limit - 1) // limit if total > 0 else 1
    return DeadLetterJobListResponse(
        items=[DeadLetterJobResponse.model_validate(i) for i in items],
        total=total,
        page=(offset // limit) + 1,
        pages=pages,
    )


@router.post("/dlq/{job_id}/retry", response_model=DeadLetterJobActionResponse, status_code=status.HTTP_200_OK)
def retry_dead_letter_job(
    job_id: str,
    context: TenantContext = Depends(require_permission(Permission.DOCUMENTS_UPLOAD)),
    db: Session = Depends(get_db),
):
    """
    Re-drive an isolated dead-letter task back into the processing pipeline (Section 11.3).
    """
    actor_email = context.user.email if context.user else "system@bytherix.com"
    job = DLQService.retry_job(
        db=db,
        organization_id=context.organization.id,
        job_id=job_id,
        actor_email=actor_email,
    )
    return DeadLetterJobActionResponse(
        status="retrying",
        message=f"Job {job.task_name} (resource {job.resource_id}) re-driven successfully. Attempt #{job.retry_count}",
        job_id=job.id,
    )


@router.delete("/dlq/{job_id}", response_model=DeadLetterJobActionResponse, status_code=status.HTTP_200_OK)
def purge_dead_letter_job(
    job_id: str,
    context: TenantContext = Depends(require_permission(Permission.DOCUMENTS_DELETE)),
    db: Session = Depends(get_db),
):
    """
    Purge or dismiss a poisoned job from active DLQ monitoring (Section 11.3).
    """
    actor_email = context.user.email if context.user else "system@bytherix.com"
    job = DLQService.purge_job(
        db=db,
        organization_id=context.organization.id,
        job_id=job_id,
        actor_email=actor_email,
    )
    return DeadLetterJobActionResponse(
        status="purged",
        message=f"Dead-letter job {job.id} purged successfully.",
        job_id=job.id,
    )
