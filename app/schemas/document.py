from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class DocumentOut(BaseModel):
    id: str
    organization_id: str
    title: str
    filename: str
    file_size_bytes: int
    mime_type: str
    status: str
    page_count: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentStatusOut(BaseModel):
    id: str
    status: str
    page_count: int
    error_message: Optional[str] = None
