from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.metrics import metrics_registry
from app.core.notifications import notification_bus
from app.db.models.document import Document
from app.db.models.organization import Organization
from app.db.models.usage import UsageRecord
from app.schemas.usage import QuotaAlertItem, UsageSummary
from app.services.audit_service import AuditService

# Default plan limits (Section 7.3 & 7.4)
TIER_LIMITS = {
    "starter": {"token_allowance": 100_000, "documents_limit": 5},
    "growth": {"token_allowance": 1_500_000, "documents_limit": 50},
    "enterprise": {"token_allowance": 10_000_000, "documents_limit": 500},
}


def get_plan_limits(plan_tier: str) -> dict:
    return TIER_LIMITS.get(plan_tier.lower(), TIER_LIMITS["starter"])


def check_token_quota(organization_id: str, db: Session, projected_tokens: int = 0) -> None:
    """
    Enforce token quota before costly inference (Section 7.4).
    Rejects with HTTP 429 if the organization has exhausted its monthly token budget.
    """
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    plan_tier = org.plan_tier if org else "starter"
    limits = get_plan_limits(plan_tier)
    allowance = limits["token_allowance"]

    # Sum total tokens used by organization
    total_used = db.query(func.coalesce(func.sum(UsageRecord.quantity), 0)).filter(
        UsageRecord.organization_id == organization_id,
        UsageRecord.is_billable == True
    ).scalar() or 0

    if (total_used + projected_tokens) >= allowance:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Token allowance exceeded: {total_used:,} / {allowance:,} monthly tokens used for {plan_tier.capitalize()} plan. Please upgrade your subscription tier."
        )


def record_usage(
    organization_id: str,
    user_id: Optional[str],
    event_type: str,
    prompt_tokens: int,
    completion_tokens: int,
    model: str,
    db: Session,
    request_id: Optional[str] = None,
    is_billable: bool = True
) -> UsageRecord:
    """
    Record an immutable usage metering event (Section 7.4).
    Triggers real-time SSE notifications and audit logs on quota warning (>=80%) and exceeded (100%) thresholds (Section 6.3).
    """
    quantity = prompt_tokens + completion_tokens

    # Check prior usage before adding
    prev_used = db.query(func.coalesce(func.sum(UsageRecord.quantity), 0)).filter(
        UsageRecord.organization_id == organization_id,
        UsageRecord.is_billable == True
    ).scalar() or 0

    record = UsageRecord(
        organization_id=organization_id,
        user_id=user_id,
        event_type=event_type,
        unit="tokens",
        quantity=quantity,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        model=model,
        request_id=request_id,
        is_billable=is_billable
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Telemetry for Prometheus (Section 13)
    metrics_registry.record_token_usage(
        model=model,
        organization_id=organization_id,
        tokens=quantity
    )

    # Check new cumulative usage and trigger alerts if threshold crossed
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    plan_tier = org.plan_tier if org else "starter"
    allowance = get_plan_limits(plan_tier)["token_allowance"]

    new_total = prev_used + quantity
    prev_pct = (prev_used / allowance) * 100.0 if allowance > 0 else 0.0
    new_pct = (new_total / allowance) * 100.0 if allowance > 0 else 0.0

    # 1. Quota Exceeded (>= 100%)
    if prev_pct < 100.0 and new_pct >= 100.0:
        notification_bus.publish(
            organization_id,
            {
                "type": "quota_exceeded",
                "title": "Token Quota Exceeded (100% Utilized)",
                "message": f"Monthly token allowance exhausted ({new_total:,} / {allowance:,} tokens). Inference requests are blocked until upgraded.",
                "percentage_used": round(new_pct, 2),
                "tokens_used": new_total,
                "token_allowance": allowance,
                "plan_tier": plan_tier,
            }
        )
        AuditService.record_event(
            db=db,
            organization_id=organization_id,
            action="quota.exceeded",
            resource_type="organization_quota",
            actor_email="system@bytherix.com",
            severity="critical",
            details={
                "tokens_used": new_total,
                "token_allowance": allowance,
                "plan_tier": plan_tier,
                "percentage_used": round(new_pct, 2)
            }
        )
    # 2. Quota Warning (>= 80% and < 100%)
    elif prev_pct < 80.0 and new_pct >= 80.0:
        notification_bus.publish(
            organization_id,
            {
                "type": "quota_warning",
                "title": "Token Quota Warning (80% Utilized)",
                "message": f"Organization has utilized {round(new_pct, 1)}% ({new_total:,} / {allowance:,}) of its monthly token budget. Upgrade to maintain pipeline continuity.",
                "percentage_used": round(new_pct, 2),
                "tokens_used": new_total,
                "token_allowance": allowance,
                "plan_tier": plan_tier,
            }
        )
        AuditService.record_event(
            db=db,
            organization_id=organization_id,
            action="quota.warning",
            resource_type="organization_quota",
            actor_email="system@bytherix.com",
            severity="warning",
            details={
                "tokens_used": new_total,
                "token_allowance": allowance,
                "plan_tier": plan_tier,
                "percentage_used": round(new_pct, 2)
            }
        )

    return record


def get_usage_summary(organization_id: str, db: Session) -> UsageSummary:
    """
    Compute organization usage and quota telemetry (Section 7.4 & 10.2).
    Includes warning thresholds and quota status (Section 6.3).
    """
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    plan_tier = org.plan_tier if org else "starter"
    limits = get_plan_limits(plan_tier)
    allowance = limits["token_allowance"]
    doc_limit = limits["documents_limit"]

    # Aggregates for tokens
    stats = db.query(
        func.coalesce(func.sum(UsageRecord.quantity), 0),
        func.coalesce(func.sum(UsageRecord.prompt_tokens), 0),
        func.coalesce(func.sum(UsageRecord.completion_tokens), 0),
        func.count(UsageRecord.id)
    ).filter(
        UsageRecord.organization_id == organization_id,
        UsageRecord.is_billable == True
    ).first()

    tokens_used = stats[0] if stats else 0
    prompt_tokens = stats[1] if stats else 0
    completion_tokens = stats[2] if stats else 0
    queries_count = stats[3] if stats else 0

    # Document count
    docs_count = db.query(Document).filter(
        Document.organization_id == organization_id,
        Document.status != "deleted"
    ).count()

    percentage = round((tokens_used / allowance) * 100, 2) if allowance > 0 else 100.0
    is_quota_exceeded = tokens_used >= allowance
    is_quota_warning = (percentage >= 80.0) and not is_quota_exceeded

    if is_quota_exceeded:
        quota_status = "exceeded"
    elif is_quota_warning:
        quota_status = "warning"
    else:
        quota_status = "healthy"

    return UsageSummary(
        organization_id=organization_id,
        plan_tier=plan_tier,
        token_allowance=allowance,
        tokens_used=tokens_used,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        queries_count=queries_count,
        percentage_used=percentage,
        documents_count=docs_count,
        documents_limit=doc_limit,
        is_quota_exceeded=is_quota_exceeded,
        is_quota_warning=is_quota_warning,
        warning_threshold=80.0,
        quota_status=quota_status
    )


def get_tenant_alerts(organization_id: str, db: Session) -> List[QuotaAlertItem]:
    """
    Retrieve real-time active quota and latency SLA alerts for the tenant (Section 6.3 & 13.2).
    """
    summary = get_usage_summary(organization_id, db)
    telemetry = metrics_registry.get_dashboard_telemetry()
    alerts: List[QuotaAlertItem] = []

    # 1. Token quota alert
    if summary.is_quota_exceeded:
        alerts.append(
            QuotaAlertItem(
                alert_type="quota_exceeded",
                severity="critical",
                title="Token Quota Exhausted",
                message=f"You have used {summary.tokens_used:,} of {summary.token_allowance:,} monthly tokens (100%). AI inference requests are suspended.",
                current_value=float(summary.tokens_used),
                threshold_value=float(summary.token_allowance),
                unit="tokens",
                action_required=True,
                action_label="Upgrade Plan"
            )
        )
    elif summary.is_quota_warning:
        alerts.append(
            QuotaAlertItem(
                alert_type="quota_warning",
                severity="warning",
                title="Token Quota Warning",
                message=f"You have used {summary.percentage_used}% ({summary.tokens_used:,} / {summary.token_allowance:,}) of your monthly token allowance.",
                current_value=float(summary.tokens_used),
                threshold_value=float(summary.token_allowance * 0.8),
                unit="tokens",
                action_required=False,
                action_label="Review Usage"
            )
        )

    # 2. Document limit alert
    if summary.documents_count >= summary.documents_limit:
        alerts.append(
            QuotaAlertItem(
                alert_type="document_limit_exceeded",
                severity="warning",
                title="Document Storage Limit Reached",
                message=f"You have stored {summary.documents_count} / {summary.documents_limit} allowed documents on the {summary.plan_tier.capitalize()} plan.",
                current_value=float(summary.documents_count),
                threshold_value=float(summary.documents_limit),
                unit="documents",
                action_required=True,
                action_label="Upgrade Storage"
            )
        )

    # 3. Latency Budget SLA alert
    if telemetry.get("is_latency_budget_breached"):
        p95 = telemetry.get("p95_latency_ms", 0.0)
        budget = telemetry.get("latency_budget_ms", 2000.0)
        alerts.append(
            QuotaAlertItem(
                alert_type="latency_budget_exceeded",
                severity="warning",
                title="Latency Budget SLA Warning",
                message=f"Rolling p95 request latency is {p95}ms, exceeding the {budget}ms target SLA budget.",
                current_value=p95,
                threshold_value=budget,
                unit="ms",
                action_required=False,
                action_label="View Observability"
            )
        )

    return alerts
