
"""
Central SQLAlchemy model registry.

Importing every model here ensures that SQLAlchemy metadata
and Alembic can discover all application models.
"""

from app.db.base import Base

# Authentication and organization models
from app.db.models.user import User
from app.db.models.organization import Organization
from app.db.models.membership import Membership, Role
from app.db.models.login_attempt import LoginAttempt

# API and document models
from app.db.models.api_key import APIKey
from app.db.models.document import Document
from app.db.models.chunk import DocumentChunk

# Usage and conversation models
from app.db.models.usage import UsageRecord
from app.db.models.conversation import (
    ConversationSession,
    ConversationMessage,
)

# Agent models
from app.db.models.agent import (
    AgentExecution,
    AgentStepTrace,
)

# Model registry and prediction models
from app.db.models.model_registry import (
    RegisteredModel,
    ModelVersion,
    PredictionLog,
)

# Audit models
from app.db.models.audit import AuditLog


__all__ = [
    "Base",
    "User",
    "Organization",
    "Membership",
    "Role",
    "LoginAttempt",
    "APIKey",
    "Document",
    "DocumentChunk",
    "UsageRecord",
    "ConversationSession",
    "ConversationMessage",
    "AgentExecution",
    "AgentStepTrace",
    "RegisteredModel",
    "ModelVersion",
    "PredictionLog",
    "AuditLog",
]
