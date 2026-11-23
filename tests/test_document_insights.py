import io
import pytest
from fastapi.testclient import TestClient


def test_document_insights_and_cross_tenant_isolation(
    client: TestClient,
    sample_pdf_bytes: bytes,
):
    """
    Test AI Executive Briefing and Suggested Prompt Chips (Upgrade Feature):
    1. Upload document as Org A.
    2. Request GET /api/v1/documents/{doc_id}/insights.
    3. Verify executive summary (3 bullets), suggested questions, key topics, and reading time.
    4. Verify cross-tenant isolation: Org B receives 404 Not Found when attempting to access Org A's insights.
    """
    # 1. Sign up Org A
    signup_a = client.post("/api/v1/auth/signup", json={
        "email": "insights_owner@alpha.com",
        "password": "Password123!",
        "full_name": "Insights Owner",
        "organization_name": "Alpha Corp"
    })
    assert signup_a.status_code == 201, signup_a.text
    token_a = signup_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Upload document for Org A
    upload_res = client.post(
        "/api/v1/documents",
        headers=headers_a,
        files={"file": ("Enterprise_Policy_Spec.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
        data={"title": "Enterprise Security Policy and Architecture"}
    )
    assert upload_res.status_code == 201, upload_res.text
    doc_id = upload_res.json()["id"]

    # 3. Fetch Document Insights
    insights_res = client.get(f"/api/v1/documents/{doc_id}/insights", headers=headers_a)
    assert insights_res.status_code == 200, insights_res.text
    data = insights_res.json()

    # Validate schema
    assert data["document_id"] == doc_id
    assert "executive_summary" in data
    assert len(data["executive_summary"]) == 3
    assert "suggested_questions" in data
    assert len(data["suggested_questions"]) >= 3
    assert "key_topics" in data
    assert len(data["key_topics"]) >= 1
    assert data["reading_time_minutes"] >= 1
    assert data["sentiment"] != ""

    # 4. Cross-Tenant Isolation: Org B cannot access Org A's insights
    signup_b = client.post("/api/v1/auth/signup", json={
        "email": "insights_hacker@beta.com",
        "password": "Password123!",
        "full_name": "Beta Attacker",
        "organization_name": "Beta Corp"
    })
    assert signup_b.status_code == 201, signup_b.text
    token_b = signup_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    leak_attempt = client.get(f"/api/v1/documents/{doc_id}/insights", headers=headers_b)
    assert leak_attempt.status_code == 404, "Cross-tenant access must return 404 Not Found"
