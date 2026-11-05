from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class DeadLetterJobResponse(BaseModel):
    """Dead-Letter Queue item serialization contract (Section 11.3 & 14)."""
    id: str
    organization_id: str
    task_name: str
    task_id: Optional[str] = None
    resource_type: str
    resource_id: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    error_message: str
    stack_trace: Optional[str] = None
    retry_count: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DeadLetterJobListResponse(BaseModel):
    items: List[DeadLetterJobResponse]
    total: int
    page: int
    pages: int


class DeadLetterJobActionResponse(BaseModel):
    status: str
    message: str
    job_id: str
