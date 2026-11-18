from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.permissions import Permission
from app.core.tenant_context import TenantContext, require_permission
from app.db.models.webhook import WebhookSubscription, WebhookDelivery
from app.db.session import get_db
from app.schemas.webhook import (
    WebhookCreate,
    WebhookUpdate,
    WebhookOut,
    WebhookCreatedResponse,
    WebhookDeliveryOut,
    WebhookTestResponse
)
from app.services.audit_service import AuditService
from app.services.webhook_service import WebhookService

router = APIRouter(prefix="/webhooks", tags=["Webhooks & Event Subscriptions"])


def _to_webhook_out(sub: WebhookSubscription) -> WebhookOut:
    return WebhookOut(
        id=sub.id,
        organization_id=sub.organization_id,
        url=sub.url,
        description=sub.description,
        events=sub.events,
        is_active=sub.is_active,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
        secret_prefix=sub.secret[:10] + "..." if len(sub.secret) >= 10 else "whsec_..."
    )


@router.get("", response_model=List[WebhookOut])
def list_webhooks(
    context: TenantContext = Depends(require_permission(Permission.WEBHOOKS_READ)),
    db: Session = Depends(get_db)
):
    """List all registered webhook subscription endpoints for the current tenant."""
    subs = db.query(WebhookSubscription).filter(
        WebhookSubscription.organization_id == context.organization.id
    ).order_by(WebhookSubscription.created_at.desc()).all()

    return [_to_webhook_out(sub) for sub in subs]


@router.post("", response_model=WebhookCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_webhook(
    payload: WebhookCreate,
    context: TenantContext = Depends(require_permission(Permission.WEBHOOKS_CREATE)),
    db: Session = Depends(get_db)
):
    """Register a new webhook endpoint. Raw signing secret is returned only once."""
    raw_secret = WebhookService.generate_secret()

    sub = WebhookSubscription(
        organization_id=context.organization.id,
        url=payload.url,
        secret=raw_secret,
        description=payload.description,
        events=payload.events,
        is_active=True
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)

    AuditService.record_event(
        db=db,
        organization_id=context.organization.id,
        action="webhooks.created",
        resource_type="webhook_subscription",
        resource_id=sub.id,
        actor_id=context.user.id if context.user else None,
        actor_email=context.user.email if context.user else "system@bytherix.com",
        details={
            "url": sub.url,
            "events": sub.events,
            "description": sub.description
        }
    )

    return WebhookCreatedResponse(
        id=sub.id,
        organization_id=sub.organization_id,
        url=sub.url,
        description=sub.description,
        events=sub.events,
        is_active=sub.is_active,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
        secret_prefix=raw_secret[:10] + "...",
        secret=raw_secret
    )


@router.get("/{webhook_id}", response_model=WebhookOut)
def get_webhook(
    webhook_id: str,
    context: TenantContext = Depends(require_permission(Permission.WEBHOOKS_READ)),
    db: Session = Depends(get_db)
):
    """Get details of a specific webhook subscription bounded by tenant."""
    sub = db.query(WebhookSubscription).filter(
        WebhookSubscription.id == webhook_id,
        WebhookSubscription.organization_id == context.organization.id
    ).first()

    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Webhook subscription '{webhook_id}' not found."
        )

    return _to_webhook_out(sub)


@router.patch("/{webhook_id}", response_model=WebhookOut)
def update_webhook(
    webhook_id: str,
    payload: WebhookUpdate,
    context: TenantContext = Depends(require_permission(Permission.WEBHOOKS_CREATE)),
    db: Session = Depends(get_db)
):
    """Update webhook configuration, active state, or subscribed events."""
    sub = db.query(WebhookSubscription).filter(
        WebhookSubscription.id == webhook_id,
        WebhookSubscription.organization_id == context.organization.id
    ).first()

    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Webhook subscription '{webhook_id}' not found."
        )

    if payload.url is not None:
        sub.url = payload.url
    if payload.events is not None:
        sub.events = payload.events
    if payload.description is not None:
        sub.description = payload.description
    if payload.is_active is not None:
        sub.is_active = payload.is_active

    db.commit()
    db.refresh(sub)

    AuditService.record_event(
        db=db,
        organization_id=context.organization.id,
        action="webhooks.updated",
        resource_type="webhook_subscription",
        resource_id=sub.id,
        actor_id=context.user.id if context.user else None,
        actor_email=context.user.email if context.user else "system@bytherix.com",
        details={
            "url": sub.url,
            "events": sub.events,
            "is_active": sub.is_active
        }
    )

    return _to_webhook_out(sub)


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_webhook(
    webhook_id: str,
    context: TenantContext = Depends(require_permission(Permission.WEBHOOKS_DELETE)),
    db: Session = Depends(get_db)
):
    """Revoke and permanently delete a webhook subscription endpoint."""
    sub = db.query(WebhookSubscription).filter(
        WebhookSubscription.id == webhook_id,
        WebhookSubscription.organization_id == context.organization.id
    ).first()

    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Webhook subscription '{webhook_id}' not found."
        )

    db.delete(sub)
    db.commit()

    AuditService.record_event(
        db=db,
        organization_id=context.organization.id,
        action="webhooks.deleted",
        resource_type="webhook_subscription",
        resource_id=webhook_id,
        actor_id=context.user.id if context.user else None,
        actor_email=context.user.email if context.user else "system@bytherix.com",
        details={"deleted_url": sub.url}
    )

    return None


@router.post("/{webhook_id}/test", response_model=WebhookTestResponse)
def test_webhook(
    webhook_id: str,
    context: TenantContext = Depends(require_permission(Permission.WEBHOOKS_CREATE)),
    db: Session = Depends(get_db)
):
    """Dispatch an immediate signed HMAC test ping to verify endpoint connectivity."""
    sub = db.query(WebhookSubscription).filter(
        WebhookSubscription.id == webhook_id,
        WebhookSubscription.organization_id == context.organization.id
    ).first()

    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Webhook subscription '{webhook_id}' not found."
        )

    delivery, signature = WebhookService.test_ping(db, sub)

    AuditService.record_event(
        db=db,
        organization_id=context.organization.id,
        action="webhooks.tested",
        resource_type="webhook_subscription",
        resource_id=webhook_id,
        actor_id=context.user.id if context.user else None,
        actor_email=context.user.email if context.user else "system@bytherix.com",
        details={
            "status": delivery.status,
            "status_code": delivery.status_code,
            "delivery_id": delivery.id
        }
    )

    return WebhookTestResponse(
        status=delivery.status,
        status_code=delivery.status_code,
        delivery_id=delivery.id,
        signature_preview=signature[:25] + "...",
        message=f"Ping dispatched with status '{delivery.status}' (HTTP {delivery.status_code or 'N/A'})."
    )


@router.get("/{webhook_id}/deliveries", response_model=List[WebhookDeliveryOut])
def list_webhook_deliveries(
    webhook_id: str,
    context: TenantContext = Depends(require_permission(Permission.WEBHOOKS_READ)),
    db: Session = Depends(get_db)
):
    """List recent delivery logs and response statuses for this webhook."""
    sub = db.query(WebhookSubscription).filter(
        WebhookSubscription.id == webhook_id,
        WebhookSubscription.organization_id == context.organization.id
    ).first()

    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Webhook subscription '{webhook_id}' not found."
        )

    deliveries = db.query(WebhookDelivery).filter(
        WebhookDelivery.subscription_id == webhook_id
    ).order_by(WebhookDelivery.created_at.desc()).limit(50).all()

    return [WebhookDeliveryOut.model_validate(d) for d in deliveries]
