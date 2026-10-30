from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class UsageRecord(Base):
    """
    Metered usage record for multi-tenant billing and quota tracking (Section 7.4).
    Tracks tokens, model invocations, and storage units per tenant.
    """
    __tablename__ = "usage_records"

    organization_id: Mapped[str] = mapped_column(
        String(36), 
        ForeignKey("organizations.id", ondelete="CASCADE"), 
        index=True, 
        nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        String(36), 
        ForeignKey("users.id", ondelete="SET NULL"), 
        nullable=True
    )
    event_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # e.g. "rag_chat", "embedding"
    unit: Mapped[str] = mapped_column(String(32), default="tokens", nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    model: Mapped[str] = mapped_column(String(100), default="gpt-4o-mini", nullable=False)
    request_id: Mapped[str] = mapped_column(String(64), nullable=True)
    is_billable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="usage_records")
