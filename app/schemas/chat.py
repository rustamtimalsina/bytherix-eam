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


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
