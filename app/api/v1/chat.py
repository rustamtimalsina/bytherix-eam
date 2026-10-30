import json
from typing import List
from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.permissions import Permission
from app.core.tenant_context import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    SessionSummary,
    SessionDetail,
)
from app.services.retrieval_service import query_rag, stream_query_rag
from app.services.usage_service import check_token_quota, record_usage
from app.services.conversation_service import (
    get_or_create_session,
    list_sessions,
    get_session_detail,
    save_message,
    delete_session,
)

router = APIRouter(prefix="/chat", tags=["AI Intelligence & RAG"])


@router.get("/sessions", response_model=List[SessionSummary], status_code=status.HTTP_200_OK)
def get_user_chat_sessions(
    context: TenantContext = Depends(require_permission(Permission.RAG_QUERY)),
    db: Session = Depends(get_db)
):
    """
    List past conversation sessions for the active organization (Section 16.1 #6).
    """
    return list_sessions(organization_id=context.organization.id, db=db)


@router.get("/sessions/{session_id}", response_model=SessionDetail, status_code=status.HTTP_200_OK)
def get_single_chat_session(
    session_id: str,
    context: TenantContext = Depends(require_permission(Permission.RAG_QUERY)),
    db: Session = Depends(get_db)
):
    """
    Retrieve full conversation history and verifiable citations for a session (Section 16.1 #6).
    """
    return get_session_detail(organization_id=context.organization.id, session_id=session_id, db=db)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_200_OK)
def remove_chat_session(
    session_id: str,
    context: TenantContext = Depends(require_permission(Permission.RAG_QUERY)),
    db: Session = Depends(get_db)
):
    """
    Delete a conversation thread and its associated message history.
    """
    delete_session(organization_id=context.organization.id, session_id=session_id, db=db)
    return {"success": True, "message": "Conversation session deleted"}


@router.post("", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def chat_rag(
    data: ChatRequest,
    context: TenantContext = Depends(require_permission(Permission.RAG_QUERY)),
    db: Session = Depends(get_db)
):
    """
    RAG Question-Answering endpoint with persistent conversation session (Section 8.2 & 16.1).
    """
    # 1. Quota enforcement
    check_token_quota(organization_id=context.organization.id, db=db)

    # 2. Get or create conversation session
    session = get_or_create_session(
        organization_id=context.organization.id,
        user_id=context.user.id if context.user else None,
        session_id=data.session_id,
        title_seed=data.question,
        db=db
    )

    # 3. Save user question
    save_message(
        session_id=session.id,
        sender="user",
        content=data.question,
        sources=None,
        model=None,
        prompt_tokens=0,
        completion_tokens=0,
        db=db
    )

    # 4. Execute RAG query
    response = query_rag(
        organization_id=context.organization.id,
        question=data.question,
        top_k=data.top_k,
        document_ids=data.document_ids,
        db=db
    )

    # 5. Record metered token usage
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

    # 6. Save assistant answer
    save_message(
        session_id=session.id,
        sender="assistant",
        content=response.answer,
        sources=response.sources,
        model=response.model,
        prompt_tokens=response.prompt_tokens,
        completion_tokens=response.completion_tokens,
        db=db
    )

    response.session_id = session.id
    return response


@router.post("/stream", status_code=status.HTTP_200_OK)
def chat_rag_stream(
    data: ChatRequest,
    context: TenantContext = Depends(require_permission(Permission.RAG_QUERY)),
    db: Session = Depends(get_db)
):
    """
    Real-Time Server-Sent Events (SSE) streaming chat endpoint with session persistence (Section 8.2 & 16.1 #6).
    """
    # 1. Quota enforcement before starting stream
    check_token_quota(organization_id=context.organization.id, db=db)

    # 2. Get or create session
    session = get_or_create_session(
        organization_id=context.organization.id,
        user_id=context.user.id if context.user else None,
        session_id=data.session_id,
        title_seed=data.question,
        db=db
    )

    # 3. Save user question immediately
    save_message(
        session_id=session.id,
        sender="user",
        content=data.question,
        sources=None,
        model=None,
        prompt_tokens=0,
        completion_tokens=0,
        db=db
    )

    def event_generator():
        accumulated_answer = ""
        captured_citations = []
        try:
            # First send session meta
            yield f"data: {json.dumps({'type': 'session', 'session_id': session.id, 'title': session.title})}\n\n"

            for event_type, payload in stream_query_rag(
                organization_id=context.organization.id,
                question=data.question,
                top_k=data.top_k,
                document_ids=data.document_ids,
                db=db
            ):
                if event_type == "citations":
                    captured_citations = payload
                    citations_data = [
                        c.model_dump() if hasattr(c, "model_dump") else c.dict()
                        for c in payload
                    ]
                    yield f"data: {json.dumps({'type': 'citations', 'data': citations_data, 'session_id': session.id})}\n\n"
                elif event_type == "token":
                    accumulated_answer += payload
                    yield f"data: {json.dumps({'type': 'token', 'token': payload, 'session_id': session.id})}\n\n"
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

                    # Persist assistant response with citations
                    save_message(
                        session_id=session.id,
                        sender="assistant",
                        content=accumulated_answer,
                        sources=captured_citations,
                        model=model_name,
                        prompt_tokens=p_toks,
                        completion_tokens=c_toks,
                        db=db
                    )

                    yield f"data: {json.dumps({'type': 'done', 'prompt_tokens': p_toks, 'completion_tokens': c_toks, 'total_tokens': p_toks + c_toks, 'model': model_name, 'session_id': session.id})}\n\n"
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
