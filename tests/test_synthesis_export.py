import io
import uuid
import pytest
from fastapi.testclient import TestClient


def test_synthesis_export_lifecycle_and_tenant_isolation(
    client: TestClient,
    sample_pdf_bytes: bytes,
):
    """
    Test multi-document synthesis export in PDF and Markdown formats,
    tenant boundary verification, input validation, and compliance audit logging.
    """
    # 1. Sign up Org A
    unique_suffix = uuid.uuid4().hex[:6]
    resp_a = client.post("/api/v1/auth/signup", json={
        "email": f"synthesizer_a_{unique_suffix}@acme.com",
        "password": "Password123!",
        "full_name": "Synthesizer Lead A",
        "organization_name": "Acme Aerospace"
    })
    assert resp_a.status_code == 201, resp_a.text
    token_a = resp_a.json()["access_token"]
    org_a_id = resp_a.json()["organization_id"]
    headers_a = {
        "Authorization": f"Bearer {token_a}",
        "X-Organization-Id": org_a_id
    }

    # 2. Upload 2 documents for Org A
    up1 = client.post(
        "/api/v1/documents",
        headers=headers_a,
        files={"file": ("Flight_Control_Architecture.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
        data={"title": "Flight Control System Architecture"}
    )
    assert up1.status_code == 201, up1.text
    doc1_id = up1.json()["id"]

    up2 = client.post(
        "/api/v1/documents",
        headers=headers_a,
        files={"file": ("Avionics_Safety_Policy.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
        data={"title": "Avionics Redundancy & Safety Policy"}
    )
    assert up2.status_code == 201, up2.text
    doc2_id = up2.json()["id"]

    # 3. Export PDF synthesis
    pdf_resp = client.post("/api/v1/documents/synthesis/export", json={
        "document_ids": [doc1_id, doc2_id],
        "title": "Avionics Safety & Architecture Synthesis",
        "format": "pdf",
        "synthesis_text": "### Executive Summary\nUnified avionics architecture review confirms triple redundancy and zero-tolerance fail-safe standards.\n\n### Key Findings\n- **Flight Control:** 3x bus redundancy.\n- **Policy Enforcement:** Cryptographic integrity verified."
    }, headers=headers_a)

    assert pdf_resp.status_code == 200, pdf_resp.text
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert "attachment; filename=" in pdf_resp.headers["content-disposition"]
    assert pdf_resp.headers["content-disposition"].endswith('.pdf"')
    assert pdf_resp.content.startswith(b"%PDF")

    # 4. Export Markdown synthesis
    md_resp = client.post("/api/v1/documents/synthesis/export", json={
        "document_ids": [doc1_id, doc2_id],
        "title": "Avionics Safety & Architecture Synthesis",
        "format": "markdown",
        "synthesis_text": "### Executive Summary\nMarkdown briefing export verification."
    }, headers=headers_a)

    assert md_resp.status_code == 200, md_resp.text
    assert "text/markdown" in md_resp.headers["content-type"]
    assert "attachment; filename=" in md_resp.headers["content-disposition"]
    assert md_resp.headers["content-disposition"].endswith('.md"')
    md_text = md_resp.content.decode("utf-8")
    assert "# Bytherix EAM — Avionics Safety & Architecture Synthesis" in md_text
    assert "Flight Control System Architecture" in md_text
    assert "Avionics Redundancy & Safety Policy" in md_text
    assert "Zero Hallucination Grounding" in md_text

    # 5. Export with automated synthesis generation (omitted synthesis_text)
    auto_resp = client.post("/api/v1/documents/synthesis/export", json={
        "document_ids": [doc1_id, doc2_id],
        "format": "markdown"
    }, headers=headers_a)
    assert auto_resp.status_code == 200, auto_resp.text
    auto_text = auto_resp.content.decode("utf-8")
    assert "Multi-Document Intelligence Synthesis Dossier" in auto_text
    assert "This comparative synthesis integrates findings across 2 enterprise documents" in auto_text

    # 6. Verify Tenant Isolation (Sign up Org B and try to export Org A's documents)
    resp_b = client.post("/api/v1/auth/signup", json={
        "email": f"synthesizer_b_{unique_suffix}@othercorp.com",
        "password": "Password123!",
        "full_name": "Synthesizer Lead B",
        "organization_name": "Other Corp"
    })
    assert resp_b.status_code == 201, resp_b.text
    token_b = resp_b.json()["access_token"]
    org_b_id = resp_b.json()["organization_id"]
    headers_b = {
        "Authorization": f"Bearer {token_b}",
        "X-Organization-Id": org_b_id
    }

    rogue_resp = client.post("/api/v1/documents/synthesis/export", json={
        "document_ids": [doc1_id, doc2_id],
        "format": "pdf"
    }, headers=headers_b)
    assert rogue_resp.status_code == 404
    err_body = rogue_resp.json()
    msg = err_body.get("error", {}).get("message") or err_body.get("detail", "")
    assert "None of the specified documents were found" in msg

    # 7. Validation: Empty document_ids and invalid format
    empty_resp = client.post("/api/v1/documents/synthesis/export", json={
        "document_ids": [],
        "format": "pdf"
    }, headers=headers_a)
    assert empty_resp.status_code == 400

    bad_fmt_resp = client.post("/api/v1/documents/synthesis/export", json={
        "document_ids": [doc1_id],
        "format": "unsupported_binary"
    }, headers=headers_a)
    assert bad_fmt_resp.status_code == 400

    # 8. Verify Audit Logging in Org A
    audit_res = client.get("/api/v1/audit-logs", headers=headers_a)
    assert audit_res.status_code == 200, audit_res.text
    audit_data = audit_res.json()
    actions = [item["action"] for item in audit_data.get("items", [])]
    assert "document.synthesis_exported" in actions
