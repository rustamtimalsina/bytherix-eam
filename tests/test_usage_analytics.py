import pytest
from fastapi.testclient import TestClient


def test_usage_analytics_endpoint_and_multi_tenant_isolation(client: TestClient):
    # 1. Signup Tenant A
    signup_a = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "owner_spend_a@bytherix.com",
            "password": "SpendSecurePassword123!",
            "full_name": "Spend Owner A",
            "organization_name": "Spend Org Alpha"
        }
    )
    assert signup_a.status_code == 201
    token_a = signup_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Signup Tenant B
    signup_b = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "owner_spend_b@bytherix.com",
            "password": "SpendSecurePassword123!",
            "full_name": "Spend Owner B",
            "organization_name": "Spend Org Beta"
        }
    )
    assert signup_b.status_code == 201
    token_b = signup_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. Query analytics for Tenant A
    res_a = client.get("/api/v1/usage/analytics", headers=headers_a)
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert "token_allowance" in data_a
    assert "tokens_used" in data_a
    assert "estimated_cost_usd" in data_a
    assert "models_breakdown" in data_a
    assert "recent_activity" in data_a
    assert data_a["plan_tier"] == "starter"

    # 4. Verify Tenant B analytics are isolated
    res_b = client.get("/api/v1/usage/analytics", headers=headers_b)
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["organization_id"] != data_a["organization_id"]
