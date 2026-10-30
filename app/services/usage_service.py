from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models.document import Document
from app.db.models.organization import Organization
from app.db.models.usage import UsageRecord
from app.schemas.usage import UsageSummary

# Default plan limits (Section 7.3 & 7.4)
TIER_LIMITS = {
    "starter": {"token_allowance": 100_000, "documents_limit": 5},
    "growth": {"token_allowance": 1_000_000, "documents_limit": 50},
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
    """Record an immutable usage metering event (Section 7.4)."""
    quantity = prompt_tokens + completion_tokens
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
    return record


def get_usage_summary(organization_id: str, db: Session) -> UsageSummary:
    """
    Compute organization usage and quota telemetry (Section 7.4 & 10.2).
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
        is_quota_exceeded=tokens_used >= allowance
    )
