from typing import List, Optional
from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AgentExecution(Base):
    """
    Persistent record of a governed AI agent workflow execution (Section 8.4 & 11).
    Tenant boundaries strictly enforced via organization_id.
    """
    __tablename__ = "agent_executions"

    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    workflow_name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(
        String(30),
        default="running",
        nullable=False,
        index=True
    )  # "running" | "pending_approval" | "completed" | "failed" | "rejected"
    input_params_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    final_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    total_steps: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Human-in-the-loop approval gate metadata (Section 8.4 #6)
    pending_tool_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    pending_tool_args: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    traces: Mapped[List["AgentStepTrace"]] = relationship(
        "AgentStepTrace",
        back_populates="execution",
        cascade="all, delete-orphan",
        order_by="AgentStepTrace.step_number"
    )


class AgentStepTrace(Base):
    """
    Audit trail step record showing reasoning, tool call, input, and output (Section 8.4 & 11).
    """
    __tablename__ = "agent_step_traces"

    execution_id: Mapped[str] = mapped_column(
        ForeignKey("agent_executions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    thought: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tool_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tool_input: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tool_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30),
        default="completed",
        nullable=False
    )  # "completed" | "pending_approval" | "rejected" | "failed"
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    execution: Mapped["AgentExecution"] = relationship(
        "AgentExecution",
        back_populates="traces"
    )
