import json
from fastapi.testclient import TestClient


def test_governed_agent_workflows_and_approval_gate(client: TestClient, sample_pdf_bytes: bytes):
    """
    Test Phase 7 / Section 8.4 Governed Agent Workflows:
    1. Workflow discovery from allowlisted catalog.
    2. Automatic multi-step execution using allowlisted tools.
    3. Human-in-the-loop approval gate (pauses at pending_approval until authorized).
    4. Admin approval transitions state to completed.
    5. Tenant boundary isolation.
    """
    # 1. Sign up Owner (Org Alpha)
    signup_payload = {
        "email": "agent_owner@bytherix.com",
        "password": "Password123!",
        "full_name": "Agent Commander",
        "organization_name": "Agent Org"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_payload)
    assert resp.status_code == 201
    token = resp.json()["access_token"]
    org_id = resp.json()["organization_id"]
    headers = {"Authorization": f"Bearer {token}", "X-Organization-Id": org_id}

    # Upload document to tenant
    files = {"file": ("doc.pdf", sample_pdf_bytes, "application/pdf")}
    client.post("/api/v1/documents", files=files, headers=headers)

    # 2. List approved workflows
    wf_resp = client.get("/api/v1/agents/workflows", headers=headers)
    assert wf_resp.status_code == 200
    workflows = wf_resp.json()
    assert len(workflows) >= 3
    wf_names = [w["id"] for w in workflows]
    assert "knowledge_auditor" in wf_names
    assert "governed_data_export" in wf_names

    # 3. Execute non-gated workflow (Enterprise Knowledge Auditor)
    exec_resp = client.post("/api/v1/agents/executions", json={
        "workflow_name": "Enterprise Knowledge Auditor",
        "input_prompt": "Audit tenant compliance and token health"
    }, headers=headers)
    assert exec_resp.status_code == 201
    exec_data = exec_resp.json()
    assert exec_data["status"] == "completed"
    assert exec_data["total_steps"] == 3
    assert len(exec_data["traces"]) == 3
    assert "Audit Inventory" in exec_data["traces"][2]["tool_output"]

    # 4. Execute gated workflow (Governed Data Export & Integration)
    gated_resp = client.post("/api/v1/agents/executions", json={
        "workflow_name": "Governed Data Export & Integration",
        "input_prompt": "Export organizational compliance report to archive"
    }, headers=headers)
    assert gated_resp.status_code == 201
    gated_data = gated_resp.json()
    exec_id = gated_data["id"]
    # Must pause at approval gate
    assert gated_data["status"] == "pending_approval"
    assert gated_data["pending_tool_name"] == "SensitiveExportTool"
    assert gated_data["traces"][2]["status"] == "pending_approval"
    assert gated_data["traces"][2]["requires_approval"] is True

    # 5. Admin Approves the action (Section 8.4 #6 & #7)
    approve_resp = client.post(f"/api/v1/agents/executions/{exec_id}/approval", json={
        "approve": True,
        "reason": "Verified audit compliance standards."
    }, headers=headers)
    assert approve_resp.status_code == 200
    approved_data = approve_resp.json()
    assert approved_data["status"] == "completed"
    assert "Action Approved & Executed by Administrator" in approved_data["final_output"]

    # 6. Cross-tenant isolation: Org Beta cannot inspect Org Alpha's execution
    signup_b = {
        "email": "hacker@other.com",
        "password": "Password123!",
        "full_name": "Hacker User",
        "organization_name": "Other Corp"
    }
    resp_b = client.post("/api/v1/auth/signup", json=signup_b)
    token_b = resp_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    leak_resp = client.get(f"/api/v1/agents/executions/{exec_id}", headers=headers_b)
    assert leak_resp.status_code == 404
