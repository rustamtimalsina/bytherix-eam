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


def test_create_checkout_session(client):
    # 1. Sign up tenant
    signup_data = {
        "email": "checkout_user@bytherix.com",
        "password": "Password123!",
        "full_name": "Checkout User",
        "organization_name": "Checkout Org"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_data)
    assert resp.status_code == 201
    token = resp.json()["access_token"]
    org_id = resp.json()["organization_id"]
    headers = {"Authorization": f"Bearer {token}", "X-Organization-Id": org_id}

    # 2. Request checkout session for Growth tier
    chk_resp = client.post(
        "/api/v1/billing/checkout",
        json={"plan_tier": "growth"},
        headers=headers
    )
    assert chk_resp.status_code == 200
    chk_data = chk_resp.json()
    assert "cs_bx_" in chk_data["checkout_session_id"]
    assert chk_data["plan_tier"] == "growth"
    assert chk_data["amount_usd"] == 49.0
    assert chk_data["provider"] == "stripe"
    assert "billing/checkout" in chk_data["checkout_url"]


def test_subscription_status(client):
    # 1. Sign up tenant
    signup_data = {
        "email": "status_user@bytherix.com",
        "password": "Password123!",
        "full_name": "Status User",
        "organization_name": "Status Org"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_data)
    assert resp.status_code == 201
    token = resp.json()["access_token"]
    org_id = resp.json()["organization_id"]
    headers = {"Authorization": f"Bearer {token}", "X-Organization-Id": org_id}

    # 2. Check initial status
    status_resp = client.get("/api/v1/billing/status", headers=headers)
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["organization_id"] == org_id
    assert status_data["plan_tier"] == "starter"
    assert status_data["subscription_status"] == "active"
    assert status_data["is_grace_period"] is False


def test_stripe_webhook_processing_and_idempotency(client):
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

    # 2. Dispatch Stripe webhook event
    unique_evt_id = f"evt_test_unique_{org_id[:8]}"
    webhook_payload = {
        "type": "checkout.session.completed",
        "id": unique_evt_id,
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

    # 3. Test Idempotency: Dispatch exact same event again
    dup_resp = client.post(
        "/api/v1/billing/webhook",
        json=webhook_payload,
        headers={"Stripe-Signature": "t=123,v1=simulated_sig"}
    )
    assert dup_resp.status_code == 200
    assert dup_resp.json()["status"] == "idempotent_duplicate_ignored"

    # 4. Verify usage endpoint reflects enterprise quota
    usage_resp = client.get("/api/v1/usage", headers=headers)
    assert usage_resp.status_code == 200
    assert usage_resp.json()["plan_tier"] == "enterprise"
    assert usage_resp.json()["token_allowance"] == 10_000_000


def test_stripe_webhook_payment_failed_and_grace_period(client):
    # 1. Sign up tenant
    signup_data = {
        "email": "failed_pay_user@bytherix.com",
        "password": "Password123!",
        "full_name": "Failed Pay User",
        "organization_name": "Failed Pay Org"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_data)
    assert resp.status_code == 201
    token = resp.json()["access_token"]
    org_id = resp.json()["organization_id"]
    headers = {"Authorization": f"Bearer {token}", "X-Organization-Id": org_id}

    # 2. Dispatch payment failed event
    failed_evt = {
        "type": "invoice.payment_failed",
        "id": f"evt_fail_{org_id[:8]}",
        "data": {
            "object": {
                "id": "in_test_fail",
                "client_reference_id": org_id,
                "metadata": {"organization_id": org_id}
            }
        }
    }
    fail_resp = client.post("/api/v1/billing/webhook", json=failed_evt)
    assert fail_resp.status_code == 200
    assert fail_resp.json()["status"] == "processed"
    assert fail_resp.json()["subscription_status"] == "past_due"
    assert fail_resp.json()["grace_period_days"] == 7

    # 3. Verify status endpoint reflects past_due and grace period
    status_resp = client.get("/api/v1/billing/status", headers=headers)
    assert status_resp.status_code == 200
    assert status_resp.json()["subscription_status"] == "past_due"
    assert status_resp.json()["is_grace_period"] is True
    assert status_resp.json()["grace_period_days_remaining"] == 7


def test_stripe_webhook_subscription_cancellation(client):
    # 1. Sign up tenant and upgrade to Growth
    signup_data = {
        "email": "cancel_user@bytherix.com",
        "password": "Password123!",
        "full_name": "Cancel User",
        "organization_name": "Cancel Org"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_data)
    assert resp.status_code == 201
    token = resp.json()["access_token"]
    org_id = resp.json()["organization_id"]
    headers = {"Authorization": f"Bearer {token}", "X-Organization-Id": org_id}

    client.post("/api/v1/billing/upgrade", json={"plan_tier": "growth"}, headers=headers)

    # 2. Dispatch cancellation webhook
    cancel_evt = {
        "type": "customer.subscription.deleted",
        "id": f"evt_cancel_{org_id[:8]}",
        "data": {
            "object": {
                "id": "sub_test_cancelled",
                "client_reference_id": org_id,
                "metadata": {"organization_id": org_id}
            }
        }
    }
    cancel_resp = client.post("/api/v1/billing/webhook", json=cancel_evt)
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "processed"
    assert cancel_resp.json()["current_plan"] == "starter"

    # 3. Verify downgraded to starter
    plans_resp = client.get("/api/v1/billing/plans", headers=headers)
    assert plans_resp.status_code == 200
    assert plans_resp.json()["current_plan"] == "starter"


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
