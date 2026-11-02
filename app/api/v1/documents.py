from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.permissions import Permission
from app.core.security import decode_token
from app.core.tenant_context import TenantContext, require_permission
from app.db.models.document import Document
from app.db.models.chunk import DocumentChunk
from app.db.models.membership import Membership
from app.db.session import get_db
from app.schemas.document import DocumentChunkOut, DocumentChunksResponse, DocumentDownloadUrlOut, DocumentOut, DocumentStatusOut
from app.services.document_service import delete_document, upload_document
from app.services.audit_service import AuditService
from app.integrations.object_storage.s3 import storage_service

download_security = HTTPBearer(auto_error=False)

router = APIRouter(prefix="/documents", tags=["Documents & Knowledge"])


@router.get("", response_model=List[DocumentOut])
def list_documents(
    context: TenantContext = Depends(require_permission(Permission.DOCUMENTS_READ)),
    db: Session = Depends(get_db)
):
    """List all documents belonging to the caller's organization."""
    docs = db.query(Document).filter(
        Document.organization_id == context.organization.id,
        Document.status != "deleting"
    ).order_by(Document.created_at.desc()).all()
    return [DocumentOut.model_validate(d) for d in docs]


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
def upload(
    file: UploadFile = File(...),
    title: str = Form(None),
    context: TenantContext = Depends(require_permission(Permission.DOCUMENTS_UPLOAD)),
    db: Session = Depends(get_db)
):
    """Upload and enqueue a PDF document for RAG indexing (Section 8.1)."""
    user_id = context.user.id if context.user else "system"
    doc = upload_document(
        db=db,
        organization_id=context.organization.id,
        user_id=user_id,
        file=file,
        title=title
    )
    return DocumentOut.model_validate(doc)


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(
    document_id: str,
    context: TenantContext = Depends(require_permission(Permission.DOCUMENTS_READ)),
    db: Session = Depends(get_db)
):
    """Get document details by ID strictly bounded by tenant."""
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.organization_id == context.organization.id
    ).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    return DocumentOut.model_validate(doc)


@router.get("/{document_id}/status", response_model=DocumentStatusOut)
def get_status(
    document_id: str,
    context: TenantContext = Depends(require_permission(Permission.DOCUMENTS_READ)),
    db: Session = Depends(get_db)
):
    """Get document indexing status (Section 10.2)."""
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.organization_id == context.organization.id
    ).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    return DocumentStatusOut(
        id=doc.id,
        status=doc.status,
        page_count=doc.page_count,
        error_message=doc.error_message
    )


@router.get("/{document_id}/chunks", response_model=DocumentChunksResponse)
def get_document_chunks(
    document_id: str,
    context: TenantContext = Depends(require_permission(Permission.DOCUMENTS_READ)),
    db: Session = Depends(get_db)
):
    """
    Retrieve extracted text chunks and vector embeddings for a document (Sections 8 & 9).
    Strictly isolated to caller's tenant organization.
    """
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.organization_id == context.organization.id,
        Document.status != "deleting"
    ).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    chunks = db.query(DocumentChunk).filter(
        DocumentChunk.document_id == document_id,
        DocumentChunk.organization_id == context.organization.id
    ).order_by(DocumentChunk.chunk_index.asc()).all()

    chunk_outs = [
        DocumentChunkOut(
            id=c.id,
            document_id=c.document_id,
            chunk_index=c.chunk_index,
            page_number=c.page_number,
            content=c.content,
            token_count=c.token_count,
            metadata_json=c.metadata_json,
            has_embedding=c.embedding is not None,
            created_at=c.created_at
        )
        for c in chunks
    ]

    return DocumentChunksResponse(
        document_id=doc.id,
        document_title=doc.title,
        filename=doc.filename,
        total_chunks=len(chunk_outs),
        chunks=chunk_outs
    )


@router.get("/{document_id}/download-url", response_model=DocumentDownloadUrlOut)
def get_download_url(
    document_id: str,
    context: TenantContext = Depends(require_permission(Permission.DOCUMENTS_READ)),
    db: Session = Depends(get_db)
):
    """Generate a time-limited pre-signed download / preview URL (Section 8.1 & 14)."""
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.organization_id == context.organization.id,
        Document.status != "deleting"
    ).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    storage_provider = storage_service.get_storage_provider()
    presigned_url = storage_service.generate_presigned_download_url(
        object_key=doc.object_key,
        filename=doc.filename,
        expires_in=300
    )

    if presigned_url:
        download_url = presigned_url
    else:
        # Relative endpoint for local fallback streaming
        download_url = f"/api/v1/documents/{doc.id}/download"

    AuditService.record_event(
        db=db,
        organization_id=context.organization.id,
        action="document.download_url_generated",
        resource_type="document",
        resource_id=doc.id,
        actor_email=context.user.email if context.user else "system",
        actor_id=context.user.id if context.user else None,
        severity="info",
        details={"filename": doc.filename, "storage_provider": storage_provider}
    )

    return DocumentDownloadUrlOut(
        document_id=doc.id,
        filename=doc.filename,
        download_url=download_url,
        storage_provider=storage_provider,
        expires_in_seconds=300
    )


@router.get("/{document_id}/download")
def download_document(
    document_id: str,
    token: Optional[str] = Query(None),
    auth: Optional[HTTPAuthorizationCredentials] = Depends(download_security),
    db: Session = Depends(get_db)
):
    """
    Stream document binary content directly with authentic headers (Section 8.1 & 14).
    Accepts Bearer authentication header OR signed query parameter ?token=...
    """
    raw_token = None
    if auth and auth.credentials:
        raw_token = auth.credentials
    elif token:
        raw_token = token

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access document storage",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        payload = decode_token(raw_token)
        user_id = payload.get("sub")
        org_id = payload.get("org_id")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.status != "deleting"
    ).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # Multi-tenant isolation check: verify user belongs to the document's organization
    if doc.organization_id != org_id:
        membership = db.query(Membership).filter(
            Membership.user_id == user_id,
            Membership.organization_id == doc.organization_id,
            Membership.status == "active"
        ).first()
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-tenant access forbidden"
            )

    try:
        stream, size = storage_service.get_file_stream(doc.object_key)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document binary file not found in storage"
        )

    AuditService.record_event(
        db=db,
        organization_id=doc.organization_id,
        action="document.downloaded",
        resource_type="document",
        resource_id=doc.id,
        actor_email=f"user:{user_id}",
        actor_id=user_id,
        severity="info",
        details={"filename": doc.filename, "bytes": size}
    )

    headers = {
        "Content-Disposition": f'inline; filename="{doc.filename}"',
        "Content-Length": str(size),
    }
    return StreamingResponse(
        stream,
        media_type=doc.mime_type or "application/pdf",
        headers=headers
    )


@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
def remove_document(
    document_id: str,
    context: TenantContext = Depends(require_permission(Permission.DOCUMENTS_DELETE)),
    db: Session = Depends(get_db)
):
    """Delete a document and purge vector chunks (Section 8.3)."""
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.organization_id == context.organization.id
    ).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    delete_document(db, doc)
    return {"message": "Document deleted successfully"}
