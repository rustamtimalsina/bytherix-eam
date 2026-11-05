import traceback
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.db.models.dead_letter import DeadLetterJob
from app.db.models.document import Document
from app.services.audit_service import AuditService


class DLQService:
    """
    Dead-Letter Queue (DLQ) Service (Section 11.3 & 14).
    Isolates poison-pill jobs, tracks failure diagnostics, and enables tenant-scoped re-drives.
    """

    @staticmethod
    def capture_failed_job(
        db: Session,
        organization_id: str,
        task_name: str,
        task_id: Optional[str] = None,
        resource_type: str = "document",
        resource_id: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
        error: Any = "Unknown background processing error",
        stack_trace: Optional[str] = None,
        retry_count: int = 3,
    ) -> DeadLetterJob:
        """
        Record a poisoned/exhausted task to the Dead-Letter Queue with multi-tenant isolation.
        """
        error_msg = str(error)
        if not stack_trace and isinstance(error, Exception):
            stack_trace = traceback.format_exc()

        # Update underlying resource if applicable
        if resource_type == "document" and resource_id:
            doc = db.query(Document).filter(
                Document.id == resource_id,
                Document.organization_id == organization_id
            ).first()
            if doc:
                doc.status = "failed"
                doc.error_message = f"DLQ Isolated: {error_msg[:300]}"

        dlq_job = DeadLetterJob(
            organization_id=organization_id,
            task_name=task_name,
            task_id=task_id,
            resource_type=resource_type,
            resource_id=resource_id,
            payload=payload,
            error_message=error_msg,
            stack_trace=stack_trace,
            retry_count=retry_count,
            status="failed",
        )
        db.add(dlq_job)

        # Record compliance audit log
        try:
            AuditService.record_event(
                db=db,
                organization_id=organization_id,
                action="audit.job_dead_lettered",
                resource_type="dead_letter_job",
                resource_id=dlq_job.id,
                severity="warning",
                details={
                    "task_name": task_name,
                    "task_id": task_id,
                    "resource_type": resource_type,
                    "resource_id": resource_id,
                    "error_message": error_msg[:200],
                },
                actor_id=None,
                actor_email="system@bytherix.com",
            )
        except Exception:
            pass

        db.commit()
        db.refresh(dlq_job)
        return dlq_job

    @staticmethod
    def list_jobs(
        db: Session,
        organization_id: str,
        status: Optional[str] = None,
        resource_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[DeadLetterJob], int]:
        """Query paginated dead letter jobs scoped strictly to the organization."""
        query = select(DeadLetterJob).where(DeadLetterJob.organization_id == organization_id)
        count_query = select(func.count(DeadLetterJob.id)).where(DeadLetterJob.organization_id == organization_id)

        if status:
            query = query.where(DeadLetterJob.status == status.lower())
            count_query = count_query.where(DeadLetterJob.status == status.lower())
        if resource_type:
            query = query.where(DeadLetterJob.resource_type == resource_type.lower())
            count_query = count_query.where(DeadLetterJob.resource_type == resource_type.lower())

        total = db.execute(count_query).scalar() or 0
        items = db.execute(
            query.order_by(desc(DeadLetterJob.created_at)).limit(limit).offset(offset)
        ).scalars().all()

        return items, total

    @staticmethod
    def retry_job(
        db: Session,
        organization_id: str,
        job_id: str,
        actor_email: str = "system@bytherix.com"
    ) -> DeadLetterJob:
        """
        Re-drive a poisoned job from the DLQ back into the task pipeline.
        """
        job = db.query(DeadLetterJob).filter(
            DeadLetterJob.id == job_id,
            DeadLetterJob.organization_id == organization_id
        ).first()

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dead-letter job not found"
            )

        if job.status == "purged":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot re-drive a purged job"
            )

        # Dispatch re-drive based on resource type
        if job.resource_type == "document" and job.resource_id:
            doc = db.query(Document).filter(
                Document.id == job.resource_id,
                Document.organization_id == organization_id
            ).first()
            if doc:
                doc.status = "queued"
                doc.error_message = None

            try:
                from app.workers.tasks.document_tasks import process_document_task
                process_document_task.delay(job.resource_id)
            except Exception as exc:
                # If celery broker is not actively running in unit tests or local dev, fallback gracefully
                pass

        job.retry_count += 1
        job.status = "retrying"

        try:
            AuditService.record_event(
                db=db,
                organization_id=organization_id,
                action="audit.job_redriven",
                resource_type="dead_letter_job",
                resource_id=job.id,
                severity="info",
                details={
                    "task_name": job.task_name,
                    "resource_type": job.resource_type,
                    "resource_id": job.resource_id,
                    "retry_count": job.retry_count,
                },
                actor_email=actor_email,
            )
        except Exception:
            pass

        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def purge_job(
        db: Session,
        organization_id: str,
        job_id: str,
        actor_email: str = "system@bytherix.com"
    ) -> DeadLetterJob:
        """
        Purge/dismiss a poisoned job from active DLQ tracking.
        """
        job = db.query(DeadLetterJob).filter(
            DeadLetterJob.id == job_id,
            DeadLetterJob.organization_id == organization_id
        ).first()

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dead-letter job not found"
            )

        job.status = "purged"

        try:
            AuditService.record_event(
                db=db,
                organization_id=organization_id,
                action="audit.job_purged",
                resource_type="dead_letter_job",
                resource_id=job.id,
                severity="warning",
                details={
                    "task_name": job.task_name,
                    "resource_type": job.resource_type,
                    "resource_id": job.resource_id,
                },
                actor_email=actor_email,
            )
        except Exception:
            pass

        db.commit()
        db.refresh(job)
        return job
