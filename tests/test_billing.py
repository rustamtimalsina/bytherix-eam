def test_list_billing_plans_catalog(client):
    # 1. Sign up tenant
    signup_data = {
        "email": "billing_user@bytherix.com",
        "password": "Password123!",
        "full_name": "Billing User",
        "organization_name": "Billing Org"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_data)
    assert resp.status_code == 201
    token = resp.json()["access_token"]
    org_id = resp.json()["organization_id"]
    headers = {"Authorization": f"Bearer {token}", "X-Organization-Id": org_id}

    # 2. Query billing plans
    plans_resp = client.get("/api/v1/billing/plans", headers=headers)
    assert plans_resp.status_code == 200
    data = plans_resp.json()
    assert data["current_plan"] == "starter"
    assert len(data["plans"]) == 3
    plan_names = [p["name"] for p in data["plans"]]
    assert "Starter Free" in plan_names
    assert "Growth Pro" in plan_names
    assert "Enterprise Quantum" in plan_names


def test_upgrade_plan_flow(client):
    # 1. Sign up tenant
    signup_data = {
        "email": "upgrade_user@bytherix.com",
        "password": "Password123!",
        "full_name": "Upgrade User",
        "organization_name": "Upgrade Org"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_data)
    assert resp.status_code == 201
    token = resp.json()["access_token"]
    org_id = resp.json()["organization_id"]
    headers = {"Authorization": f"Bearer {token}", "X-Organization-Id": org_id}

    # 2. Upgrade to growth plan
    upgrade_resp = client.post(
        "/api/v1/billing/upgrade",
        json={"plan_tier": "growth"},
        headers=headers
    )
    assert upgrade_resp.status_code == 200
    assert upgrade_resp.json()["success"] is True
    assert upgrade_resp.json()["current_plan"] == "growth"
    assert upgrade_resp.json()["token_allowance"] == 1_500_000
    assert upgrade_resp.json()["documents_limit"] == 50

    # 3. Verify plans endpoint now marks growth as active
    plans_resp = client.get("/api/v1/billing/plans", headers=headers)
    assert plans_resp.status_code == 200
    assert plans_resp.json()["current_plan"] == "growth"


def test_stripe_webhook_processing(client):
    # 1. Sign up tenant
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

    # 2. Dispatch Stripe webhook event for this tenant
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

    # 3. Verify usage endpoint reflects enterprise quota
    usage_resp = client.get("/api/v1/usage", headers=headers)
    assert usage_resp.status_code == 200
    assert usage_resp.json()["plan_tier"] == "enterprise"
    assert usage_resp.json()["token_allowance"] == 10_000_000


def test_list_invoices_and_download_pdf(client):
    # 1. Sign up tenant
    signup_data = {
        "email": "invoice_tester@bytherix.com",
        "password": "Password123!",
        "full_name": "Invoice Tester",
        "organization_name": "Invoice Org"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_data)
    assert resp.status_code == 201
    token = resp.json()["access_token"]
    org_id = resp.json()["organization_id"]
    headers = {"Authorization": f"Bearer {token}", "X-Organization-Id": org_id}

    # 2. Fetch invoice ledger
    inv_resp = client.get("/api/v1/billing/invoices", headers=headers)
    assert inv_resp.status_code == 200
    data = inv_resp.json()
    assert data["organization_id"] == org_id
    assert len(data["invoices"]) >= 2
    first_invoice = data["invoices"][0]
    assert "INV-2026" in first_invoice["invoice_number"]
    assert first_invoice["status"] == "PAID"

    # 3. Download official PDF invoice receipt
    download_url = first_invoice["pdf_download_url"]
    pdf_resp = client.get(download_url, headers=headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert b"%PDF" in pdf_resp.content[:10]
    assert len(pdf_resp.content) > 1000
