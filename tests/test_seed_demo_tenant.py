"""
Automated Regression Tests for Turnkey Demo Workspace Seeder
============================================================
Verifies:
1. Seeding provisions organization, admin credentials, API keys, documents, chunks, and models.
2. Idempotent execution (running repeatedly does not fail or duplicate resources).
3. Demo API key and JWT authentication against FastAPI endpoints.
"""

import pytest
from starlette.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.models.organization import Organization
from app.db.models.user import User
from app.db.models.membership import Membership
from app.db.models.api_key import APIKey
from app.db.models.document import Document
from app.db.models.chunk import DocumentChunk
from app.db.models.model_registry import RegisteredModel, ModelVersion, PredictionLog
from app.db.models.usage import UsageRecord
from app.core.security import verify_password, hash_api_key
from scripts.seed_demo_tenant import seed_demo_tenant


def test_seed_demo_tenant_success(db: Session):
    """Verify demo tenant seeder creates all required enterprise assets cleanly."""
    summary = seed_demo_tenant(
        db=db,
        org_name="Test Bytherix Demo Corp",
        org_slug="test-bytherix-demo",
        admin_email="test.demo.admin@bytherix.com",
        admin_password="TestDemoPassword123!",
        reset=True
    )

    # 1. Organization assertions
    org = db.query(Organization).filter(Organization.slug == "test-bytherix-demo").first()
    assert org is not None
    assert org.name == "Test Bytherix Demo Corp"
    assert org.plan_tier == "enterprise"
    assert org.is_active is True

    # 2. Admin User assertions
    admin = db.query(User).filter(User.email == "test.demo.admin@bytherix.com").first()
    assert admin is not None
    assert verify_password("TestDemoPassword123!", admin.hashed_password) is True

    # Membership
    mem = db.query(Membership).filter(
        Membership.user_id == admin.id,
        Membership.organization_id == org.id
    ).first()
    assert mem is not None
    assert mem.role in ("organization_owner", "owner")
    assert mem.status == "active"

    # 3. Master API Key assertions
    api_key_rec = db.query(APIKey).filter(
        APIKey.organization_id == org.id,
        APIKey.key_hash == hash_api_key("bx_live_demo_enterprise_master_9941a")
    ).first()
    assert api_key_rec is not None
    assert api_key_rec.is_revoked is False
    assert api_key_rec.scopes == "*"

    # 4. Enterprise Documents & Chunks assertions
    docs = db.query(Document).filter(Document.organization_id == org.id).all()
    assert len(docs) == 3
    for d in docs:
        assert d.status == "ready"
        assert d.file_size_bytes > 0
        assert d.page_count > 0

    chunks = db.query(DocumentChunk).filter(DocumentChunk.organization_id == org.id).all()
    assert len(chunks) == 12
    for c in chunks:
        assert c.token_count > 0
        assert c.content is not None
        assert len(c.content) > 20

    # 5. MLOps Model Registry assertions
    models = db.query(RegisteredModel).filter(RegisteredModel.organization_id == org.id).all()
    assert len(models) == 3
    model_names = {m.name for m in models}
    assert "gpt-4o-enterprise" in model_names
    assert "gpt-4o-mini-fast" in model_names
    assert "claude-3-5-sonnet-enterprise" in model_names

    prod_model = next(m for m in models if m.name == "gpt-4o-enterprise")
    assert prod_model.active_version_id is not None
    active_v = db.get(ModelVersion, prod_model.active_version_id)
    assert active_v is not None
    assert active_v.lifecycle_stage == "production"
    assert active_v.latency_p95_ms == 145.0

    # Prediction Logs
    logs = db.query(PredictionLog).filter(PredictionLog.organization_id == org.id).all()
    assert len(logs) >= 10

    # 6. Usage Records
    usage_count = db.query(UsageRecord).filter(UsageRecord.organization_id == org.id).count()
    assert usage_count >= 5

    # Summary verification
    assert summary["organization_slug"] == "test-bytherix-demo"
    assert summary["documents_count"] == 3
    assert summary["chunks_count"] == 12
    assert summary["models_count"] == 3


def test_seed_demo_tenant_idempotency(db: Session):
    """Verify executing the seeder multiple times without reset is idempotent and non-destructive."""
    summary1 = seed_demo_tenant(
        db=db,
        org_name="Idempotent Demo Corp",
        org_slug="idempotent-demo",
        admin_email="idempotent.admin@bytherix.com",
        reset=False
    )

    summary2 = seed_demo_tenant(
        db=db,
        org_name="Idempotent Demo Corp",
        org_slug="idempotent-demo",
        admin_email="idempotent.admin@bytherix.com",
        reset=False
    )

    assert summary1["organization_id"] == summary2["organization_id"]
    org_count = db.query(Organization).filter(Organization.slug == "idempotent-demo").count()
    assert org_count == 1

    docs_count = db.query(Document).filter(Document.organization_id == summary1["organization_id"]).count()
    assert docs_count == 3


def test_demo_api_key_authenticates_endpoint(db: Session, client: TestClient):
    """Verify that the seeded master demo API key allows authenticating API endpoints."""
    seed_demo_tenant(
        db=db,
        org_name="Auth Demo Corp",
        org_slug="auth-demo-slug",
        admin_email="auth.admin@bytherix.com",
        reset=True
    )

    # Call models list with X-API-Key
    resp = client.get(
        "/api/v1/models",
        headers={"X-API-Key": "bx_live_demo_enterprise_master_9941a"}
    )
    assert resp.status_code == 200
    models_data = resp.json()
    assert isinstance(models_data, list)
    assert len(models_data) >= 3
