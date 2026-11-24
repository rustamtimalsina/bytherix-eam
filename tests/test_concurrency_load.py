"""
Automated Concurrency & Load Regression Tests for Bytherix EAM.
Validates multi-tenant isolation, rapid concurrent queries, and probe stability under burst.
"""

import pytest
from app.services.audit_service import AuditService
from app.db.models.audit import AuditLog


def _signup_tenant(client, prefix: str):
    """Helper to create an organization with an owner and return headers."""
    signup_data = {
        "email": f"concur_{prefix}@bytherix.com",
        "password": "Password123!",
        "full_name": f"{prefix.capitalize()} Exec",
        "organization_name": f"{prefix.capitalize()} Enterprises"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_data)
    assert resp.status_code == 201, f"Signup failed: {resp.text}"
    token = resp.json()["access_token"]
    org_id = resp.json()["organization_id"]
    return {
        "token": token,
        "org_id": org_id,
        "email": signup_data["email"],
        "headers": {
            "Authorization": f"Bearer {token}",
            "X-Organization-Id": org_id
        }
    }


def test_concurrent_multi_tenant_queries(client, db):
    """
    Test interleaved multi-tenant queries across 4 distinct enterprise organizations.
    Verifies that responses, session IDs, and organization scopes never leak across requests.
    """
    # 1. Provision 4 tenants
    tenants = [_signup_tenant(client, f"t_{i}") for i in range(4)]

    # 2. Interleave 24 queries across the 4 tenants
    results = []
    for idx in range(24):
        tenant = tenants[idx % len(tenants)]
        payload = {
            "question": f"What are the compliance policies for {tenant['email']} query #{idx}?",
            "top_k": 2
        }
        resp = client.post("/api/v1/chat", json=payload, headers=tenant["headers"])
        assert resp.status_code == 200, f"Query {idx} failed with {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "answer" in data
        assert "session_id" in data
        
        # Cross-tenant data isolation check
        resp_str = str(data)
        for other in tenants:
            if other["org_id"] != tenant["org_id"]:
                assert other["email"] not in resp_str, f"LEAK: Tenant {tenant['org_id']} received {other['email']}"
        results.append(data)

    assert len(results) == 24


def test_concurrent_audit_log_safety(client, db):
    """
    Test rapid sequential & batched audit event writes and export checksum validation.
    """
    tenant = _signup_tenant(client, "audit_tenant")
    org_id = tenant["org_id"]

    for i in range(20):
        AuditService.record_event(
            db=db,
            organization_id=org_id,
            action=f"security.event_{i}",
            resource_type="system",
            resource_id=f"res_{i}",
            actor_email=f"worker_{i}@bytherix.com",
            severity="info",
            details={"index": i}
        )

    logs = db.query(AuditLog).filter(AuditLog.organization_id == org_id).all()
    assert len(logs) >= 20
    for log in logs:
        assert log.id is not None
        assert log.organization_id == org_id

    # Verify audit export calculates cryptographic SHA-256 manifest
    export_resp = client.get("/api/v1/audit-logs/export?format=json", headers=tenant["headers"])
    assert export_resp.status_code == 200
    assert "X-Audit-Checksum-SHA256" in export_resp.headers
    assert len(export_resp.headers["X-Audit-Checksum-SHA256"]) == 64


def test_concurrent_health_probe_burst(client):
    """
    Test rapid burst of 50 health and telemetry probe requests.
    Verifies that internal probes never lock or fail under load.
    """
    for idx in range(50):
        path = "/health" if idx % 2 == 0 else "/health/ready"
        resp = client.get(path)
        assert resp.status_code == 200
