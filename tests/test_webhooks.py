from fastapi.testclient import TestClient
from app.services.webhook_service import WebhookService


def test_webhook_lifecycle_and_tenant_isolation(client: TestClient):
    """
    Test Phase Webhook Subsystem:
    1. Sign up Org Alpha (Rustam) and Org Beta (External).
    2. Register webhook endpoint with events and description.
    3. Verify secret returned on creation (whsec_...).
    4. List webhooks and verify secret is masked (prefix only).
    5. Update webhook configuration and status.
    6. Send test ping and verify HMAC signature and delivery logging.
    7. List delivery history.
    8. Verify tenant isolation (Org Beta cannot view or modify Org Alpha's webhook).
    9. Delete webhook and verify 404 on subsequent requests.
    """
    # 1. Sign up Org Alpha Owner
    signup_a = {
        "email": "webhook_owner_a@bytherix.com",
        "password": "Password123!",
        "full_name": "Webhook Owner A",
        "organization_name": "Alpha Corp"
    }
    resp_a = client.post("/api/v1/auth/signup", json=signup_a)
    assert resp_a.status_code == 201
    token_a = resp_a.json()["access_token"]
    org_a = resp_a.json()["organization_id"]
    headers_a = {"Authorization": f"Bearer {token_a}", "X-Organization-Id": org_a}

    # 2. Sign up Org Beta Owner
    signup_b = {
        "email": "webhook_owner_b@bytherix.com",
        "password": "Password123!",
        "full_name": "Webhook Owner B",
        "organization_name": "Beta Corp"
    }
    resp_b = client.post("/api/v1/auth/signup", json=signup_b)
    assert resp_b.status_code == 201
    token_b = resp_b.json()["access_token"]
    org_b = resp_b.json()["organization_id"]
    headers_b = {"Authorization": f"Bearer {token_b}", "X-Organization-Id": org_b}

    # 3. Validation test: Invalid URL should return 422
    invalid_payload = {
        "url": "ftp://invalid-protocol.com/webhook",
        "events": ["*"],
        "description": "Invalid protocol"
    }
    invalid_resp = client.post("/api/v1/webhooks", json=invalid_payload, headers=headers_a)
    assert invalid_resp.status_code == 422

    # 4. Create Webhook for Org Alpha
    create_payload = {
        "url": "https://api.bytherix.com/events/listener",
        "events": ["document.processed", "model.promoted"],
        "description": "Production Event Listener"
    }
    create_resp = client.post("/api/v1/webhooks", json=create_payload, headers=headers_a)
    assert create_resp.status_code == 201
    webhook_data = create_resp.json()
    webhook_id = webhook_data["id"]
    raw_secret = webhook_data["secret"]

    assert webhook_data["url"] == "https://api.bytherix.com/events/listener"
    assert webhook_data["description"] == "Production Event Listener"
    assert "document.processed" in webhook_data["events"]
    assert "model.promoted" in webhook_data["events"]
    assert raw_secret.startswith("whsec_")
    assert webhook_data["is_active"] is True

    # 5. List Webhooks for Org Alpha (verify secret is masked)
    list_resp = client.get("/api/v1/webhooks", headers=headers_a)
    assert list_resp.status_code == 200
    webhooks_list = list_resp.json()
    assert len(webhooks_list) == 1
    listed_webhook = webhooks_list[0]
    assert listed_webhook["id"] == webhook_id
    assert "secret" not in listed_webhook or listed_webhook.get("secret") is None
    assert listed_webhook["secret_prefix"].startswith("whsec_")

    # 6. Get single webhook details
    get_resp = client.get(f"/api/v1/webhooks/{webhook_id}", headers=headers_a)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == webhook_id

    # 7. Update Webhook
    update_payload = {
        "events": ["*"],
        "description": "All events subscription",
        "is_active": True
    }
    patch_resp = client.patch(f"/api/v1/webhooks/{webhook_id}", json=update_payload, headers=headers_a)
    assert patch_resp.status_code == 200
    updated_data = patch_resp.json()
    assert updated_data["events"] == ["*"]
    assert updated_data["description"] == "All events subscription"

    # 8. Test Webhook Ping
    test_resp = client.post(f"/api/v1/webhooks/{webhook_id}/test", headers=headers_a)
    assert test_resp.status_code == 200
    test_data = test_resp.json()
    assert "delivery_id" in test_data
    assert "signature_preview" in test_data
    assert test_data["signature_preview"].startswith("sha256=")

    # 9. List Deliveries
    deliveries_resp = client.get(f"/api/v1/webhooks/{webhook_id}/deliveries", headers=headers_a)
    assert deliveries_resp.status_code == 200
    deliveries = deliveries_resp.json()
    assert len(deliveries) >= 1
    assert deliveries[0]["event_type"] == "ping"
    assert deliveries[0]["subscription_id"] == webhook_id

    # 10. Tenant Isolation: Org Beta cannot see or touch Org Alpha's webhook
    beta_list = client.get("/api/v1/webhooks", headers=headers_b)
    assert beta_list.status_code == 200
    assert len(beta_list.json()) == 0

    beta_get = client.get(f"/api/v1/webhooks/{webhook_id}", headers=headers_b)
    assert beta_get.status_code == 404

    beta_delete = client.delete(f"/api/v1/webhooks/{webhook_id}", headers=headers_b)
    assert beta_delete.status_code == 404

    beta_test = client.post(f"/api/v1/webhooks/{webhook_id}/test", headers=headers_b)
    assert beta_test.status_code == 404

    # 11. Delete Webhook as Org Alpha
    del_resp = client.delete(f"/api/v1/webhooks/{webhook_id}", headers=headers_a)
    assert del_resp.status_code == 204

    # Verify 404 after deletion
    verify_del = client.get(f"/api/v1/webhooks/{webhook_id}", headers=headers_a)
    assert verify_del.status_code == 404


def test_hmac_signature_calculation_and_verification():
    """Test cryptographic integrity of HMAC-SHA256 signatures."""
    secret = "whsec_test_secret_1234567890abcdef"
    payload = b'{"event":"document.processed","data":{"document_id":"doc-123"}}'

    signature = WebhookService.sign_payload(payload, secret)
    assert signature.startswith("sha256=")

    # Valid verification
    assert WebhookService.verify_signature(payload, secret, signature) is True

    # Tampered payload fails
    tampered_payload = b'{"event":"document.processed","data":{"document_id":"doc-999"}}'
    assert WebhookService.verify_signature(tampered_payload, secret, signature) is False

    # Tampered secret fails
    wrong_secret = "whsec_wrong_secret_1234567890abcdef"
    assert WebhookService.verify_signature(payload, wrong_secret, signature) is False
