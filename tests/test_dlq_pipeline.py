from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.models.document import Document
from app.db.models.dead_letter import DeadLetterJob
from app.services.dlq_service import DLQService


def test_dlq_lifecycle_tenant_isolation_and_redrive(client: TestClient, db: Session):
    """
    Test Section 11.3 & 14:
    - Dead-Letter Queue failure capture & document status synchronization
    - Strict multi-tenant isolation (Org A vs Org B)
    - DLQ listing & filtering
    - Re-drive / retry mechanics
    - Purging and audit trail tracking
    """
    # 1. Sign up Org A (Lead Tenant)
    resp_a = client.post("/api/v1/auth/signup", json={
        "email": "pipeline_eng@acme.com",
        "password": "Password123!",
        "full_name": "Pipeline Engineer",
        "organization_name": "Acme Autonomous"
    })
    assert resp_a.status_code == 201
    token_a = resp_a.json()["access_token"]
    org_a_id = resp_a.json()["organization_id"]
    headers_a = {"Authorization": f"Bearer {token_a}", "X-Organization-Id": org_a_id}

    # 2. Sign up Org B (Isolated Tenant)
    resp_b = client.post("/api/v1/auth/signup", json={
        "email": "rival_eng@globex.com",
        "password": "Password123!",
        "full_name": "Rival Engineer",
        "organization_name": "Globex Corp"
    })
    assert resp_b.status_code == 201
    token_b = resp_b.json()["access_token"]
    org_b_id = resp_b.json()["organization_id"]
    headers_b = {"Authorization": f"Bearer {token_b}", "X-Organization-Id": org_b_id}

    # 3. Create a Document in Org A
    doc_a = Document(
        organization_id=org_a_id,
        title="Corrupted Specification.pdf",
        filename="corrupted_spec.pdf",
        object_key=f"{org_a_id}/docs/corrupted_spec.pdf",
        checksum="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        file_size_bytes=1024,
        status="processing",
    )
    db.add(doc_a)
    db.commit()
    db.refresh(doc_a)

    # 4. Capture a Poisoned Task into DLQ for Org A
    captured_job = DLQService.capture_failed_job(
        db=db,
        organization_id=org_a_id,
        task_name="process_document_task",
        task_id="celery-uuid-12345",
        resource_type="document",
        resource_id=doc_a.id,
        payload={"document_id": doc_a.id, "filename": doc_a.filename},
        error="PDFSyntaxError: Malformed XREF stream structure",
        stack_trace="Traceback: File parser.py line 42 in parse_stream",
        retry_count=3,
    )
    assert captured_job.id is not None
    assert captured_job.status == "failed"

    # Verify document was updated to failed with DLQ reason
    db.refresh(doc_a)
    assert doc_a.status == "failed"
    assert "DLQ Isolated" in doc_a.error_message

    # 5. Verify Org B sees 0 DLQ items (Strict Tenant Isolation)
    resp_list_b = client.get("/api/v1/jobs/dlq", headers=headers_b)
    assert resp_list_b.status_code == 200
    assert resp_list_b.json()["total"] == 0
    assert len(resp_list_b.json()["items"]) == 0

    # 6. Verify Org A sees the DLQ item
    resp_list_a = client.get("/api/v1/jobs/dlq", headers=headers_a)
    assert resp_list_a.status_code == 200
    data_a = resp_list_a.json()
    assert data_a["total"] == 1
    assert data_a["items"][0]["id"] == captured_job.id
    assert data_a["items"][0]["task_name"] == "process_document_task"
    assert "PDFSyntaxError" in data_a["items"][0]["error_message"]

    # Test filtering by status
    resp_filtered = client.get("/api/v1/jobs/dlq?status=failed", headers=headers_a)
    assert resp_filtered.status_code == 200
    assert resp_filtered.json()["total"] == 1

    resp_none = client.get("/api/v1/jobs/dlq?status=purged", headers=headers_a)
    assert resp_none.status_code == 200
    assert resp_none.json()["total"] == 0

    # 7. Test Re-drive / Retry Endpoint
    retry_resp = client.post(f"/api/v1/jobs/dlq/{captured_job.id}/retry", headers=headers_a)
    assert retry_resp.status_code == 200
    assert retry_resp.json()["status"] == "retrying"

    # Verify document state was reset to queued
    db.refresh(doc_a)
    assert doc_a.status == "queued"
    assert doc_a.error_message is None

    # 8. Test Purge Endpoint
    purge_resp = client.delete(f"/api/v1/jobs/dlq/{captured_job.id}", headers=headers_a)
    assert purge_resp.status_code == 200
    assert purge_resp.json()["status"] == "purged"

    # Subsequent retry should fail because job is purged
    bad_retry = client.post(f"/api/v1/jobs/dlq/{captured_job.id}/retry", headers=headers_a)
    assert bad_retry.status_code == 400
    assert "Cannot re-drive a purged job" in bad_retry.text

    # 9. Cross-tenant access protection (Org B cannot re-drive Org A's job)
    cross_resp = client.post(f"/api/v1/jobs/dlq/{captured_job.id}/retry", headers=headers_b)
    assert cross_resp.status_code == 404
