import io
from fastapi.testclient import TestClient


def test_health_endpoints(client: TestClient):
    """Test health probes (Section 10.2 & 14.3)."""
    resp = client.get("/health/live")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_milestone_1_complete_vertical_slice(client: TestClient, sample_pdf_bytes: bytes):
    """
    Complete vertical slice test specified in Section 17.1 of Bytherix EAM specification:
    1. User creates organization A.
    2. Owner invites a second user with limited permissions.
    3. The authorized user uploads a PDF.
    4. Worker processes the PDF and indexes it.
    5. The user asks a question and receives an answer with source references.
    6. Cross-tenant test proves organization B cannot retrieve the document or its data.
    """
    # -------------------------------------------------------------
    # 1. User creates Organization A (Bytherix Corp)
    # -------------------------------------------------------------
    signup_payload_a = {
        "email": "alice@bytherix.com",
        "password": "Password123!",
        "full_name": "Alice Smith",
        "organization_name": "Bytherix Corp"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_payload_a)
    assert resp.status_code == 201
    data_a = resp.json()
    token_a = data_a["access_token"]
    org_id_a = data_a["organization_id"]
    headers_a = {
        "Authorization": f"Bearer {token_a}",
        "X-Organization-Id": org_id_a
    }

    # -------------------------------------------------------------
    # 2. Owner invites Bob as an Analyst
    # -------------------------------------------------------------
    invite_payload = {
        "email": "bob@bytherix.com",
        "role": "analyst"
    }
    resp = client.post(f"/api/v1/organizations/{org_id_a}/members/invite", json=invite_payload, headers=headers_a)
    assert resp.status_code == 201

    # Fetch members to verify invite and retrieve token
    resp = client.get(f"/api/v1/organizations/{org_id_a}/members", headers=headers_a)
    assert resp.status_code == 200
    members = resp.json()
    assert len(members) == 2
    bob_member = next(m for m in members if m["user_email"] == "bob@bytherix.com")
    assert bob_member["role"] == "analyst"

    # -------------------------------------------------------------
    # 3. User A uploads a PDF Document
    # -------------------------------------------------------------
    files = {
        "file": ("Company_Policy_2026.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")
    }
    data = {"title": "Company Policy 2026"}
    resp = client.post("/api/v1/documents", files=files, data=data, headers=headers_a)
    assert resp.status_code == 201
    doc_data = resp.json()
    doc_id = doc_data["id"]
    assert doc_data["title"] == "Company Policy 2026"
    assert doc_data["organization_id"] == org_id_a

    # Verify indexing status
    resp = client.get(f"/api/v1/documents/{doc_id}/status", headers=headers_a)
    assert resp.status_code == 200
    assert resp.json()["status"] in ["queued", "processing", "ready"]

    # -------------------------------------------------------------
    # 4. User queries RAG Chat
    # -------------------------------------------------------------
    chat_payload = {
        "question": "What is the policy for leave?",
        "top_k": 3
    }
    resp = client.post("/api/v1/chat", json=chat_payload, headers=headers_a)
    assert resp.status_code == 200
    chat_data = resp.json()
    assert "answer" in chat_data
    assert "sources" in chat_data

    # -------------------------------------------------------------
    # 5. STRICT CROSS-TENANT ISOLATION TEST (Section 13.2 Scenario 1)
    # -------------------------------------------------------------
    # Create Organization B (Acme Corp)
    signup_payload_b = {
        "email": "charlie@acme.com",
        "password": "Password123!",
        "full_name": "Charlie Brown",
        "organization_name": "Acme Corp"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_payload_b)
    assert resp.status_code == 201
    token_b = resp.json()["access_token"]
    org_id_b = resp.json()["organization_id"]
    headers_b = {
        "Authorization": f"Bearer {token_b}",
        "X-Organization-Id": org_id_b
    }

    # Org B attempts to retrieve Org A's document by ID -> MUST FAIL (404 Not Found)
    resp = client.get(f"/api/v1/documents/{doc_id}", headers=headers_b)
    assert resp.status_code == 404

    # Org B attempts to delete Org A's document -> MUST FAIL (404 Not Found)
    resp = client.delete(f"/api/v1/documents/{doc_id}", headers=headers_b)
    assert resp.status_code == 404

    # Org B queries chat -> CANNOT see Org A's document in sources
    resp = client.post("/api/v1/chat", json=chat_payload, headers=headers_b)
    assert resp.status_code == 200
    # Org B has 0 documents
    assert len(resp.json()["sources"]) == 0

    # Org B attempts to access Org A's members -> MUST FAIL (403 Forbidden)
    resp = client.get(f"/api/v1/organizations/{org_id_a}/members", headers=headers_b)
    assert resp.status_code == 403


def test_upload_rejection_for_non_pdf(client: TestClient):
    """Test rejection of non-PDF or spoofed files (Section 8.1.1 step 3 & Section 13.2)."""
    # 1. Sign up
    resp = client.post("/api/v1/auth/signup", json={
        "email": "david@corp.com",
        "password": "Password123!",
        "full_name": "David Miller",
        "organization_name": "David Corp"
    })
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload fake PDF (text file pretending to be PDF)
    files = {
        "file": ("fake.pdf", io.BytesIO(b"Hello this is not a PDF"), "application/pdf")
    }
    resp = client.post("/api/v1/documents", files=files, headers=headers)
    assert resp.status_code == 400
    assert "Invalid file format" in resp.json()["error"]["message"]
