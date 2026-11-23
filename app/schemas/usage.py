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


class ModelUsageStat(BaseModel):
    """Breakdown of usage and estimated cost by model."""
    model: str
    tokens: int
    prompt_tokens: int
    completion_tokens: int
    queries: int
    estimated_cost_usd: float
    percentage_of_total: float


class UsageLedgerItem(BaseModel):
    """Detailed immutable usage record item for tenant audit & ledger export."""
    id: str
    created_at: str
    event_type: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost_usd: float


class UsageAnalyticsOut(BaseModel):
    """Comprehensive AI spend, token consumption, and burn rate analytics."""
    organization_id: str
    plan_tier: str
    token_allowance: int
    tokens_used: int
    prompt_tokens: int
    completion_tokens: int
    percentage_used: float
    queries_count: int
    documents_count: int
    documents_limit: int
    quota_status: str
    estimated_cost_usd: float
    cost_per_query_usd: float
    daily_burn_rate: int
    projected_days_remaining: int
    models_breakdown: list[ModelUsageStat]
    recent_activity: list[UsageLedgerItem]

