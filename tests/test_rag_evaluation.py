import pytest
from fastapi.testclient import TestClient
from app.services.rag_eval_service import RAGEvaluationService


def test_rag_eval_high_faithfulness():
    question = "What is the monthly token quota for Starter Free plan?"
    answer = "The Starter Free plan provides 100,000 monthly tokens with rate limit security."
    context = [
        "Starter Free tier offers 100,000 monthly tokens with basic rate limiting and multi-tenant isolation."
    ]
    result = RAGEvaluationService.evaluate(question, answer, context)
    assert result.faithfulness_score >= 0.85
    assert result.hallucination_risk in ["MINIMAL", "LOW"]
    assert result.supported_claims >= 1
    assert result.compliance_badge.startswith("SOC_2") or result.compliance_badge.startswith("ACCEPTABLE")


def test_rag_eval_hallucination_detection():
    question = "What is the token quota for Starter Free?"
    answer = "The Starter Free plan gives you 50,000,000 tokens, free quantum GPU clusters, and infinite supercomputers."
    context = [
        "Starter Free tier offers 100,000 monthly tokens."
    ]
    result = RAGEvaluationService.evaluate(question, answer, context)
    assert result.faithfulness_score < 0.70
    assert result.hallucination_risk in ["MODERATE", "HIGH"]


def test_chat_endpoint_includes_rag_triad(client: TestClient, sample_pdf_bytes: bytes):
    signup_data = {
        "email": "eval_user@bytherix.com",
        "password": "Password123!",
        "full_name": "Evaluation Engineer",
        "organization_name": "Bytherix Quality"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_data)
    token = resp.json()["access_token"]
    org_id = resp.json()["organization_id"]
    headers = {"Authorization": f"Bearer {token}", "X-Organization-Id": org_id}

    # Upload doc
    files = {"file": ("demo.pdf", sample_pdf_bytes, "application/pdf")}
    upload_resp = client.post("/api/v1/documents", files=files, headers=headers)
    assert upload_resp.status_code == 201

    # Ask chat question
    chat_resp = client.post("/api/v1/chat", json={
        "question": "What are the core technical specifications?",
        "top_k": 2
    }, headers=headers)
    assert chat_resp.status_code == 200
    data = chat_resp.json()
    assert "evaluation" in data
    assert data["evaluation"] is not None
    assert "faithfulness_score" in data["evaluation"]
    assert "context_relevance_score" in data["evaluation"]
    assert "answer_relevance_score" in data["evaluation"]
    assert "hallucination_risk" in data["evaluation"]
