import json
from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.permissions import Permission
from app.core.tenant_context import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.retrieval_service import query_rag, stream_query_rag
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


@router.post("/stream", status_code=status.HTTP_200_OK)
def chat_rag_stream(
    data: ChatRequest,
    context: TenantContext = Depends(require_permission(Permission.RAG_QUERY)),
    db: Session = Depends(get_db)
):
    """
    Real-Time Server-Sent Events (SSE) streaming chat endpoint (Section 8.2 & 10.2).
    Streams citations first, then token-by-token answer generation, and finally token accounting metrics.
    Enforces quota before execution and logs metered telemetry upon completion.
    """
    # 1. Quota enforcement before starting stream (Section 7.4)
    check_token_quota(organization_id=context.organization.id, db=db)

    def event_generator():
        try:
            for event_type, payload in stream_query_rag(
                organization_id=context.organization.id,
                question=data.question,
                top_k=data.top_k,
                document_ids=data.document_ids,
                db=db
            ):
                if event_type == "citations":
                    citations_data = [
                        c.model_dump() if hasattr(c, "model_dump") else c.dict()
                        for c in payload
                    ]
                    yield f"data: {json.dumps({'type': 'citations', 'data': citations_data})}\n\n"
                elif event_type == "token":
                    yield f"data: {json.dumps({'type': 'token', 'token': payload})}\n\n"
                elif event_type == "done":
                    p_toks, c_toks, model_name = payload
                    if p_toks > 0 or c_toks > 0:
                        record_usage(
                            organization_id=context.organization.id,
                            user_id=context.user.id if context.user else None,
                            event_type="rag_chat_stream",
                            prompt_tokens=p_toks,
                            completion_tokens=c_toks,
                            model=model_name,
                            db=db
                        )
                    yield f"data: {json.dumps({'type': 'done', 'prompt_tokens': p_toks, 'completion_tokens': c_toks, 'total_tokens': p_toks + c_toks, 'model': model_name})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'error': str(exc)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
