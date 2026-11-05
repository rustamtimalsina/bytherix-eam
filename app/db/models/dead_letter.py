from typing import Optional, Dict, Any, TYPE_CHECKING
from sqlalchemy import ForeignKey, Integer, String, Text, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.organization import Organization


class DeadLetterJob(Base):
    """
    Dead-Letter Queue (DLQ) model for isolating poisoned or unrecoverable background tasks.
    (Section 11.3 & 14)
    """
    __tablename__ = "dead_letter_jobs"

    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    task_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    task_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    resource_type: Mapped[str] = mapped_column(String(50), default="document", nullable=False, index=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    payload: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=False)
    stack_trace: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Status: failed, retrying, resolved, purged
    status: Mapped[str] = mapped_column(String(50), default="failed", index=True, nullable=False)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization")

    __table_args__ = (
        Index("idx_dlq_org_created", "organization_id", "created_at"),
        Index("idx_dlq_org_status", "organization_id", "status"),
    )
