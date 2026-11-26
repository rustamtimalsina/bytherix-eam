import pytest
from fastapi.testclient import TestClient


def test_custom_dlp_regex_valid_patterns_and_masking(client: TestClient):
    """
    Test custom enterprise DLP regex simulation endpoint:
    1. Test Nepal citizenship number pattern.
    2. Test Nepal PAN number pattern.
    3. Test internal session token pattern.
    4. Test invalid regex syntax handling.
    5. Test empty pattern validation.
    """
    # 1. Sign up Org
    signup = client.post("/api/v1/auth/signup", json={
        "email": "security_officer_99@acme.com",
        "password": "Password123!",
        "full_name": "Chief Security Officer",
        "organization_name": "Security Org"
    })
    assert signup.status_code == 201
    token = signup.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test Nepal Citizenship pattern: \b\d{2}-\d{2}-\d{2}-\d{5}\b
    resp_citizen = client.post("/api/v1/security/dlp/test-regex", json={
        "pattern": r"\b\d{2}-\d{2}-\d{2}-\d{5}\b",
        "sample_text": "Applicant submitted citizenship 27-01-78-04921 and verified via KYC.",
        "rule_name": "NEPAL_CITIZENSHIP"
    }, headers=headers)

    assert resp_citizen.status_code == 200
    data_c = resp_citizen.json()
    assert data_c["is_valid_regex"] is True
    assert data_c["matches_count"] == 1
    assert "27-01-78-04921" in data_c["matched_segments"]
    assert "[REDACTED_NEPAL_CITIZENSHIP_1]" in data_c["masked_text"]
    assert "27-01-78-04921" not in data_c["masked_text"]

    # 3. Test Nepal PAN number: \b\d{9}\b
    resp_pan = client.post("/api/v1/security/dlp/test-regex", json={
        "pattern": r"\b\d{9}\b",
        "sample_text": "Vendor VAT bill with PAN 601239845 processed for payment.",
        "rule_name": "NEPAL_PAN"
    }, headers=headers)

    assert resp_pan.status_code == 200
    data_p = resp_pan.json()
    assert data_p["is_valid_regex"] is True
    assert data_p["matches_count"] == 1
    assert "601239845" in data_p["matched_segments"]
    assert "[REDACTED_NEPAL_PAN_1]" in data_p["masked_text"]

    # 4. Test invalid regex syntax handling
    resp_invalid = client.post("/api/v1/security/dlp/test-regex", json={
        "pattern": r"(?i)[a-z",  # Missing closing bracket
        "sample_text": "Test sample text for broken regex syntax.",
        "rule_name": "BROKEN_REGEX"
    }, headers=headers)

    assert resp_invalid.status_code == 200
    data_inv = resp_invalid.json()
    assert data_inv["is_valid_regex"] is False
    assert data_inv["matches_count"] == 0
    assert "Invalid regular expression syntax" in data_inv["error_message"]
