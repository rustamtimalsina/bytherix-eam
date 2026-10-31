from datetime import datetime
from typing import List, Optional
from sqlalchemy import Float, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RegisteredModel(Base):
    """
    MLOps Model Registry catalog entry (Section 9 & 16.1 #4).
    Tenant boundaries strictly enforced via organization_id.
    """
    __tablename__ = "registered_models"

    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    task_type: Mapped[str] = mapped_column(
        String(50), 
        default="text-generation", 
        nullable=False
    )  # text-generation | embeddings | classification | summarization
    active_version_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Relationships
    versions: Mapped[List["ModelVersion"]] = relationship(
        "ModelVersion",
        back_populates="registered_model",
        cascade="all, delete-orphan",
        order_by="ModelVersion.created_at.desc()"
    )


class ModelVersion(Base):
    """
    Versioned model artifact & lifecycle deployment state machine (Section 9.1 & 9.2).
    Lifecycle states: draft -> evaluation -> staging -> production -> archived.
    """
    __tablename__ = "model_versions"

    registered_model_id: Mapped[str] = mapped_column(
        ForeignKey("registered_models.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    version: Mapped[str] = mapped_column(String(30), nullable=False)  # e.g., v1.0.0, v1.1.0
    lifecycle_stage: Mapped[str] = mapped_column(
        String(30),
        default="draft",
        nullable=False,
        index=True
    )  # draft | evaluation | staging | production | archived

    # Artifact metadata & reproducibility checks (Section 9.2 #2, #3, #4)
    artifact_checksum: Mapped[str] = mapped_column(String(64), nullable=False)  # SHA-256
    input_schema: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    output_schema: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    parameters: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    training_data_ref: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Benchmark metrics (Section 9.2 #6)
    accuracy_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    latency_p95_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Governance & Approval promotion metadata (Section 9.2 #7)
    promoted_by: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    promoted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    registered_model: Mapped["RegisteredModel"] = relationship(
        "RegisteredModel",
        back_populates="versions"
    )
    prediction_logs: Mapped[List["PredictionLog"]] = relationship(
        "PredictionLog",
        back_populates="model_version",
        cascade="all, delete-orphan"
    )


class PredictionLog(Base):
    """
    Inference request lifecycle logging & telemetry tracking (Section 9.3 & 9.4).
    """
    __tablename__ = "prediction_logs"

    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    model_version_id: Mapped[str] = mapped_column(
        ForeignKey("model_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    input_payload: Mapped[str] = mapped_column(Text, nullable=False)
    prediction_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tokens_consumed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        default="success",
        nullable=False
    )  # success | failed | error

    # Relationships
    model_version: Mapped["ModelVersion"] = relationship(
        "ModelVersion",
        back_populates="prediction_logs"
    )
