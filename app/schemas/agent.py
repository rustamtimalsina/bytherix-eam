from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class WorkflowDefinition(BaseModel):
    id: str
    name: str
    description: str
    category: str
    allowed_tools: List[str]
    has_approval_gate: bool


class AgentExecutionCreate(BaseModel):
    workflow_name: str = Field(min_length=2, max_length=100)
    input_prompt: str = Field(min_length=3, max_length=2000)


class AgentStepTraceResponse(BaseModel):
    id: str
    step_number: int
    thought: Optional[str] = None
    tool_name: Optional[str] = None
    tool_input: Optional[str] = None
    tool_output: Optional[str] = None
    status: str
    requires_approval: bool
    created_at: datetime


class AgentExecutionSummary(BaseModel):
    id: str
    workflow_name: str
    status: str
    input_prompt: str
    total_steps: int
    has_pending_approval: bool
    created_at: datetime
    updated_at: datetime


class AgentExecutionDetail(BaseModel):
    id: str
    workflow_name: str
    status: str
    input_prompt: str
    final_output: Optional[str] = None
    total_steps: int
    pending_tool_name: Optional[str] = None
    pending_tool_args: Optional[str] = None
    traces: List[AgentStepTraceResponse]
    created_at: datetime
    updated_at: datetime


class AgentApprovalRequest(BaseModel):
    approve: bool
    reason: Optional[str] = None
