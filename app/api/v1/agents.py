from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.permissions import Permission
from app.core.tenant_context import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.agent import (
    WorkflowDefinition,
    AgentExecutionCreate,
    AgentExecutionSummary,
    AgentExecutionDetail,
    AgentApprovalRequest,
)
from app.services.agent_service import (
    list_approved_workflows,
    start_agent_workflow,
    list_agent_executions,
    get_execution_detail,
    process_approval,
)

router = APIRouter(prefix="/agents", tags=["Governed AI Agent Workflows"])


@router.get("/workflows", response_model=List[WorkflowDefinition], status_code=status.HTTP_200_OK)
def get_approved_workflows(
    context: TenantContext = Depends(require_permission(Permission.AGENTS_EXECUTE))
):
    """
    List approved workflow definitions and versions (Section 8.4 #1 & Section 10.2).
    """
    return list_approved_workflows()


@router.post("/executions", response_model=AgentExecutionDetail, status_code=status.HTTP_201_CREATED)
def trigger_agent_workflow(
    data: AgentExecutionCreate,
    context: TenantContext = Depends(require_permission(Permission.AGENTS_EXECUTE)),
    db: Session = Depends(get_db)
):
    """
    Execute a bounded agent workflow using allowlisted tools (Section 8.4 & 11).
    Pauses at approval gate if a consequential action is requested.
    """
    return start_agent_workflow(
        organization_id=context.organization.id,
        user_id=context.user.id if context.user else None,
        workflow_name=data.workflow_name,
        input_prompt=data.input_prompt,
        db=db
    )


@router.get("/executions", response_model=List[AgentExecutionSummary], status_code=status.HTTP_200_OK)
def list_workflow_executions(
    context: TenantContext = Depends(require_permission(Permission.AGENTS_EXECUTE)),
    db: Session = Depends(get_db)
):
    """
    List all past and current agent workflow executions for the organization.
    """
    return list_agent_executions(organization_id=context.organization.id, db=db)


@router.get("/executions/{execution_id}", response_model=AgentExecutionDetail, status_code=status.HTTP_200_OK)
def get_workflow_execution_trace(
    execution_id: str,
    context: TenantContext = Depends(require_permission(Permission.AGENTS_EXECUTE)),
    db: Session = Depends(get_db)
):
    """
    Inspect full execution trace, thoughts, tool inputs, and outputs (Section 8.4 & 11).
    """
    return get_execution_detail(
        organization_id=context.organization.id,
        execution_id=execution_id,
        db=db
    )


@router.post("/executions/{execution_id}/approval", response_model=AgentExecutionDetail, status_code=status.HTTP_200_OK)
def approve_or_reject_agent_action(
    execution_id: str,
    data: AgentApprovalRequest,
    context: TenantContext = Depends(require_permission(Permission.AGENTS_APPROVE)),
    db: Session = Depends(get_db)
):
    """
    Human-in-the-loop authorization gate (Section 8.4 #6).
    Only Admins and Owners can approve or reject consequential tools.
    """
    return process_approval(
        organization_id=context.organization.id,
        execution_id=execution_id,
        approve=data.approve,
        reason=data.reason,
        db=db
    )
