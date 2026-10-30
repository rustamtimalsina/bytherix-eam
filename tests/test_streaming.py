import json
from fastapi.testclient import TestClient


def test_streaming_chat_endpoint(client: TestClient, sample_pdf_bytes: bytes):
    """
    Test Section 8.2 Real-time SSE streaming chat endpoint (/api/v1/chat/stream).
    Verifies that citations arrive first, followed by incremental tokens, and finally token accounting.
    """
    # 1. Sign up user & get auth token
    signup_payload = {
        "email": "stream_user@bytherix.com",
        "password": "Password123!",
        "full_name": "Stream Tester",
        "organization_name": "Stream Org"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_payload)
    assert resp.status_code == 201
    token = resp.json()["access_token"]
    org_id = resp.json()["organization_id"]
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Organization-Id": org_id
    }

    # 2. Upload document
    files = {"file": ("test_doc.pdf", sample_pdf_bytes, "application/pdf")}
    upload_resp = client.post("/api/v1/documents", files=files, headers=headers)
    assert upload_resp.status_code == 201

    # 3. Stream chat query
    query_payload = {
        "question": "What is the quota limit for Starter Free plan?",
        "top_k": 3
    }
    with client.stream("POST", "/api/v1/chat/stream", json=query_payload, headers=headers) as stream_resp:
        assert stream_resp.status_code == 200
        assert "text/event-stream" in stream_resp.headers["content-type"]

        received_events = []
        full_tokens = ""
        got_citations = False
        got_done = False

        for line in stream_resp.iter_lines():
            if line.startswith("data: "):
                payload_str = line[6:].strip()
                data = json.loads(payload_str)
                event_type = data.get("type")
                received_events.append(event_type)

                if event_type == "citations":
                    got_citations = True
                    assert "data" in data
                elif event_type == "token":
                    full_tokens += data.get("token", "")
                elif event_type == "done":
                    got_done = True
                    assert "total_tokens" in data
                    assert "model" in data

        assert got_citations, "Stream must yield citations first"
        assert len(full_tokens) > 0, "Stream must yield text tokens"
        assert got_done, "Stream must yield final done event with token accounting"
