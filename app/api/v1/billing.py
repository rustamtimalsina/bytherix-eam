from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy.orm import Session
from typing import Optional

from app.core.permissions import Permission
from app.core.tenant_context import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.billing import (
    BillingPlansResponse,
    UpgradePlanRequest,
    UpgradePlanResponse,
    StripeWebhookEvent
)
from app.services.billing_service import BillingService

router = APIRouter(prefix="/billing", tags=["Subscription & Billing (Section 7.3)"])


@router.get("/plans", response_model=BillingPlansResponse, status_code=status.HTTP_200_OK)
def list_billing_plans(
    context: TenantContext = Depends(require_permission(Permission.BILLING_READ)),
    db: Session = Depends(get_db)
):
    """
    Get organization subscription plans catalog, pricing tiers, and active plan (Section 7.3).
    """
    return BillingService.get_plans_catalog(organization_id=context.organization.id, db=db)


@router.post("/upgrade", response_model=UpgradePlanResponse, status_code=status.HTTP_200_OK)
def upgrade_organization_plan(
    data: UpgradePlanRequest,
    context: TenantContext = Depends(require_permission(Permission.BILLING_UPDATE)),
    db: Session = Depends(get_db)
):
    """
    Upgrade organization subscription tier (Section 7.3).
    Enforces authorization, updates database records, logs audit trail, and broadcasts SSE alert.
    """
    actor_email = context.user.email if context.user else "owner@bytherix.com"
    return BillingService.upgrade_plan(
        organization_id=context.organization.id,
        target_plan=data.plan_tier,
        actor_email=actor_email,
        db=db
    )


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def stripe_billing_webhook(
    event: StripeWebhookEvent,
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature"),
    db: Session = Depends(get_db)
):
    """
    Stripe-compatible payment provider webhook receiver (Section 7.3).
    Validates webhook events and elevates tenant plan boundaries.
    """
    return BillingService.process_stripe_webhook(
        payload=event.model_dump(),
        signature=stripe_signature,
        db=db
    )
