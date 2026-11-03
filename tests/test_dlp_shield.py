import pytest
from fastapi.testclient import TestClient
from app.services.dlp_service import DLPShieldService, _luhn_check


def test_luhn_check():
    # Valid Visa test card
    assert _luhn_check("4532015112830366") is True
    # Invalid card number
    assert _luhn_check("4532015112830367") is False


def test_dlp_shield_clean_text():
    clean_text = "What is the architecture of Bytherix EAM platform?"
    result = DLPShieldService.scan_and_mask(clean_text)
    assert result.is_masked is False
    assert result.masked_text == clean_text
    assert len(result.entities_detected) == 0
    assert len(result.categories) == 0


def test_dlp_shield_api_keys_and_tokens():
    text = "Here is my key: sk-abcdefghijklmnopqrstuvwxyz123456 and AWS AKIAIOSFODNN7EXAMPLE"
    result = DLPShieldService.scan_and_mask(text)
    assert result.is_masked is True
    assert "sk-" not in result.masked_text
    assert "AKIA" not in result.masked_text
    assert "[REDACTED_API_KEY_" in result.masked_text
    assert "API_KEY" in result.categories


def test_dlp_shield_pii_emails_and_phones():
    text = "Contact user at rustam.timalsina@bytherix.com or +1 800-555-0199 for enterprise deployment."
    result = DLPShieldService.scan_and_mask(text)
    assert result.is_masked is True
    assert "rustam.timalsina@bytherix.com" not in result.masked_text
    assert "[REDACTED_EMAIL_1]" in result.masked_text
    assert "[REDACTED_PHONE_1]" in result.masked_text
    assert "EMAIL" in result.categories
    assert "PHONE_NUMBER" in result.categories


def test_dlp_shield_database_uri_and_credentials():
    text = "Connect using postgresql://dbuser:MySuperSecretPwd123@db.prod.internal:5432/bytherix_eam"
    result = DLPShieldService.scan_and_mask(text)
    assert result.is_masked is True
    assert "MySuperSecretPwd123" not in result.masked_text
    assert "[REDACTED_DATABASE_URI_1]" in result.masked_text
    assert "DATABASE_URI" in result.categories


def test_dlp_shield_ssn():
    text = "Employee record SSN is 000-12-3456."
    result = DLPShieldService.scan_and_mask(text)
    assert result.is_masked is True
    assert "000-12-3456" not in result.masked_text
    assert "[REDACTED_SSN_1]" in result.masked_text
    assert "SSN" in result.categories


def _get_auth_headers(client: TestClient):
    signup_data = {
        "email": "sec_admin@bytherix.com",
        "password": "Password123!",
        "full_name": "Security Officer",
        "organization_name": "Bytherix SecOps"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_data)
    token = resp.json()["access_token"]
    org_id = resp.json()["organization_id"]
    return {"Authorization": f"Bearer {token}", "X-Organization-Id": org_id}


def test_dlp_rules_endpoint(client: TestClient):
    headers = _get_auth_headers(client)
    response = client.get("/api/v1/security/dlp/rules", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["shield_active"] is True
    assert data["rules_count"] >= 8
    assert any(r["id"] == "API_KEY" for r in data["rules"])


def test_dlp_scan_endpoint(client: TestClient):
    headers = _get_auth_headers(client)
    payload = {"text": "Test AWS key AKIAIOSFODNN7EXAMPLE and email dev@bytherix.com"}
    response = client.post("/api/v1/security/dlp/scan", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["is_masked"] is True
    assert len(data["entities_detected"]) == 2
    assert "API_KEY" in data["categories"]
    assert "EMAIL" in data["categories"]


def test_dlp_chat_auto_redaction(client: TestClient):
    """Verify that chatting with secrets automatically invokes DLP redaction before RAG."""
    headers = _get_auth_headers(client)
    chat_resp = client.post(
        "/api/v1/chat",
        json={"question": "Find info for secret token sk-1234567890abcdef12345678"},
        headers=headers
    )
    assert chat_resp.status_code == 200
    data = chat_resp.json()
    assert "dlp_shield" in data
    assert data["dlp_shield"] is not None
    assert data["dlp_shield"]["is_masked"] is True
    assert "API_KEY" in data["dlp_shield"]["categories"]
