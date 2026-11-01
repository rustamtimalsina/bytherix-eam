import io
from fastapi.testclient import TestClient

from app.integrations.object_storage.s3 import storage_service


def test_storage_service_local_provider_contract():
    """Verify storage provider detection and local fallback."""
    provider = storage_service.get_storage_provider()
    assert provider in ["local", "minio", "s3"]


def test_document_download_url_lifecycle_and_tenant_isolation(client: TestClient, sample_pdf_bytes: bytes):
    """
    Verify Section 8.1 & 14 Object Storage:
    1. Pre-signed download URL generation
    2. Direct binary streaming with authentic %PDF- headers
    3. Multi-tenant isolation enforcement (cross-tenant access rejected)
    4. Audit trail logging for document downloads
    """
    # 1. Sign up Org A
    resp_a = client.post("/api/v1/auth/signup", json={
        "email": "storage_owner@acme.com",
        "password": "Password123!",
        "full_name": "Storage Owner",
        "organization_name": "Acme Storage Corp"
    })
    assert resp_a.status_code == 201
    token_a = resp_a.json()["access_token"]
    org_a_id = resp_a.json()["organization_id"]
    headers_a = {
        "Authorization": f"Bearer {token_a}",
        "X-Organization-Id": org_a_id
    }

    # 2. Upload a valid PDF to Org A
    upload_resp = client.post(
        "/api/v1/documents",
        files={"file": ("architecture_spec.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
        data={"title": "Architecture Spec"},
        headers=headers_a
    )
    assert upload_resp.status_code == 201
    doc_id = upload_resp.json()["id"]

    # 3. Request pre-signed download URL
    url_resp = client.get(f"/api/v1/documents/{doc_id}/download-url", headers=headers_a)
    assert url_resp.status_code == 200
    data = url_resp.json()
    assert data["document_id"] == doc_id
    assert data["filename"] == "architecture_spec.pdf"
    assert "download_url" in data
    assert data["expires_in_seconds"] == 300
    assert data["storage_provider"] in ["local", "minio", "s3"]

    # 4. Stream binary content via Bearer Header
    download_resp = client.get(f"/api/v1/documents/{doc_id}/download", headers=headers_a)
    assert download_resp.status_code == 200
    assert download_resp.content.startswith(b"%PDF-")
    assert "architecture_spec.pdf" in download_resp.headers.get("Content-Disposition", "")
    assert download_resp.headers.get("Content-Type") == "application/pdf"

    # 5. Stream binary content via Query Param ?token=... (for 1-click browser tab opening)
    param_resp = client.get(f"/api/v1/documents/{doc_id}/download?token={token_a}")
    assert param_resp.status_code == 200
    assert param_resp.content.startswith(b"%PDF-")

    # 6. Unauthenticated request must be rejected
    unauth_resp = client.get(f"/api/v1/documents/{doc_id}/download")
    assert unauth_resp.status_code == 401

    # 7. Cross-Tenant Isolation: Org B must NOT be able to access Org A's document
    resp_b = client.post("/api/v1/auth/signup", json={
        "email": "intruder@other.com",
        "password": "Password123!",
        "full_name": "Intruder B",
        "organization_name": "Other Corp"
    })
    token_b = resp_b.json()["access_token"]
    headers_b = {
        "Authorization": f"Bearer {token_b}",
        "X-Organization-Id": resp_b.json()["organization_id"]
    }

    # Org B requesting Org A download-url -> 404
    cross_url = client.get(f"/api/v1/documents/{doc_id}/download-url", headers=headers_b)
    assert cross_url.status_code == 404

    # Org B trying to stream Org A document -> 403 Forbidden
    cross_stream = client.get(f"/api/v1/documents/{doc_id}/download", headers=headers_b)
    assert cross_stream.status_code == 403

    # 8. Verify Audit Trail for Org A
    audit_resp = client.get("/api/v1/audit-logs", headers=headers_a)
    assert audit_resp.status_code == 200
    actions = [item["action"] for item in audit_resp.json()["items"]]
    assert "document.download_url_generated" in actions
    assert "document.downloaded" in actions
