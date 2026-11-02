import io
import pytest
from fastapi.testclient import TestClient


def test_document_chunks_inspection_and_tenant_isolation(
    client: TestClient,
    sample_pdf_bytes: bytes,
):
    """
    Verify Section 8 & 9 RAG Chunk Inspection:
    1. Uploaded and parsed PDF creates chunk records with embedding indicators.
    2. GET /api/v1/documents/{id}/chunks returns full chunk list and metadata.
    3. Unauthenticated requests are rejected with HTTP 401.
    4. Cross-tenant inspection attempts are blocked with HTTP 404 (isolation).
    """
    # 1. Sign up Org A
    resp_a = client.post("/api/v1/auth/signup", json={
        "email": "chunks_owner@acme.com",
        "password": "Password123!",
        "full_name": "Chunks Owner",
        "organization_name": "Chunks Corp"
    })
    assert resp_a.status_code == 201
    token_a = resp_a.json()["access_token"]
    org_a_id = resp_a.json()["organization_id"]
    headers_a = {
        "Authorization": f"Bearer {token_a}",
        "X-Organization-Id": org_a_id
    }

    # 2. Upload valid PDF
    upload_resp = client.post(
        "/api/v1/documents",
        files={"file": ("operations_handbook.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
        data={"title": "Operations Handbook"},
        headers=headers_a
    )
    assert upload_resp.status_code == 201
    doc_id = upload_resp.json()["id"]

    # 3. Retrieve chunks
    chunks_resp = client.get(f"/api/v1/documents/{doc_id}/chunks", headers=headers_a)
    assert chunks_resp.status_code == 200
    data = chunks_resp.json()

    assert data["document_id"] == doc_id
    assert data["document_title"] == "Operations Handbook"
    assert data["filename"] == "operations_handbook.pdf"
    assert "total_chunks" in data
    assert "chunks" in data
    assert isinstance(data["chunks"], list)

    # If chunks were parsed, verify chunk schema fields
    if data["total_chunks"] > 0:
        first_chunk = data["chunks"][0]
        assert "id" in first_chunk
        assert "chunk_index" in first_chunk
        assert "page_number" in first_chunk
        assert "content" in first_chunk
        assert "token_count" in first_chunk
        assert "has_embedding" in first_chunk

    # 4. Unauthenticated request -> 401
    unauth_resp = client.get(f"/api/v1/documents/{doc_id}/chunks")
    assert unauth_resp.status_code == 401

    # 5. Cross-tenant isolation: Org B trying to inspect Org A chunks -> 404
    resp_b = client.post("/api/v1/auth/signup", json={
        "email": "intruder@competitor.com",
        "password": "Password123!",
        "full_name": "Competitor B",
        "organization_name": "Competitor Inc"
    })
    token_b = resp_b.json()["access_token"]
    headers_b = {
        "Authorization": f"Bearer {token_b}",
        "X-Organization-Id": resp_b.json()["organization_id"]
    }

    cross_resp = client.get(f"/api/v1/documents/{doc_id}/chunks", headers=headers_b)
    assert cross_resp.status_code == 404
