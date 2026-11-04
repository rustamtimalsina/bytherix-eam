from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class PlanDetail(BaseModel):
    id: str
    name: str
    price_usd_monthly: int
    token_allowance: int
    documents_limit: int
    rate_limit_per_min: int
    features: List[str]
    is_current: bool = False


class BillingPlansResponse(BaseModel):
    organization_id: str
    current_plan: str
    token_allowance: int
    tokens_used: int
    plans: List[PlanDetail]


class UpgradePlanRequest(BaseModel):
    plan_tier: str = Field(..., pattern="^(starter|growth|enterprise)$", description="Target plan tier")
    payment_method_id: Optional[str] = Field(default=None, description="Optional payment token / payment method id")


class UpgradePlanResponse(BaseModel):
    success: bool
    message: str
    organization_id: str
    previous_plan: str
    current_plan: str
    token_allowance: int
    documents_limit: int


class StripeWebhookEvent(BaseModel):
    type: str = Field(..., description="Stripe webhook event type, e.g. customer.subscription.updated")
    id: str = Field(default="evt_simulated", description="Stripe event ID")
    data: Dict[str, Any] = Field(..., description="Stripe event object payload")
