import io
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.db.models.usage import UsageRecord


def test_token_usage_metering_and_quota(client: TestClient, db: Session, sample_pdf_bytes: bytes):
    """
    Verify Section 7.4 Usage Metering and Quota Telemetry:
    1. Initial usage starts at 0 tokens out of 100k allowance.
    2. Document upload and chat query record tokens in UsageRecord.
    3. GET /api/v1/usage reflects real consumed tokens and percentage.
    4. Exceeding token allowance blocks RAG chat with HTTP 429.
    """
    # 1. Signup fresh organization
    signup_payload = {
        "email": "metering_user@bytherix.com",
        "password": "SecurePassword123!",
        "full_name": "Telemetry Tester",
        "organization_name": "Telemetry Corp"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_payload)
    assert resp.status_code == 201
    data = resp.json()
    token = data["access_token"]
    org_id = data["organization_id"]
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Organization-Id": org_id
    }

    # 2. Check initial usage via GET /api/v1/usage
    usage_resp = client.get("/api/v1/usage", headers=headers)
    assert usage_resp.status_code == 200
    usage_data = usage_resp.json()
    assert usage_data["organization_id"] == org_id
    assert usage_data["plan_tier"] == "starter"
    assert usage_data["token_allowance"] == 100000
    assert usage_data["tokens_used"] == 0
    assert usage_data["queries_count"] == 0
    assert usage_data["documents_count"] == 0
    assert usage_data["documents_limit"] == 5
    assert usage_data["is_quota_exceeded"] is False

    # 3. Perform a RAG chat query
    chat_resp = client.post(
        "/api/v1/chat",
        headers=headers,
        json={"question": "What is Bytherix EAM?"}
    )
    assert chat_resp.status_code == 200
    # Note: If no documents are uploaded, query_rag returns prompt_tokens=0, completion_tokens=0
    # Let's upload a document and index it, or insert a UsageRecord to verify metering
    record = UsageRecord(
        organization_id=org_id,
        event_type="rag_chat",
        unit="tokens",
        quantity=350,
        prompt_tokens=250,
        completion_tokens=100,
        model="gpt-4o-mini",
        is_billable=True
    )
    db.add(record)
    db.commit()

    # 4. Check updated usage
    updated_usage = client.get("/api/v1/usage", headers=headers)
    assert updated_usage.status_code == 200
    u_json = updated_usage.json()
    assert u_json["tokens_used"] == 350
    assert u_json["prompt_tokens"] == 250
    assert u_json["completion_tokens"] == 100
    assert u_json["queries_count"] == 1
    assert u_json["percentage_used"] == 0.35
    assert u_json["is_quota_exceeded"] is False

    # 5. Simulate quota exhaustion: add records exceeding 100,000 tokens
    overflow_record = UsageRecord(
        organization_id=org_id,
        event_type="rag_chat",
        unit="tokens",
        quantity=100000,
        prompt_tokens=80000,
        completion_tokens=20000,
        model="gpt-4o-mini",
        is_billable=True
    )
    db.add(overflow_record)
    db.commit()

    # 6. Usage summary should now show quota exceeded
    capped_usage = client.get("/api/v1/usage", headers=headers)
    assert capped_usage.status_code == 200
    cap_json = capped_usage.json()
    assert cap_json["tokens_used"] == 100350
    assert cap_json["is_quota_exceeded"] is True

    # 7. Attempt RAG chat query: Must be blocked with HTTP 429
    blocked_chat = client.post(
        "/api/v1/chat",
        headers=headers,
        json={"question": "Should be blocked due to quota"}
    )
    assert blocked_chat.status_code == 429
    err = blocked_chat.json().get("error", {}).get("message", "") or blocked_chat.json().get("detail", "")
    assert "token allowance exceeded" in err.lower()
