from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field, field_validator
import re

VALID_WEBHOOK_EVENTS = {
    "*",
    "document.processed",
    "document.failed",
    "model.promoted",
    "dlp.violation",
    "quota.threshold_reached",
    "member.invited",
    "ping"
}


class WebhookBase(BaseModel):
    url: str = Field(..., max_length=1024, description="Target destination HTTP(S) URL for event payloads")
    events: List[str] = Field(
        default=["*"], 
        description="Subscribed event types or wildcard [*]"
    )
    description: Optional[str] = Field(None, max_length=255, description="Optional label or note for this webhook")

    @field_validator("url")
    def validate_url(cls, v: str) -> str:
        v = v.strip()
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("Webhook URL must start with http:// or https://")
        return v

    @field_validator("events")
    def validate_events(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("At least one event or '*' must be selected")
        for evt in v:
            if evt not in VALID_WEBHOOK_EVENTS:
                raise ValueError(
                    f"Invalid event '{evt}'. Valid events are: {', '.join(sorted(VALID_WEBHOOK_EVENTS))}"
                )
        return list(set(v))


class WebhookCreate(WebhookBase):
    pass


class WebhookUpdate(BaseModel):
    url: Optional[str] = Field(None, max_length=1024)
    events: Optional[List[str]] = None
    description: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None

    @field_validator("url")
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not (v.startswith("http://") or v.startswith("https://")):
                raise ValueError("Webhook URL must start with http:// or https://")
        return v

    @field_validator("events")
    def validate_events(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            if not v:
                raise ValueError("At least one event or '*' must be selected")
            for evt in v:
                if evt not in VALID_WEBHOOK_EVENTS:
                    raise ValueError(
                        f"Invalid event '{evt}'. Valid events are: {', '.join(sorted(VALID_WEBHOOK_EVENTS))}"
                    )
            return list(set(v))
        return v


class WebhookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    url: str
    description: Optional[str] = None
    events: List[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    secret_prefix: str = "whsec_..."


class WebhookCreatedResponse(WebhookOut):
    secret: str = Field(..., description="Raw HMAC-SHA256 signing secret. Displayed only once at creation.")


class WebhookDeliveryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    subscription_id: str
    event_type: str
    payload: Dict[str, Any]
    status_code: Optional[int] = None
    status: str
    attempts: int
    response_body: Optional[str] = None
    created_at: datetime


class WebhookTestResponse(BaseModel):
    status: str
    status_code: Optional[int] = None
    delivery_id: str
    signature_preview: str
    message: str
