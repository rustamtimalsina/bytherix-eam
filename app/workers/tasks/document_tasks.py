from app.db.session import SessionLocal
from app.services.retrieval_service import parse_and_index_document
from app.workers.celery_app import celery_app


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def process_document_task(self, document_id: str):
    """Celery background task for asynchronous PDF parsing and indexing (Section 8.1.1)."""
    db = SessionLocal()
    try:
        doc = parse_and_index_document(document_id, db)
        return {"status": "success", "document_id": doc.id, "pages": doc.page_count}
    except Exception as exc:
        db.close()
        # Bounded exponential backoff for transient errors (Section 11.3)
        raise self.retry(exc=exc, countdown=10 * (2 ** self.request.retries))
    finally:
        db.close()
