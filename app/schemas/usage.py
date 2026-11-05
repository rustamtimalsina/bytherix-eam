from pydantic import BaseModel


class UsageSummary(BaseModel):
    """Organization usage and quota summary schema (Section 7.4 & 10.2)."""
    organization_id: str
    plan_tier: str
    token_allowance: int
    tokens_used: int
    prompt_tokens: int
    completion_tokens: int
    queries_count: int
    percentage_used: float
    documents_count: int
    documents_limit: int
    is_quota_exceeded: bool
    is_quota_warning: bool = False
    warning_threshold: float = 80.0
    quota_status: str = "healthy"  # "healthy", "warning", "exceeded"


class QuotaAlertItem(BaseModel):
    """Real-time quota and latency alert schema (Section 6.3 & 13.2)."""
    alert_type: str  # "quota_warning", "quota_exceeded", "latency_budget_exceeded"
    severity: str    # "info", "warning", "critical"
    title: str
    message: str
    current_value: float
    threshold_value: float
    unit: str
    action_required: bool
    action_label: str
