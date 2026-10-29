import hashlib
import io
import uuid
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.db.models.document import Document
from app.integrations.object_storage.s3 import storage_service
from app.services.retrieval_service import parse_and_index_document
from app.workers.tasks.document_tasks import process_document_task


def upload_document(
    db: Session,
    organization_id: str,
    user_id: str,
    file: UploadFile,
    title: str | None = None
) -> Document:
    """Validate, store, and enqueue document for ingestion (Section 8.1.1)."""
    # 1. Read file bytes and validate magic bytes (Must be valid PDF)
    content = file.file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty"
        )

    # Validate PDF signature (Section 8.1.1 step 3: do not trust MIME type alone)
    if not content.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only authentic PDF documents are supported."
        )

    # 2. Compute SHA-256 Checksum
    checksum = hashlib.sha256(content).hexdigest()
    doc_id = str(uuid.uuid4())
    doc_title = title or file.filename or "Untitled Document"

    # 3. Generate internal tenant-scoped object key
    object_key = f"tenants/{organization_id}/documents/{doc_id}/{checksum}.pdf"

    # 4. Upload to private object storage
    storage_service.upload_file(
        file_obj=io.BytesIO(content),
        object_key=object_key,
        content_type="application/pdf"
    )

    # 5. Persist Document record with status 'queued'
    doc = Document(
        id=doc_id,
        organization_id=organization_id,
        owner_id=user_id,
        title=doc_title,
        filename=file.filename or f"{doc_id}.pdf",
        object_key=object_key,
        checksum=checksum,
        mime_type="application/pdf",
        file_size_bytes=len(content),
        status="queued"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # 6. Enqueue background processing job after commit (Prevents race condition!)
    from app.core.config import settings
    if settings.APP_ENV == "test":
        parse_and_index_document(doc.id, db)
    else:
        try:
            process_document_task.delay(doc.id)
        except Exception:
            parse_and_index_document(doc.id, db)

    db.refresh(doc)
    return doc


def delete_document(db: Session, document: Document) -> bool:
    """Safely delete document, chunks, and storage objects (Section 8.3)."""
    # Mark as deleting to prevent read inconsistency
    document.status = "deleting"
    db.commit()

    # Delete from S3 storage
    storage_service.delete_file(document.object_key)

    # Cascade deletes chunks in database
    db.delete(document)
    db.commit()
    return True
