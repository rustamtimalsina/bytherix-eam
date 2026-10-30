import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def test_member_invitation_lifecycle(client: TestClient, db: Session):
    """
    Verify Section 7.1 Organization Onboarding & Membership Lifecycle:
    1. Owner creates organization and invites member with specific role.
    2. Single-use invitation token with expiration is generated.
    3. Invitee accepts invitation, establishes credentials, and joins.
    4. Member can log in and belongs to organization.
    5. Owner updates member role.
    6. Owner removes member.
    7. Sole owner cannot be removed.
    """
    # 1. Signup owner
    owner_payload = {
        "email": "owner_test@bytherix.com",
        "password": "Password123!",
        "full_name": "Org Owner",
        "organization_name": "Acme Enterprise"
    }
    resp = client.post("/api/v1/auth/signup", json=owner_payload)
    assert resp.status_code == 201
    owner_data = resp.json()
    owner_token = owner_data["access_token"]
    org_id = owner_data["organization_id"]
    headers = {
        "Authorization": f"Bearer {owner_token}",
        "X-Organization-Id": org_id
    }

    # 2. Invite a new member
    invite_resp = client.post(
        f"/api/v1/organizations/{org_id}/members/invite",
        headers=headers,
        json={"email": "developer@bytherix.com", "role": "developer"}
    )
    assert invite_resp.status_code == 201
    invite_data = invite_resp.json()
    assert invite_data["status"] == "invited"
    assert invite_data["role"] == "developer"
    assert invite_data["user_email"] == "developer@bytherix.com"
    token = invite_data["invitation_token"]
    assert token is not None
    assert len(token) > 20
    membership_id = invite_data["id"]

    # 3. List members
    list_resp = client.get(f"/api/v1/organizations/{org_id}/members", headers=headers)
    assert list_resp.status_code == 200
    members = list_resp.json()
    assert len(members) == 2
    emails = [m["user_email"] for m in members]
    assert "owner_test@bytherix.com" in emails
    assert "developer@bytherix.com" in emails

    # 4. Invitee accepts invitation
    accept_resp = client.post(
        "/api/v1/organizations/accept-invite",
        json={
            "token": token,
            "password": "DeveloperPassword123!",
            "full_name": "Lead Developer"
        }
    )
    assert accept_resp.status_code == 200
    assert "Successfully joined" in accept_resp.json()["message"]

    # 5. Invitee logs in
    login_resp = client.post(
        "/api/v1/auth/login",
        json={
            "email": "developer@bytherix.com",
            "password": "DeveloperPassword123!",
            "organization_id": org_id
        }
    )
    assert login_resp.status_code == 200
    assert login_resp.json()["role"] == "developer"

    # 6. Cannot accept the same invite twice (single-use token verification)
    reuse_resp = client.post(
        "/api/v1/organizations/accept-invite",
        json={
            "token": token,
            "password": "DeveloperPassword123!",
            "full_name": "Lead Developer"
        }
    )
    assert reuse_resp.status_code == 404

    # 7. Update member role
    patch_resp = client.patch(
        f"/api/v1/organizations/{org_id}/members/{membership_id}",
        headers=headers,
        json={"role": "analyst"}
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["role"] == "analyst"

    # 8. Sole owner protection: owner cannot be removed
    owner_membership = [m for m in members if m["role"] == "organization_owner"][0]
    delete_owner_resp = client.delete(
        f"/api/v1/organizations/{org_id}/members/{owner_membership['id']}",
        headers=headers
    )
    assert delete_owner_resp.status_code == 400
    err_text = delete_owner_resp.json().get("error", {}).get("message", "") or delete_owner_resp.json().get("detail", "")
    assert "sole organization owner" in err_text.lower()

    # 9. Remove developer/analyst member
    delete_resp = client.delete(
        f"/api/v1/organizations/{org_id}/members/{membership_id}",
        headers=headers
    )
    assert delete_resp.status_code == 200
    assert delete_resp.json()["success"] is True

    # 10. Verify member list now only has 1 member
    list_after = client.get(f"/api/v1/organizations/{org_id}/members", headers=headers)
    assert len(list_after.json()) == 1
