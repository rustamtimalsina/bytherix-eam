import json
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.db.models.conversation import ConversationSession, ConversationMessage
from app.schemas.chat import SourceCitation, MessageItem, SessionSummary, SessionDetail


def get_or_create_session(
    organization_id: str,
    user_id: Optional[str],
    session_id: Optional[str],
    title_seed: Optional[str],
    db: Session
) -> ConversationSession:
    """
    Retrieves existing session or creates a new one scoped to tenant.
    """
    if session_id:
        session = db.query(ConversationSession).filter(
            ConversationSession.id == session_id,
            ConversationSession.organization_id == organization_id
        ).first()
        if session:
            return session

    # Create new session
    title = (title_seed[:45] + "...") if title_seed and len(title_seed) > 45 else (title_seed or "New Thread")
    new_session = ConversationSession(
        organization_id=organization_id,
        user_id=user_id,
        title=title
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session


def list_sessions(organization_id: str, db: Session) -> List[SessionSummary]:
    """
    Lists all conversation sessions for an organization, newest first.
    """
    sessions = db.query(ConversationSession).filter(
        ConversationSession.organization_id == organization_id
    ).order_by(ConversationSession.updated_at.desc()).all()

    results = []
    for s in sessions:
        count = db.query(ConversationMessage).filter(ConversationMessage.session_id == s.id).count()
        results.append(SessionSummary(
            id=s.id,
            title=s.title,
            message_count=count,
            updated_at=s.updated_at,
            created_at=s.created_at
        ))
    return results


def get_session_detail(organization_id: str, session_id: str, db: Session) -> SessionDetail:
    """
    Retrieves a session and all its messages with deserialized source citations.
    """
    session = db.query(ConversationSession).filter(
        ConversationSession.id == session_id,
        ConversationSession.organization_id == organization_id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation session not found"
        )

    messages = db.query(ConversationMessage).filter(
        ConversationMessage.session_id == session.id
    ).order_by(ConversationMessage.created_at.asc()).all()

    formatted_messages = []
    for m in messages:
        citations = []
        if m.sources_json:
            try:
                raw_list = json.loads(m.sources_json)
                citations = [SourceCitation(**item) for item in raw_list]
            except Exception:
                citations = []

        formatted_messages.append(MessageItem(
            id=m.id,
            sender=m.sender,
            content=m.content,
            sources=citations,
            model=m.model,
            created_at=m.created_at
        ))

    return SessionDetail(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=formatted_messages
    )


def save_message(
    session_id: str,
    sender: str,
    content: str,
    sources: Optional[List[SourceCitation]],
    model: Optional[str],
    prompt_tokens: int,
    completion_tokens: int,
    db: Session
) -> ConversationMessage:
    """
    Persists a single message in the conversation session.
    """
    sources_json = None
    if sources:
        sources_json = json.dumps([
            s.model_dump() if hasattr(s, "model_dump") else s.dict()
            for s in sources
        ])

    msg = ConversationMessage(
        session_id=session_id,
        sender=sender,
        content=content,
        sources_json=sources_json,
        model=model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens
    )
    db.add(msg)

    # Touch session updated_at
    session = db.query(ConversationSession).filter(ConversationSession.id == session_id).first()
    if session:
        session.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(msg)
    return msg


def delete_session(organization_id: str, session_id: str, db: Session) -> bool:
    """
    Deletes a conversation session and all its messages.
    """
    session = db.query(ConversationSession).filter(
        ConversationSession.id == session_id,
        ConversationSession.organization_id == organization_id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation session not found"
        )

    db.delete(session)
    db.commit()
    return True
