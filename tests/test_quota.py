import io
from fastapi.testclient import TestClient


def test_free_tier_document_quota_enforcement(client: TestClient, sample_pdf_bytes: bytes):
    """Verify Section 7.4 quota enforcement blocks uploads beyond 5 documents."""
    # 1. Signup fresh organization
    signup_payload = {
        "email": "quota_test@bytherix.com",
        "password": "Password123!",
        "full_name": "Quota Tester",
        "organization_name": "Quota Corp"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_payload)
    assert resp.status_code == 201
    token = resp.json()["access_token"]
    org_id = resp.json()["organization_id"]
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Organization-Id": org_id
    }

    # 2. Upload 5 documents (Allowed on Free Tier)
    for i in range(5):
        files = {"file": (f"doc_{i+1}.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")}
        r = client.post("/api/v1/documents", files=files, headers=headers)
        assert r.status_code == 201, f"Failed at document {i+1}: {r.text}"

    # 3. Attempt 6th upload (Must be rejected with 429 Too Many Requests)
    files = {"file": ("doc_6.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")}
    r = client.post("/api/v1/documents", files=files, headers=headers)
    assert r.status_code == 429, f"Expected 429 Quota Exceeded, got {r.status_code}"
    error_msg = r.json().get("error", {}).get("message", "") or r.json().get("detail", "")
    assert "quota exceeded" in error_msg.lower()
