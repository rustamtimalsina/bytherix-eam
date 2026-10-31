from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    actor_id: Optional[str] = None
    actor_email: str
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    severity: str
    details: str
    ip_address: Optional[str] = None
    created_at: datetime


class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
    page: int
    limit: int


class AuditStatsResponse(BaseModel):
    total_events: int
    info_count: int
    warning_count: int
    critical_count: int
