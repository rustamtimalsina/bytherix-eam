"""
Automated Security & DLP Webhook Alert Test Suite for Bytherix EAM.
Validates real-time webhook dispatching on DLP violations, Slack/Discord payload formatting,
and automated MLOps model SLA breach alerts.
"""

import json
from unittest.mock import patch, MagicMock
import pytest
from app.db.models.webhook import WebhookSubscription, WebhookDelivery
from app.db.models.model_registry import RegisteredModel, ModelVersion, PredictionLog
from app.services.webhook_service import WebhookService
from app.services.model_service import ModelService


def _signup_tenant(client, prefix: str):
    """Helper to create an organization with an owner and return headers."""
    signup_data = {
        "email": f"alert_{prefix}@bytherix.com",
        "password": "Password123!",
        "full_name": f"{prefix.capitalize()} Security Admin",
        "organization_name": f"{prefix.capitalize()} Security Org"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_data)
    assert resp.status_code == 201
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


def test_dlp_violation_triggers_webhook(client, db):
    """
    Test that entering PII/secret in chat triggers an automated dlp.violation webhook delivery.
    """
    tenant = _signup_tenant(client, "dlp_test")
    
    # 1. Create a generic webhook subscription
    sub = WebhookSubscription(
        organization_id=tenant["org_id"],
        url="https://api.enterprise-siem.com/webhooks/bytherix",
        secret="whsec_testsecret1234567890",
        description="SIEM DLP Alerts",
        events=["dlp.violation"],
        is_active=True
    )
    db.add(sub)
    db.commit()

    # 2. Mock only WebhookService outgoing delivery to avoid intercepting TestClient
    mock_delivery_instance = MagicMock()
    mock_delivery_instance.post.return_value = MagicMock(status_code=200, text='{"status": "received"}')

    with patch("app.services.webhook_service.httpx.Client") as mock_client_cls:
        mock_client_cls.return_value.__enter__.return_value = mock_delivery_instance
        
        # 3. Post a chat query containing an AWS Secret Token
        payload = {
            "question": "Here is my secret AWS key: AKIAIOSFODNN7EXAMPLE please help configure S3."
        }
        resp = client.post("/api/v1/chat", json=payload, headers=tenant["headers"])
        assert resp.status_code == 200
        
        # Verify response was masked by DLP shield
        data = resp.json()
        assert data["dlp_shield"]["is_masked"] is True

    # 4. Assert WebhookDelivery record was saved in database
    delivery = db.query(WebhookDelivery).filter(
        WebhookDelivery.subscription_id == sub.id,
        WebhookDelivery.event_type == "dlp.violation"
    ).first()

    assert delivery is not None
    assert delivery.status == "delivered"
    assert delivery.payload["event"] == "dlp.violation"
    assert "categories" in delivery.payload["data"]
    assert delivery.payload["data"]["entity_count"] >= 1


def test_slack_card_payload_formatting(client, db):
    """
    Test that webhooks to hooks.slack.com format rich Slack Block Kit cards.
    """
    tenant = _signup_tenant(client, "slack_test")
    
    sub = WebhookSubscription(
        organization_id=tenant["org_id"],
        url="https://hooks.slack.com/services/T000/B000/XXXXX",
        secret="whsec_slacksecret123",
        description="Slack Security Channel",
        events=["dlp.violation"],
        is_active=True
    )
    db.add(sub)
    db.commit()

    captured_payload = None

    def capture_post(url, content, headers):
        nonlocal captured_payload
        captured_payload = json.loads(content.decode("utf-8"))
        m = MagicMock()
        m.status_code = 200
        m.text = "ok"
        return m

    mock_client = MagicMock()
    mock_client.post.side_effect = capture_post

    with patch("app.services.webhook_service.httpx.Client") as mock_client_cls:
        mock_client_cls.return_value.__enter__.return_value = mock_client
        payload = {"question": "Employee SSN: 123-45-6789 please process benefits."}
        resp = client.post("/api/v1/chat", json=payload, headers=tenant["headers"])
        assert resp.status_code == 200

    assert captured_payload is not None
    assert "text" in captured_payload
    assert "attachments" in captured_payload
    blocks = captured_payload["attachments"][0]["blocks"]
    assert any("DLP Policy Violation" in b.get("text", {}).get("text", "") for b in blocks if b["type"] == "header")


def test_discord_embed_payload_formatting(client, db):
    """
    Test that webhooks to discord.com/api/webhooks format Discord Embed cards.
    """
    tenant = _signup_tenant(client, "discord_test")
    
    sub = WebhookSubscription(
        organization_id=tenant["org_id"],
        url="https://discord.com/api/webhooks/12345/abcdef",
        secret="whsec_discord123",
        description="Discord SecOps",
        events=["dlp.violation"],
        is_active=True
    )
    db.add(sub)
    db.commit()

    captured_payload = None

    def capture_post(url, content, headers):
        nonlocal captured_payload
        captured_payload = json.loads(content.decode("utf-8"))
        m = MagicMock()
        m.status_code = 200
        m.text = "ok"
        return m

    mock_client = MagicMock()
    mock_client.post.side_effect = capture_post

    with patch("app.services.webhook_service.httpx.Client") as mock_client_cls:
        mock_client_cls.return_value.__enter__.return_value = mock_client
        payload = {"question": "Here is my secret AWS key: AKIAIOSFODNN7DISCORD for benefits."}
        resp = client.post("/api/v1/chat", json=payload, headers=tenant["headers"])
        assert resp.status_code == 200

    assert captured_payload is not None
    assert "embeds" in captured_payload
    embed = captured_payload["embeds"][0]
    assert "DLP Policy Violation" in embed["title"]
    assert embed["color"] == 14431526  # Red


def test_model_sla_breach_webhook_alert(client, db):
    """
    Test that high latency drift on a model triggers an automated model.sla_breach webhook.
    """
    tenant = _signup_tenant(client, "mlops_test")
    org_id = tenant["org_id"]

    # 1. Register subscription for model SLA alerts
    sub = WebhookSubscription(
        organization_id=org_id,
        url="https://monitoring.bytherix.com/alerts",
        secret="whsec_mlops123",
        description="MLOps Drift Monitor",
        events=["model.sla_breach"],
        is_active=True
    )
    db.add(sub)
    db.commit()

    # 2. Register a model and a production version with 100ms baseline
    model = RegisteredModel(
        organization_id=org_id,
        name="llama-3-classifier",
        description="Fast production classifier",
        task_type="text-generation"
    )
    db.add(model)
    db.commit()

    v1 = ModelVersion(
        registered_model_id=model.id,
        organization_id=org_id,
        version="v1.0.0",
        lifecycle_stage="production",
        artifact_checksum="0123456789abcdef" * 4,
        latency_p95_ms=100.0,
        accuracy_score=0.95
    )
    db.add(v1)
    db.commit()
    model.active_version_id = v1.id
    db.commit()

    # 3. Insert 10 prediction logs with extreme latency (350ms, a +250% drift)
    for i in range(10):
        log = PredictionLog(
            organization_id=org_id,
            model_version_id=v1.id,
            input_payload='{"prompt": "test"}',
            prediction_output='{"response": "done"}',
            latency_ms=350.0,
            status="success"
        )
        db.add(log)
    db.commit()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = '{"received": true}'

    with patch("app.services.webhook_service.httpx.Client") as mock_client_cls:
        mock_client_cls.return_value.__enter__.return_value.post.return_value = mock_resp
        
        # 4. Query model monitoring endpoint
        resp = client.get(f"/api/v1/models/{model.id}/monitoring", headers=tenant["headers"])
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_drift_detected"] is True

    # 5. Assert webhook delivery was dispatched
    delivery = db.query(WebhookDelivery).filter(
        WebhookDelivery.subscription_id == sub.id,
        WebhookDelivery.event_type == "model.sla_breach"
    ).first()

    assert delivery is not None
    assert delivery.status == "delivered"
    assert delivery.payload["data"]["model_id"] == model.id
    assert delivery.payload["data"]["drift_percent"] > 25.0
