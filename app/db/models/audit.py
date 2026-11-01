from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AuditLog(Base):
    """
    Enterprise Immutable Audit Log (Section 10 & 13).
    Captures system actions, security events, and compliance traces across tenants.
    """
    __tablename__ = "audit_logs"

    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Actor performing the event (user, API key, or system service)
    actor_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    actor_email: Mapped[str] = mapped_column(String(255), nullable=False, default="system@bytherix.com")
    
    # Action type, e.g.: auth.login, document.upload, apikey.create, model.promote, agent.execute
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    
    # Target resource classification, e.g.: document, model, apikey, member, quota
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Severity classification: info, warning, critical
    severity: Mapped[str] = mapped_column(String(20), default="info", nullable=False)
    
    # Contextual metadata (IP address, user agent, token costs, parameter changes in JSON)
    details: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="127.0.0.1")
    
    # Relationships
    organization: Mapped["Organization"] = relationship("Organization")

    __table_args__ = (
        Index("idx_audit_org_created", "organization_id", "created_at"),
        Index("idx_audit_org_action", "organization_id", "action"),
    )
