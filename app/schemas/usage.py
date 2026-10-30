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
