from fastapi import APIRouter, Depends, Header, Request, status, Response
from sqlalchemy.orm import Session
from typing import Optional

from app.core.permissions import Permission
from app.core.tenant_context import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.billing import (
    BillingPlansResponse,
    UpgradePlanRequest,
    UpgradePlanResponse,
    CreateCheckoutSessionRequest,
    CheckoutSessionResponse,
    SubscriptionStatusResponse,
    StripeWebhookEvent,
    InvoicesListResponse
)
from app.services.billing_service import BillingService

router = APIRouter(prefix="/billing", tags=["Subscription & Billing (Section 7.3 & 11)"])


@router.get("/plans", response_model=BillingPlansResponse, status_code=status.HTTP_200_OK)
def list_billing_plans(
    context: TenantContext = Depends(require_permission(Permission.BILLING_READ)),
    db: Session = Depends(get_db)
):
    """
    Get organization subscription plans catalog, pricing tiers, and active plan (Section 7.3).
    """
    return BillingService.get_plans_catalog(organization_id=context.organization.id, db=db)


@router.get("/status", response_model=SubscriptionStatusResponse, status_code=status.HTTP_200_OK)
def get_subscription_status(
    context: TenantContext = Depends(require_permission(Permission.BILLING_READ)),
    db: Session = Depends(get_db)
):
    """
    Get organization subscription status, payment health, and grace period countdown (Section 7.3 #4 & #7).
    """
    return BillingService.get_subscription_status(organization_id=context.organization.id, db=db)


@router.post("/checkout", response_model=CheckoutSessionResponse, status_code=status.HTTP_200_OK)
def create_checkout_session(
    data: CreateCheckoutSessionRequest,
    context: TenantContext = Depends(require_permission(Permission.BILLING_UPDATE)),
    db: Session = Depends(get_db)
):
    """
    Create a Stripe-compatible checkout session for subscription plan upgrade (Section 7.3 #1).
    Returns checkout session identifier and hosted checkout redirect URL.
    """
    return BillingService.create_checkout_session(
        organization_id=context.organization.id,
        target_plan=data.plan_tier,
        success_url=data.success_url,
        cancel_url=data.cancel_url,
        db=db
    )


@router.post("/upgrade", response_model=UpgradePlanResponse, status_code=status.HTTP_200_OK)
def upgrade_organization_plan(
    data: UpgradePlanRequest,
    context: TenantContext = Depends(require_permission(Permission.BILLING_UPDATE)),
    db: Session = Depends(get_db)
):
    """
    Upgrade organization subscription tier directly (Section 7.3).
    Enforces authorization, updates database records, logs audit trail, and broadcasts SSE alert.
    """
    actor_email = context.user.email if context.user else "owner@bytherix.com"
    return BillingService.upgrade_plan(
        organization_id=context.organization.id,
        target_plan=data.plan_tier,
        actor_email=actor_email,
        db=db
    )


@router.get("/invoices", response_model=InvoicesListResponse, status_code=status.HTTP_200_OK)
def list_organization_invoices(
    context: TenantContext = Depends(require_permission(Permission.BILLING_READ)),
    db: Session = Depends(get_db)
):
    """
    List billing invoice ledger and tax receipt records for the tenant (Section 7.3 & 11).
    """
    return BillingService.get_invoices(organization_id=context.organization.id, db=db)


@router.get("/invoices/{invoice_id}/download", status_code=status.HTTP_200_OK)
def download_invoice_pdf(
    invoice_id: str,
    context: TenantContext = Depends(require_permission(Permission.BILLING_READ)),
    db: Session = Depends(get_db)
):
    """
    Download official PDF tax invoice / payment receipt for the tenant.
    """
    pdf_bytes = BillingService.generate_invoice_pdf(
        organization_id=context.organization.id,
        invoice_id=invoice_id,
        db=db
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="Bytherix_Invoice_{invoice_id}.pdf"',
            "Content-Type": "application/pdf"
        }
    )


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def stripe_billing_webhook(
    event: StripeWebhookEvent,
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature"),
    db: Session = Depends(get_db)
):
    """
    Stripe-compatible payment provider webhook receiver (Section 7.3 #2-#4, #7).
    Validates webhook events, deduplicates event IDs, and enforces subscription state machine.
    """
    return BillingService.process_stripe_webhook(
        payload=event.model_dump(),
        signature=stripe_signature,
        db=db
    )
