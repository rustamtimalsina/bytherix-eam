from enum import Enum
from typing import Set


class Role(str, Enum):
    PLATFORM_OPERATOR = "platform_operator"
    OWNER = "organization_owner"
    ADMIN = "organization_administrator"
    DEVELOPER = "developer"
    AI_ML_ENGINEER = "ai_ml_engineer"
    ANALYST = "analyst"
    BILLING_MANAGER = "billing_manager"
    VIEWER = "viewer"


class Permission(str, Enum):
    # Organization
    ORG_READ = "org:read"
    ORG_UPDATE = "org:update"
    ORG_DELETE = "org:delete"
    
    # Members & Invites
    MEMBERS_READ = "members:read"
    MEMBERS_INVITE = "members:invite"
    MEMBERS_UPDATE = "members:update"
    MEMBERS_REMOVE = "members:remove"
    
    # API Keys
    API_KEYS_READ = "api_keys:read"
    API_KEYS_CREATE = "api_keys:create"
    API_KEYS_REVOKE = "api_keys:revoke"

    # Billing & Plans
    BILLING_READ = "billing:read"
    BILLING_UPDATE = "billing:update"

    # Documents & RAG
    DOCUMENTS_READ = "documents:read"
    DOCUMENTS_UPLOAD = "documents:upload"
    DOCUMENTS_DELETE = "documents:delete"
    RAG_QUERY = "rag:query"

    # Agents
    AGENTS_EXECUTE = "agents:execute"
    AGENTS_APPROVE = "agents:approve"

    # Models & MLOps
    MODELS_READ = "models:read"
    MODELS_REGISTER = "models:register"
    MODELS_PROMOTE = "models:promote"
    MODELS_ROLLBACK = "models:rollback"
    PREDICTIONS_CALL = "predictions:call"
    MONITORING_READ = "monitoring:read"

    # Audit
    AUDIT_READ = "audit:read"


# Role-to-Permissions Mapping (Section 3.1 & 3.2)
ROLE_PERMISSIONS: dict[Role, Set[Permission]] = {
    Role.PLATFORM_OPERATOR: set(Permission),
    
    Role.OWNER: set(Permission),  # Full access inside the tenant
    
    Role.ADMIN: {
        Permission.ORG_READ, Permission.ORG_UPDATE,
        Permission.MEMBERS_READ, Permission.MEMBERS_INVITE, Permission.MEMBERS_UPDATE, Permission.MEMBERS_REMOVE,
        Permission.API_KEYS_READ, Permission.API_KEYS_CREATE, Permission.API_KEYS_REVOKE,
        Permission.DOCUMENTS_READ, Permission.DOCUMENTS_UPLOAD, Permission.DOCUMENTS_DELETE,
        Permission.RAG_QUERY,
        Permission.AGENTS_EXECUTE, Permission.AGENTS_APPROVE,
        Permission.MODELS_READ, Permission.MODELS_REGISTER, Permission.MODELS_PROMOTE, Permission.MODELS_ROLLBACK,
        Permission.PREDICTIONS_CALL, Permission.MONITORING_READ,
        Permission.AUDIT_READ,
    },
    
    Role.DEVELOPER: {
        Permission.ORG_READ,
        Permission.API_KEYS_READ, Permission.API_KEYS_CREATE,
        Permission.DOCUMENTS_READ, Permission.DOCUMENTS_UPLOAD,
        Permission.RAG_QUERY,
        Permission.AGENTS_EXECUTE,
        Permission.MODELS_READ, Permission.MODELS_REGISTER,
        Permission.PREDICTIONS_CALL,
    },
    
    Role.AI_ML_ENGINEER: {
        Permission.ORG_READ,
        Permission.DOCUMENTS_READ, Permission.DOCUMENTS_UPLOAD,
        Permission.RAG_QUERY,
        Permission.MODELS_READ, Permission.MODELS_REGISTER, Permission.MODELS_PROMOTE, Permission.MODELS_ROLLBACK,
        Permission.PREDICTIONS_CALL, Permission.MONITORING_READ,
    },
    
    Role.ANALYST: {
        Permission.ORG_READ,
        Permission.DOCUMENTS_READ,
        Permission.RAG_QUERY,
        Permission.AGENTS_EXECUTE,
        Permission.PREDICTIONS_CALL,
    },
    
    Role.BILLING_MANAGER: {
        Permission.ORG_READ,
        Permission.BILLING_READ, Permission.BILLING_UPDATE,
        Permission.AUDIT_READ,
    },
    
    Role.VIEWER: {
        Permission.ORG_READ,
        Permission.DOCUMENTS_READ,
        Permission.AUDIT_READ,
    },
}


def has_permission(role: Role | str, permission: Permission) -> bool:
    """Check if a given role possesses a specific permission."""
    try:
        r = Role(role)
        return permission in ROLE_PERMISSIONS.get(r, set())
    except ValueError:
        return False
