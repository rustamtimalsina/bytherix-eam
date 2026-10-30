from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class SourceCitation(BaseModel):
    document_id: str
    document_title: str
    page_number: int
    chunk_index: int
    snippet: str
    similarity_score: float


class ChatRequest(BaseModel):
    question: str = Field(min_length=2, max_length=1000)
    document_ids: Optional[List[str]] = Field(default=None, description="Optional document filter scope")
    top_k: int = Field(default=4, ge=1, le=10)
    session_id: Optional[str] = Field(default=None, description="Optional conversation session ID")


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    session_id: Optional[str] = None


class MessageItem(BaseModel):
    id: str
    sender: str
    content: str
    sources: List[SourceCitation] = []
    model: Optional[str] = None
    created_at: datetime


class SessionSummary(BaseModel):
    id: str
    title: str
    message_count: int
    updated_at: datetime
    created_at: datetime


class SessionDetail(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageItem]
