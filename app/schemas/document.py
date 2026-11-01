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
    checksum: Optional[str] = None
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


class DocumentDownloadUrlOut(BaseModel):
    """Pre-signed download / preview URL response contract (Section 8.1 & 14)."""
    document_id: str
    filename: str
    download_url: str
    storage_provider: str  # "minio", "s3", or "local"
    expires_in_seconds: int
