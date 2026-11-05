import traceback
from celery.exceptions import MaxRetriesExceededError
from app.db.session import SessionLocal
from app.db.models.document import Document
from app.services.retrieval_service import parse_and_index_document
from app.services.dlq_service import DLQService
from app.workers.celery_app import celery_app


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def process_document_task(self, document_id: str):
    """Celery background task for asynchronous PDF parsing and indexing with DLQ isolation (Section 8.1.1 & 11.3)."""
    db = SessionLocal()
    try:
        doc = parse_and_index_document(document_id, db)
        return {"status": "success", "document_id": doc.id, "pages": doc.page_count}
    except Exception as exc:
        retries = getattr(self.request, "retries", 0)
        max_retries = getattr(self, "max_retries", 3)

        # Check if exhausted retries
        if retries >= max_retries:
            try:
                doc = db.query(Document).filter(Document.id == document_id).first()
                org_id = doc.organization_id if doc else "system"
                DLQService.capture_failed_job(
                    db=db,
                    organization_id=org_id,
                    task_name="process_document_task",
                    task_id=getattr(self.request, "id", None),
                    resource_type="document",
                    resource_id=document_id,
                    payload={"document_id": document_id, "filename": doc.filename if doc else None},
                    error=exc,
                    stack_trace=traceback.format_exc(),
                    retry_count=retries,
                )
            except Exception as dlq_err:
                print(f"[DLQ] Error capturing dead letter job: {dlq_err}")
            raise exc

        try:
            # Bounded exponential backoff for transient errors (Section 11.3)
            raise self.retry(exc=exc, countdown=10 * (2 ** retries))
        except MaxRetriesExceededError:
            try:
                doc = db.query(Document).filter(Document.id == document_id).first()
                org_id = doc.organization_id if doc else "system"
                DLQService.capture_failed_job(
                    db=db,
                    organization_id=org_id,
                    task_name="process_document_task",
                    task_id=getattr(self.request, "id", None),
                    resource_type="document",
                    resource_id=document_id,
                    payload={"document_id": document_id, "filename": doc.filename if doc else None},
                    error=exc,
                    stack_trace=traceback.format_exc(),
                    retry_count=retries,
                )
            except Exception as dlq_err:
                print(f"[DLQ] Error capturing dead letter job: {dlq_err}")
            raise
    finally:
        db.close()
