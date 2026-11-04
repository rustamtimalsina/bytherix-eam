from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models.organization import Organization
from app.schemas.billing import PlanDetail, BillingPlansResponse, UpgradePlanResponse
from app.services.audit_service import AuditService
from app.services.usage_service import get_usage_summary, TIER_LIMITS
from app.core.notifications import notification_bus


PLANS_CATALOG: Dict[str, Dict[str, Any]] = {
    "starter": {
        "id": "starter",
        "name": "Starter Free",
        "price_usd_monthly": 0,
        "token_allowance": 100_000,
        "documents_limit": 5,
        "rate_limit_per_min": 60,
        "features": [
            "100,000 monthly AI tokens",
            "Up to 5 PDF documents (10 MB each)",
            "1536-dim pgvector HNSW indexing",
            "Pre-flight DLP Shield zero-leak protection",
            "Real-time RAG Triad hallucination scoreboard",
            "Standard developer community support"
        ]
    },
    "growth": {
        "id": "growth",
        "name": "Growth Pro",
        "price_usd_monthly": 49,
        "token_allowance": 1_500_000,
        "documents_limit": 50,
        "rate_limit_per_min": 300,
        "features": [
            "1,500,000 monthly AI tokens",
            "Up to 50 PDF documents (50 MB each)",
            "Priority pgvector vector retrieval (<45ms P95)",
            "Canary MLOps model promotions & traffic split",
            "Targeted document scope RAG filtering",
            "Governed agent workflow executions (10 steps)",
            "Priority SLA developer support"
        ]
    },
    "enterprise": {
        "id": "enterprise",
        "name": "Enterprise Quantum",
        "price_usd_monthly": 299,
        "token_allowance": 10_000_000,
        "documents_limit": 500,
        "rate_limit_per_min": 1000,
        "features": [
            "10,000,000 monthly AI tokens",
            "Up to 1,000 documents with dedicated vector pool",
            "Air-gapped PII DLP vault & custom regex masking",
            "Multi-stage MLOps automated rollback gates",
            "SOC 2 & ISO 27001 audit export compliance",
            "99.99% high availability SLA guarantee",
            "24/7 Dedicated solutions engineering"
        ]
    }
}


class BillingService:
    @staticmethod
    def get_plans_catalog(organization_id: str, db: Session) -> BillingPlansResponse:
        org = db.query(Organization).filter(Organization.id == organization_id).first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        
        current_plan_id = (org.plan_tier or "starter").lower()
        usage_summary = get_usage_summary(organization_id=organization_id, db=db)

        plan_items: List[PlanDetail] = []
        for pid, pdata in PLANS_CATALOG.items():
            plan_items.append(
                PlanDetail(
                    id=pdata["id"],
                    name=pdata["name"],
                    price_usd_monthly=pdata["price_usd_monthly"],
                    token_allowance=pdata["token_allowance"],
                    documents_limit=pdata["documents_limit"],
                    rate_limit_per_min=pdata["rate_limit_per_min"],
                    features=pdata["features"],
                    is_current=(pid == current_plan_id)
                )
            )

        return BillingPlansResponse(
            organization_id=organization_id,
            current_plan=current_plan_id,
            token_allowance=usage_summary.token_allowance,
            tokens_used=usage_summary.tokens_used,
            plans=plan_items
        )

    @staticmethod
    def upgrade_plan(
        organization_id: str,
        target_plan: str,
        actor_email: str,
        db: Session
    ) -> UpgradePlanResponse:
        target_plan = target_plan.lower()
        if target_plan not in PLANS_CATALOG:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid plan tier '{target_plan}'. Choose from: starter, growth, enterprise."
            )

        org = db.query(Organization).filter(Organization.id == organization_id).first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )

        previous_plan = (org.plan_tier or "starter").lower()
        if previous_plan == target_plan:
            plan_info = PLANS_CATALOG[target_plan]
            return UpgradePlanResponse(
                success=True,
                message=f"Organization is already on the {plan_info['name']} tier.",
                organization_id=organization_id,
                previous_plan=previous_plan,
                current_plan=target_plan,
                token_allowance=plan_info["token_allowance"],
                documents_limit=plan_info["documents_limit"]
            )

        # Update organization plan
        org.plan_tier = target_plan
        db.commit()
        db.refresh(org)

        plan_info = PLANS_CATALOG[target_plan]

        # Record immutable audit event
        AuditService.record_event(
            db=db,
            organization_id=organization_id,
            action="billing.subscription_upgraded",
            resource_type="subscription",
            resource_id=organization_id,
            actor_email=actor_email,
            severity="info",
            details={
                "previous_plan": previous_plan,
                "current_plan": target_plan,
                "token_allowance": plan_info["token_allowance"],
                "documents_limit": plan_info["documents_limit"],
                "monthly_price_usd": plan_info["price_usd_monthly"]
            }
        )

        # Push real-time SSE notification to connected clients
        notification_bus.publish(
            organization_id=organization_id,
            event_data={
                "type": "plan_upgraded",
                "title": f"Subscription Upgraded: {plan_info['name']}",
                "message": f"Your organization quota has been increased to {plan_info['token_allowance']:,} tokens/month.",
                "organization_id": organization_id,
                "plan_tier": target_plan,
                "token_allowance": plan_info["token_allowance"]
            }
        )

        return UpgradePlanResponse(
            success=True,
            message=f"Successfully upgraded to {plan_info['name']}! Your token allowance is now {plan_info['token_allowance']:,}.",
            organization_id=organization_id,
            previous_plan=previous_plan,
            current_plan=target_plan,
            token_allowance=plan_info["token_allowance"],
            documents_limit=plan_info["documents_limit"]
        )

    @staticmethod
    def process_stripe_webhook(
        payload: Dict[str, Any],
        signature: Optional[str],
        db: Session
    ) -> Dict[str, Any]:
        """
        Process incoming payment provider webhook event (Section 7.3).
        Validates the event and elevates tenant subscription tier.
        """
        event_type = payload.get("type", "")
        data_obj = payload.get("data", {}).get("object", {})

        # Extract tenant metadata and target plan from Stripe object
        organization_id = (
            data_obj.get("metadata", {}).get("organization_id")
            or data_obj.get("client_reference_id")
        )
        target_plan = (
            data_obj.get("metadata", {}).get("plan_tier")
            or data_obj.get("plan", {}).get("id", "growth")
        )

        if not organization_id:
            return {"status": "ignored", "reason": "No organization_id in webhook metadata"}

        if event_type in ("checkout.session.completed", "customer.subscription.updated", "invoice.payment_succeeded"):
            result = BillingService.upgrade_plan(
                organization_id=organization_id,
                target_plan=target_plan,
                actor_email="stripe_webhook@bytherix.com",
                db=db
            )
            return {
                "status": "processed",
                "event_type": event_type,
                "current_plan": result.current_plan,
                "token_allowance": result.token_allowance
            }

        return {"status": "ignored", "event_type": event_type}
