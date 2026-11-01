import csv
import io
from fastapi.testclient import TestClient


def test_audit_logs_lifecycle_and_tenant_isolation(client: TestClient):
    """
    Test audit log listing, baseline seeding, action hooks, tenant isolation, stats, and CSV export.
    (Section 10 & 13)
    """
    # 1. Sign up Org A
    resp_a = client.post("/api/v1/auth/signup", json={
        "email": "auditor_a@acme.com",
        "password": "Password123!",
        "full_name": "Auditor A",
        "organization_name": "Acme Corp"
    })
    assert resp_a.status_code == 201
    token_a = resp_a.json()["access_token"]
    org_a_id = resp_a.json()["organization_id"]
    headers_a = {
        "Authorization": f"Bearer {token_a}",
        "X-Organization-Id": org_a_id
    }

    # 2. Query audit logs for Org A -> Baseline logs should exist
    resp = client.get("/api/v1/audit-logs", headers=headers_a)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1
    # Check that auth.signup was also logged
    actions = [item["action"] for item in data["items"]]
    assert "auth.signup" in actions or "auth.owner_registered" in actions

    # 3. Create an API Key in Org A to trigger security audit event
    key_resp = client.post("/api/v1/api-keys", json={
        "name": "Audit Test Key",
        "scopes": "*"
    }, headers=headers_a)
    assert key_resp.status_code == 201
    key_id = key_resp.json()["id"]

    # Revoke it
    del_resp = client.delete(f"/api/v1/api-keys/{key_id}", headers=headers_a)
    assert del_resp.status_code == 200

    # 4. Verify the new events are recorded
    resp = client.get("/api/v1/audit-logs", headers=headers_a)
    assert resp.status_code == 200
    actions_updated = [item["action"] for item in resp.json()["items"]]
    assert "security.api_key_created" in actions_updated
    assert "security.api_key_revoked" in actions_updated

    # 5. Test filtering by severity
    warn_resp = client.get("/api/v1/audit-logs?severity=warning", headers=headers_a)
    assert warn_resp.status_code == 200
    for item in warn_resp.json()["items"]:
        assert item["severity"] == "warning"

    # 6. Test audit stats aggregation endpoint
    stats_resp = client.get("/api/v1/audit-logs/stats", headers=headers_a)
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_events"] >= 3
    assert stats["warning_count"] >= 2  # api_key_created and api_key_revoked are warning
    assert stats["total_events"] == stats["info_count"] + stats["warning_count"] + stats["critical_count"]

    # 7. Test RFC 4180 CSV export
    csv_resp = client.get("/api/v1/audit-logs/export", headers=headers_a)
    assert csv_resp.status_code == 200
    assert csv_resp.headers["content-type"].startswith("text/csv")
    assert "attachment; filename=" in csv_resp.headers["content-disposition"]
    
    # Parse CSV content to verify structure
    csv_reader = csv.reader(io.StringIO(csv_resp.text))
    rows = list(csv_reader)
    assert len(rows) > 1  # Header + at least one row
    assert rows[0] == [
        "Timestamp (UTC)",
        "Event ID",
        "Actor Email",
        "Action",
        "Resource Type",
        "Resource ID",
        "Severity",
        "IP Address",
        "Metadata Details"
    ]

    # 8. Test Tenant Isolation with Org B
    resp_b = client.post("/api/v1/auth/signup", json={
        "email": "auditor_b@globex.com",
        "password": "Password123!",
        "full_name": "Auditor B",
        "organization_name": "Globex Corp"
    })
    assert resp_b.status_code == 201
    token_b = resp_b.json()["access_token"]
    org_b_id = resp_b.json()["organization_id"]
    headers_b = {
        "Authorization": f"Bearer {token_b}",
        "X-Organization-Id": org_b_id
    }

    # Org B queries audit logs -> Must not see any of Org A's events or API keys
    resp_b_logs = client.get("/api/v1/audit-logs", headers=headers_b)
    assert resp_b_logs.status_code == 200
    b_items = resp_b_logs.json()["items"]
    for item in b_items:
        assert item["organization_id"] == org_b_id
        assert item["organization_id"] != org_a_id
        assert "Audit Test Key" not in str(item.get("details", ""))
