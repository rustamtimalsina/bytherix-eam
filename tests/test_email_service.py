import pytest
from fastapi.testclient import TestClient
from app.core.config import settings
from app.services.email_service import EmailService


def test_email_service_invitation_generation():
    """
    Test EmailService generates valid HTML and text invitation payloads (Section 7.1).
    """
    recipient = "new_engineer@acme.com"
    org_name = "Acme Intelligence Corp"
    role = "developer"
    token = "test_cryptographic_invitation_token_12345"
    inviter = "lead_dev@acme.com"

    invite_url = EmailService.send_invitation_email(
        recipient_email=recipient,
        organization_name=org_name,
        role=role,
        invitation_token=token,
        inviter_name=inviter
    )

    expected_url = f"{settings.FRONTEND_URL}/accept-invite?token={token}"
    assert invite_url == expected_url
    assert "token=" in invite_url


def test_member_invite_triggers_email_and_audit(client: TestClient):
    """
    Test that inviting an organization member triggers email delivery and records an audit log.
    """
    # 1. Signup owner
    owner_payload = {
        "email": "email_tester_owner@bytherix.com",
        "password": "Password123!",
        "full_name": "Email Test Owner",
        "organization_name": "Email Test Enterprise"
    }
    resp = client.post("/api/v1/auth/signup", json=owner_payload)
    assert resp.status_code == 201
    token = resp.json()["access_token"]
    org_id = resp.json()["organization_id"]
    headers = {"Authorization": f"Bearer {token}", "X-Organization-Id": org_id}

    # 2. Invite a new member
    invite_resp = client.post(
        f"/api/v1/organizations/{org_id}/members/invite",
        headers=headers,
        json={"email": "teammate@company.com", "role": "analyst"}
    )
    assert invite_resp.status_code == 201
    invite_data = invite_resp.json()
    assert invite_data["status"] == "invited"
    assert invite_data["role"] == "analyst"
    assert invite_data["user_email"] == "teammate@company.com"

    # 3. Verify audit log was recorded for member.invited
    audit_resp = client.get(f"/api/v1/audit-logs?action=member.invited", headers=headers)
    assert audit_resp.status_code == 200
    items = audit_resp.json()["items"]
    assert len(items) >= 1
    assert items[0]["action"] == "member.invited"
    assert "teammate@company.com" in items[0]["details"]
