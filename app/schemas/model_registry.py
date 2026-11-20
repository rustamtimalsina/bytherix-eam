from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ModelRegisterCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Unique model identifier")
    description: Optional[str] = Field(None, max_length=500)
    task_type: str = Field("text-generation", description="text-generation, embeddings, classification")


class ModelVersionCreate(BaseModel):
    version: str = Field(..., min_length=2, max_length=30, description="e.g. v1.0.0, v1.1.0")
    input_schema: Optional[str] = Field("{\"type\": \"string\", \"description\": \"Prompt or text\"}")
    output_schema: Optional[str] = Field("{\"type\": \"string\", \"description\": \"Completion output\"}")
    parameters: Optional[str] = Field("{\"temperature\": 0.7, \"context_window\": 8192}")
    training_data_ref: Optional[str] = Field(None, description="Dataset reference or version")
    accuracy_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    latency_p95_ms: Optional[float] = Field(None, ge=0.0)


class ModelPromoteRequest(BaseModel):
    target_stage: str = Field(..., description="evaluation | staging | production | archived")
    reason: Optional[str] = Field(None, max_length=500, description="Release notes / justification for stage promotion")


class PredictionRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Prompt or text input for inference")
    version: Optional[str] = Field(None, description="Specific model version (defaults to active production version)")


class PredictionResponse(BaseModel):
    model_name: str
    version: str
    prediction: str
    latency_ms: float
    tokens_consumed: int
    lifecycle_stage: str


class ModelVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    registered_model_id: str
    version: str
    lifecycle_stage: str
    artifact_checksum: str
    input_schema: str
    output_schema: str
    parameters: str
    training_data_ref: Optional[str] = None
    accuracy_score: Optional[float] = None
    latency_p95_ms: Optional[float] = None
    promoted_by: Optional[str] = None
    promoted_at: Optional[datetime] = None
    created_at: datetime


class RegisteredModelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    name: str
    description: Optional[str] = None
    task_type: str
    active_version_id: Optional[str] = None
    created_at: datetime
    versions: List[ModelVersionResponse] = []


class RegisteredModelSummary(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    task_type: str
    active_version_id: Optional[str] = None
    active_version_name: Optional[str] = None
    total_versions: int
    created_at: datetime


class ModelMonitoringStatus(BaseModel):
    model_id: str
    model_name: str
    active_version: Optional[str] = None
    active_version_id: Optional[str] = None
    baseline_latency_p95_ms: float = 150.0
    current_latency_p95_ms: float = 150.0
    latency_drift_percent: float = 0.0
    is_drift_detected: bool = False
    alert_severity: str = "healthy"  # healthy | warning | critical
    error_rate_percent: float = 0.0
    total_predictions: int = 0
    rollback_candidate_id: Optional[str] = None
    rollback_candidate_version: Optional[str] = None
    recommendation: str = "Model operating within expected performance bounds."
