from typing import List
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.permissions import Permission
from app.core.tenant_context import TenantContext, require_permission
from app.db.models.document import Document
from app.db.session import get_db
from app.schemas.document import DocumentOut, DocumentStatusOut
from app.services.document_service import delete_document, upload_document

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
