from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.permissions import Permission
from app.core.tenant_context import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.retrieval_service import query_rag
from app.services.usage_service import check_token_quota, record_usage

router = APIRouter(prefix="/chat", tags=["AI Intelligence & RAG"])


@router.post("", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def chat_rag(
    data: ChatRequest,
    context: TenantContext = Depends(require_permission(Permission.RAG_QUERY)),
    db: Session = Depends(get_db)
):
    """
    RAG Question-Answering endpoint with verifiable source citations (Section 8.2 & 10.2).
    Tenant boundaries and Section 7.4 token usage quotas are strictly enforced.
    """
    # 1. Quota enforcement before costly LLM inference (Section 7.4)
    check_token_quota(organization_id=context.organization.id, db=db)

    # 2. Execute RAG query
    response = query_rag(
        organization_id=context.organization.id,
        question=data.question,
        top_k=data.top_k,
        document_ids=data.document_ids,
        db=db
    )

    # 3. Record metered token usage (Section 7.4)
    if response.prompt_tokens > 0 or response.completion_tokens > 0:
        record_usage(
            organization_id=context.organization.id,
            user_id=context.user.id if context.user else None,
            event_type="rag_chat",
            prompt_tokens=response.prompt_tokens,
            completion_tokens=response.completion_tokens,
            model=response.model,
            db=db
        )

    return response
