import pytest
from fastapi.testclient import TestClient


def test_billing_plans_catalog(client: TestClient):
    """Test Section 7.3 & 10.2: list subscription plans and active tenant tier."""
    signup_data = {
        "email": "billing_user@bytherix.com",
        "password": "Password123!",
        "full_name": "Billing Admin",
        "organization_name": "Billing Corp"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_data)
    assert resp.status_code == 201
    token = resp.json()["access_token"]
    org_id = resp.json()["organization_id"]
    headers = {"Authorization": f"Bearer {token}", "X-Organization-Id": org_id}

    # 1. Fetch plans
    plans_resp = client.get("/api/v1/billing/plans", headers=headers)
    assert plans_resp.status_code == 200
    data = plans_resp.json()
    assert data["current_plan"] == "starter"
    assert data["organization_id"] == org_id
    assert len(data["plans"]) == 3
    
    plan_ids = [p["id"] for p in data["plans"]]
    assert "starter" in plan_ids
    assert "growth" in plan_ids
    assert "enterprise" in plan_ids


def test_billing_upgrade_flow(client: TestClient):
    """Test Section 7.3: upgrade plan to Growth tier elevates token budget and records audit event."""
    signup_data = {
        "email": "upgrader@bytherix.com",
        "password": "Password123!",
        "full_name": "Upgrade Admin",
        "organization_name": "Growth Org"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_data)
    assert resp.status_code == 201
    token = resp.json()["access_token"]
    org_id = resp.json()["organization_id"]
    headers = {"Authorization": f"Bearer {token}", "X-Organization-Id": org_id}

    # 1. Upgrade to Growth Pro
    upgrade_payload = {"plan_tier": "growth"}
    up_resp = client.post("/api/v1/billing/upgrade", json=upgrade_payload, headers=headers)
    assert up_resp.status_code == 200
    up_data = up_resp.json()
    assert up_data["success"] is True
    assert up_data["current_plan"] == "growth"
    assert up_data["token_allowance"] == 1_500_000

    # 2. Verify usage summary reflects new quota
    usage_resp = client.get("/api/v1/usage", headers=headers)
    assert usage_resp.status_code == 200
    assert usage_resp.json()["plan_tier"] == "growth"
    assert usage_resp.json()["token_allowance"] == 1_500_000

    # 3. Test invalid plan rejection
    bad_resp = client.post("/api/v1/billing/upgrade", json={"plan_tier": "super_vip"}, headers=headers)
    assert bad_resp.status_code == 422  # Pydantic validation error


def test_stripe_webhook_simulation(client: TestClient):
    """Test Section 7.3: Stripe webhook event triggers backend subscription elevation."""
    signup_data = {
        "email": "stripe_tenant@bytherix.com",
        "password": "Password123!",
        "full_name": "Stripe Tenant",
        "organization_name": "Stripe Org"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_data)
    assert resp.status_code == 201
    token = resp.json()["access_token"]
    org_id = resp.json()["organization_id"]
    headers = {"Authorization": f"Bearer {token}", "X-Organization-Id": org_id}

    # Dispatch Stripe webhook event for this tenant
    webhook_payload = {
        "type": "checkout.session.completed",
        "id": "evt_test_12345",
        "data": {
            "object": {
                "id": "cs_test_abc",
                "client_reference_id": org_id,
                "metadata": {
                    "organization_id": org_id,
                    "plan_tier": "enterprise"
                }
            }
        }
    }
    hook_resp = client.post(
        "/api/v1/billing/webhook",
        json=webhook_payload,
        headers={"Stripe-Signature": "t=123,v1=simulated_sig"}
    )
    assert hook_resp.status_code == 200
    assert hook_resp.json()["status"] == "processed"
    assert hook_resp.json()["current_plan"] == "enterprise"

    # Verify usage endpoint reflects enterprise quota
    usage_resp = client.get("/api/v1/usage", headers=headers)
    assert usage_resp.status_code == 200
    assert usage_resp.json()["plan_tier"] == "enterprise"
    assert usage_resp.json()["token_allowance"] == 10_000_000
