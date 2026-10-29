from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.permissions import Permission
from app.core.tenant_context import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.retrieval_service import query_rag

router = APIRouter(prefix="/chat", tags=["AI Intelligence & RAG"])


@router.post("", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def chat_rag(
    data: ChatRequest,
    context: TenantContext = Depends(require_permission(Permission.RAG_QUERY)),
    db: Session = Depends(get_db)
):
    """
    RAG Question-Answering endpoint with verifiable source citations (Section 8.2 & 10.2).
    Tenant boundaries are strictly enforced.
    """
    response = query_rag(
        organization_id=context.organization.id,
        question=data.question,
        top_k=data.top_k,
        document_ids=data.document_ids,
        db=db
    )
    return response
