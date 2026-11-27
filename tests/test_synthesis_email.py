import io
import uuid
import pytest
from fastapi.testclient import TestClient


def test_synthesis_email_dispatch_lifecycle(
    client: TestClient,
    sample_pdf_bytes: bytes,
):
    """
    Test automated multi-document synthesis PDF email dispatch,
    recipient validation, tenant boundaries, and audit logging.
    """
    # 1. Sign up Org A
    unique_suffix = uuid.uuid4().hex[:6]
    resp_a = client.post("/api/v1/auth/signup", json={
        "email": f"synthesizer_email_{unique_suffix}@acme.com",
        "password": "Password123!",
        "full_name": "Dr. Sarah Mitchell",
        "organization_name": "Apex Avionics Inc"
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
        files={"file": ("Flight_Guidance_Spec.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
        data={"title": "Flight Guidance Architecture Spec"}
    )
    assert up1.status_code == 201, up1.text
    doc1_id = up1.json()["id"]

    up2 = client.post(
        "/api/v1/documents",
        headers=headers_a,
        files={"file": ("Redundancy_Protocol.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
        data={"title": "Triple Modular Redundancy Protocol"}
    )
    assert up2.status_code == 201, up2.text
    doc2_id = up2.json()["id"]

    # 3. Dispatch synthesis dossier via email to 2 stakeholders
    recipients = [
        f"chief_engineer_{unique_suffix}@apexavionics.com",
        f"vp_safety_{unique_suffix}@apexavionics.com"
    ]
    email_resp = client.post(
        "/api/v1/documents/synthesis/email",
        headers=headers_a,
        json={
            "document_ids": [doc1_id, doc2_id],
            "recipients": recipients,
            "title": "Avionics Multi-System Redundancy Review",
            "synthesis_text": "### Executive Briefing\nCross-system analysis confirms fail-operational triple redundancy.\n\n### Recommendations\n- Formalize automated health telemetry\n- Schedule quarterly simulated bus disconnects",
            "notes": "Urgent review requested before tomorrow's FAA audit committee meeting."
        }
    )
    assert email_resp.status_code == 200, email_resp.text
    body = email_resp.json()
    assert body["success"] is True
    assert body["recipients_count"] == 2
    assert len(body["recipients"]) == 2
    assert body["filename"].endswith(".pdf")
    assert body["dossier_title"] == "Avionics Multi-System Redundancy Review"
    assert body["audit_event_id"] is not None

    # 4. Validation error: empty recipients
    bad_req1 = client.post(
        "/api/v1/documents/synthesis/email",
        headers=headers_a,
        json={
            "document_ids": [doc1_id, doc2_id],
            "recipients": [],
            "title": "Test Empty Recipients"
        }
    )
    assert bad_req1.status_code == 400

    # 5. Validation error: empty documents
    bad_req2 = client.post(
        "/api/v1/documents/synthesis/email",
        headers=headers_a,
        json={
            "document_ids": [],
            "recipients": ["valid.engineer@apex.com"],
            "title": "Test Empty Docs"
        }
    )
    assert bad_req2.status_code == 400

    # 6. Tenant boundary verification: Org B cannot email synthesis for Org A's docs
    resp_b = client.post("/api/v1/auth/signup", json={
        "email": f"spy_b_{unique_suffix}@external.com",
        "password": "Password123!",
        "full_name": "External Auditor",
        "organization_name": "External Audit Ltd"
    })
    assert resp_b.status_code == 201, resp_b.text
    token_b = resp_b.json()["access_token"]
    org_b_id = resp_b.json()["organization_id"]
    headers_b = {
        "Authorization": f"Bearer {token_b}",
        "X-Organization-Id": org_b_id
    }

    rogue_resp = client.post(
        "/api/v1/documents/synthesis/email",
        headers=headers_b,
        json={
            "document_ids": [doc1_id, doc2_id],
            "recipients": ["auditor@external.com"],
            "title": "Unauthorized Synthesis Attempt"
        }
    )
    assert rogue_resp.status_code == 404
