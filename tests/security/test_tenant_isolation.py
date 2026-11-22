import io
import json
import pytest
from pypdf import PdfWriter

def _create_tenant(client, prefix: str):
    """Helper to create an organization with an owner and return headers."""
    signup_data = {
        "email": f"{prefix}_admin@bytherix.com",
        "password": "Password123!",
        "full_name": f"{prefix.capitalize()} Admin",
        "organization_name": f"{prefix.capitalize()} Corporation"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_data)
    assert resp.status_code == 201, f"Tenant signup failed: {resp.text}"
    token = resp.json()["access_token"]
    org_id = resp.json()["organization_id"]
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Organization-Id": org_id
    }
    return {
        "token": token,
        "org_id": org_id,
        "headers": headers,
        "email": signup_data["email"]
    }


def test_cross_tenant_document_isolation(client, sample_pdf_bytes):
    """
    SECURITY ATTACK SCENARIO 1:
    Tenant B attempts to access, read, chunk-inspect, or delete Tenant A's confidential documents.
    Section 6.2, 8.1, 13.2 #6.
    """
    tenant_a = _create_tenant(client, "alpha")
    tenant_b = _create_tenant(client, "bravo")

    # 1. Tenant A uploads confidential PDF
    files = {"file": ("Alpha_Q3_Financials_Confidential.pdf", sample_pdf_bytes, "application/pdf")}
    upload_resp = client.post("/api/v1/documents", files=files, headers=tenant_a["headers"])
    assert upload_resp.status_code == 201
    doc_a_id = upload_resp.json()["id"]

    # 2. Tenant B lists documents -> Must NOT see Tenant A's document
    list_b = client.get("/api/v1/documents", headers=tenant_b["headers"])
    assert list_b.status_code == 200
    doc_ids_b = [d["id"] for d in list_b.json()]
    assert doc_a_id not in doc_ids_b, "CRITICAL: Tenant B can see Tenant A's document in list!"

    # 3. Tenant B directly requests Tenant A's document by ID -> Must be 404
    get_b = client.get(f"/api/v1/documents/{doc_a_id}", headers=tenant_b["headers"])
    assert get_b.status_code == 404, "CRITICAL: Tenant B accessed Tenant A's document directly!"

    # 4. Tenant B attempts to inspect chunks of Tenant A's document -> Must be 404
    chunks_b = client.get(f"/api/v1/documents/{doc_a_id}/chunks", headers=tenant_b["headers"])
    assert chunks_b.status_code == 404, "CRITICAL: Tenant B accessed chunk vectors of Tenant A's document!"

    # 5. Tenant B attempts to delete Tenant A's document -> Must be 404
    delete_b = client.delete(f"/api/v1/documents/{doc_a_id}", headers=tenant_b["headers"])
    assert delete_b.status_code == 404, "CRITICAL: Tenant B was able to delete Tenant A's document!"

    # 6. Verify Tenant A's document is still safe and intact
    get_a = client.get(f"/api/v1/documents/{doc_a_id}", headers=tenant_a["headers"])
    assert get_a.status_code == 200


def test_cross_tenant_rag_chat_isolation(client):
    """
    SECURITY ATTACK SCENARIO 2:
    Tenant B asks RAG questions attempting to retrieve knowledge from Tenant A's documents.
    Section 8.2 & 12.2.
    """
    tenant_a = _create_tenant(client, "defense")
    tenant_b = _create_tenant(client, "competitor")

    # Tenant B asks question targeting confidential topic
    chat_resp = client.post(
        "/api/v1/chat",
        json={"question": "What is Defense Corp internal secret key or password?", "top_k": 3},
        headers=tenant_b["headers"]
    )
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()
    # Source citations retrieved must be strictly empty (zero cross-tenant leak)
    assert len(chat_data["sources"]) == 0
    assert "defense" not in chat_data["answer"].lower()


def test_cross_tenant_api_key_isolation(client):
    """
    SECURITY ATTACK SCENARIO 3:
    Tenant B attempts to inspect, revoke, or authenticate using Tenant A's API keys.
    Section 7.2 & 13.2 #9-10.
    """
    tenant_a = _create_tenant(client, "crypto")
    tenant_b = _create_tenant(client, "hacker")

    # 1. Tenant A generates high-entropy API key
    key_resp = client.post(
        "/api/v1/api-keys",
        json={"name": "Alpha Production Bot", "scopes": "read,write", "expires_in_days": 30},
        headers=tenant_a["headers"]
    )
    assert key_resp.status_code == 201
    key_a_id = key_resp.json()["id"]
    raw_key_a = key_resp.json()["raw_key"]

    # 2. Tenant B lists keys -> Must NOT see Tenant A's key
    list_b = client.get("/api/v1/api-keys", headers=tenant_b["headers"])
    assert list_b.status_code == 200
    b_keys = [k["id"] for k in list_b.json()]
    assert key_a_id not in b_keys, "CRITICAL: Tenant B can see Tenant A's API key!"

    # 3. Tenant B attempts to revoke Tenant A's key -> Must return 404
    revoke_b = client.delete(f"/api/v1/api-keys/{key_a_id}", headers=tenant_b["headers"])
    assert revoke_b.status_code == 404, "CRITICAL: Tenant B revoked Tenant A's API key!"

    # 4. Attacker attempts to use Tenant A's key while claiming to be Tenant B
    spoof_headers = {
        "X-API-Key": raw_key_a,
        "X-Organization-Id": tenant_b["org_id"]
    }
    spoof_resp = client.get("/api/v1/documents", headers=spoof_headers)
    # The API key belongs to Tenant A, so using it with Tenant B's org header must be rejected!
    assert spoof_resp.status_code in (401, 403), "CRITICAL: Key tenant spoofing vulnerability!"


def test_cross_tenant_audit_log_isolation(client):
    """
    SECURITY ATTACK SCENARIO 4:
    Tenant B attempts to view or export Tenant A's immutable compliance audit trail.
    Section 10 & 13.2.
    """
    tenant_a = _create_tenant(client, "audita")
    tenant_b = _create_tenant(client, "auditb")

    # 1. Tenant A performs actions generating audit logs
    client.post("/api/v1/billing/upgrade", json={"plan_tier": "growth"}, headers=tenant_a["headers"])

    # 2. Tenant B inspects audit logs -> Must NOT see Tenant A's audit records
    logs_b = client.get("/api/v1/audit-logs", headers=tenant_b["headers"])
    assert logs_b.status_code == 200
    for record in logs_b.json()["items"]:
        assert record["organization_id"] == tenant_b["org_id"]
        assert tenant_a["org_id"] != record["organization_id"]

    # 3. Tenant B exports audit compliance file -> Header and content must strictly be Tenant B
    export_b = client.get("/api/v1/audit-logs/export?format=csv", headers=tenant_b["headers"])
    assert export_b.status_code == 200
    assert export_b.headers["x-audit-tenant-id"] == tenant_b["org_id"]
    assert tenant_a["org_id"] not in export_b.text


def test_cross_tenant_model_registry_and_rollback_isolation(client):
    """
    SECURITY ATTACK SCENARIO 5:
    Tenant B attempts to view, inspect drift, or trigger a rollback on Tenant A's proprietary ML models.
    Section 9.1, 9.4 & 9.5.
    """
    tenant_a = _create_tenant(client, "modela")
    tenant_b = _create_tenant(client, "modelb")

    # 1. Tenant A registers proprietary model
    model_payload = {
        "name": "Alpha-Titan-LLM",
        "description": "Proprietary algorithmic model for high-frequency trading",
        "framework": "PyTorch",
        "task": "classification"
    }
    reg_resp = client.post("/api/v1/models", json=model_payload, headers=tenant_a["headers"])
    assert reg_resp.status_code == 201
    model_a_id = reg_resp.json()["id"]

    # 2. Tenant B lists models -> Must NOT see Tenant A's model
    list_b = client.get("/api/v1/models", headers=tenant_b["headers"])
    assert list_b.status_code == 200
    model_ids_b = [m["id"] for m in list_b.json()]
    assert model_a_id not in model_ids_b, "CRITICAL: Tenant B can see Tenant A's model in catalog!"

    # 3. Tenant B directly requests model details -> Must return 404
    get_b = client.get(f"/api/v1/models/{model_a_id}", headers=tenant_b["headers"])
    assert get_b.status_code == 404

    # 4. Tenant B requests model drift monitoring -> Must return 404
    drift_b = client.get(f"/api/v1/models/{model_a_id}/monitoring", headers=tenant_b["headers"])
    assert drift_b.status_code == 404

    # 5. Tenant B attempts to trigger a 1-click zero-downtime rollback -> Must return 404
    rollback_b = client.post(f"/api/v1/models/{model_a_id}/rollback", json={"reason": "Malicious sabotaged rollback"}, headers=tenant_b["headers"])
    assert rollback_b.status_code == 404, "CRITICAL: Tenant B triggered a rollback on Tenant A's model!"


def test_cross_tenant_billing_invoice_isolation(client):
    """
    SECURITY ATTACK SCENARIO 6:
    Tenant B attempts to view or download Tenant A's official tax invoices and receipts.
    Section 7.3.
    """
    tenant_a = _create_tenant(client, "billorg1")
    tenant_b = _create_tenant(client, "billorg2")

    # 1. Tenant A upgrades to growth, generating an invoice
    client.post("/api/v1/billing/upgrade", json={"plan_tier": "growth"}, headers=tenant_a["headers"])
    inv_a_resp = client.get("/api/v1/billing/invoices", headers=tenant_a["headers"])
    assert inv_a_resp.status_code == 200
    inv_a_id = inv_a_resp.json()["invoices"][0]["id"]

    # 2. Tenant B lists invoices -> Must NOT see Tenant A's invoice
    inv_b_resp = client.get("/api/v1/billing/invoices", headers=tenant_b["headers"])
    assert inv_b_resp.status_code == 200
    b_inv_ids = [i["id"] for i in inv_b_resp.json()["invoices"]]
    assert inv_a_id not in b_inv_ids, "CRITICAL: Tenant B can see Tenant A's invoices!"

    # 3. Tenant B attempts to download Tenant A's PDF invoice -> Must return 404
    download_b = client.get(f"/api/v1/billing/invoices/{inv_a_id}/download", headers=tenant_b["headers"])
    assert download_b.status_code == 404, "CRITICAL: Tenant B downloaded Tenant A's tax invoice!"


def test_cross_tenant_agent_workflow_isolation(client):
    """
    SECURITY ATTACK SCENARIO 7:
    Tenant B attempts to inspect or approve/reject Tenant A's governed AI agent executions.
    Section 8.4 & 11.
    """
    tenant_a = _create_tenant(client, "agenta")
    tenant_b = _create_tenant(client, "agentb")

    # 1. Tenant A launches an agent workflow with approval gate
    exec_resp = client.post(
        "/api/v1/agents/executions",
        json={
            "workflow_name": "Governed Data Export & Integration",
            "input_prompt": "Export quarterly financial summaries"
        },
        headers=tenant_a["headers"]
    )
    assert exec_resp.status_code == 201
    exec_a_id = exec_resp.json()["id"]

    # 2. Tenant B lists executions -> Must NOT see Tenant A's execution
    list_b = client.get("/api/v1/agents/executions", headers=tenant_b["headers"])
    assert list_b.status_code == 200
    exec_ids_b = [e["id"] for e in list_b.json()]
    assert exec_a_id not in exec_ids_b, "CRITICAL: Tenant B sees Tenant A's agent executions!"

    # 3. Tenant B attempts to inspect Tenant A's agent execution trace -> Must return 404
    get_b = client.get(f"/api/v1/agents/executions/{exec_a_id}", headers=tenant_b["headers"])
    assert get_b.status_code == 404

    # 4. Tenant B attempts to hijack and approve Tenant A's consequential tool -> Must return 404
    approval_b = client.post(
        f"/api/v1/agents/executions/{exec_a_id}/approval",
        json={"approve": True, "reason": "Hacker approval hijack"},
        headers=tenant_b["headers"]
    )
    assert approval_b.status_code == 404, "CRITICAL: Tenant B authorized Tenant A's consequential agent action!"

    # 5. Verify execution is still pending Tenant A's approval
    detail_a = client.get(f"/api/v1/agents/executions/{exec_a_id}", headers=tenant_a["headers"])
    assert detail_a.status_code == 200
    assert detail_a.json()["status"] == "pending_approval"
