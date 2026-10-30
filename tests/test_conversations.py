import json
from fastapi.testclient import TestClient


def test_conversation_session_persistence_and_isolation(client: TestClient, sample_pdf_bytes: bytes):
    """
    Test Section 16.1 #6 Conversation Persistence & Isolation.
    Verifies that:
    1. Conversations and messages are persisted in DB.
    2. Sessions can be retrieved with full source citations.
    3. Cross-tenant isolation ensures another organization cannot access the session.
    4. Session deletion cleanly removes thread.
    """
    # 1. Sign up Org A
    signup_a = {
        "email": "chat_user_a@bytherix.com",
        "password": "Password123!",
        "full_name": "User Alpha",
        "organization_name": "Org Alpha"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_a)
    assert resp.status_code == 201
    token_a = resp.json()["access_token"]
    org_id_a = resp.json()["organization_id"]
    headers_a = {"Authorization": f"Bearer {token_a}", "X-Organization-Id": org_id_a}

    # Upload document to Org A
    files = {"file": ("doc_a.pdf", sample_pdf_bytes, "application/pdf")}
    upload_resp = client.post("/api/v1/documents", files=files, headers=headers_a)
    assert upload_resp.status_code == 201

    # 2. Query RAG Chat (creates session)
    chat_resp = client.post("/api/v1/chat", json={
        "question": "What is the quota limit for Starter Free plan?",
        "top_k": 2
    }, headers=headers_a)
    assert chat_resp.status_code == 200
    data = chat_resp.json()
    assert "session_id" in data
    session_id = data["session_id"]
    assert session_id is not None

    # 3. List sessions for Org A
    list_resp = client.get("/api/v1/chat/sessions", headers=headers_a)
    assert list_resp.status_code == 200
    sessions = list_resp.json()
    assert len(sessions) >= 1
    assert sessions[0]["id"] == session_id
    assert sessions[0]["message_count"] == 2  # 1 user + 1 assistant

    # 4. Get session detail
    detail_resp = client.get(f"/api/v1/chat/sessions/{session_id}", headers=headers_a)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["id"] == session_id
    assert len(detail["messages"]) == 2
    assert detail["messages"][0]["sender"] == "user"
    assert detail["messages"][1]["sender"] == "assistant"
    assert isinstance(detail["messages"][1]["sources"], list)

    # 5. Cross-tenant isolation test: Org B tries to access Org A's session
    signup_b = {
        "email": "chat_user_b@bytherix.com",
        "password": "Password123!",
        "full_name": "User Beta",
        "organization_name": "Org Beta"
    }
    resp_b = client.post("/api/v1/auth/signup", json=signup_b)
    assert resp_b.status_code == 201
    token_b = resp_b.json()["access_token"]
    org_id_b = resp_b.json()["organization_id"]
    headers_b = {"Authorization": f"Bearer {token_b}", "X-Organization-Id": org_id_b}

    # Org B lists sessions: should NOT see Org A's session
    list_b = client.get("/api/v1/chat/sessions", headers=headers_b)
    assert list_b.status_code == 200
    assert len(list_b.json()) == 0

    # Org B attempts to access Org A's session directly: HTTP 404
    hacker_resp = client.get(f"/api/v1/chat/sessions/{session_id}", headers=headers_b)
    assert hacker_resp.status_code == 404

    # 6. Delete session
    del_resp = client.delete(f"/api/v1/chat/sessions/{session_id}", headers=headers_a)
    assert del_resp.status_code == 200

    # Verify session is gone
    check_del = client.get(f"/api/v1/chat/sessions/{session_id}", headers=headers_a)
    assert check_del.status_code == 404
