from fastapi.testclient import TestClient


def test_api_key_lifecycle_and_authentication(client: TestClient):
    """
    Test API key creation, authentication, and immediate revocation (Section 7.2 & 13.2 Scenario 2).
    """
    # 1. Sign up user & create org
    resp = client.post("/api/v1/auth/signup", json={
        "email": "dev@bytherix.com",
        "password": "Password123!",
        "full_name": "Dev User",
        "organization_name": "Dev Corp"
    })
    assert resp.status_code == 201
    jwt_token = resp.json()["access_token"]
    org_id = resp.json()["organization_id"]
    jwt_headers = {
        "Authorization": f"Bearer {jwt_token}",
        "X-Organization-Id": org_id
    }

    # 2. Create an API key
    key_payload = {
        "name": "CI/CD Deployment Key",
        "scopes": "*",
        "expires_in_days": 30
    }
    resp = client.post("/api/v1/api-keys", json=key_payload, headers=jwt_headers)
    assert resp.status_code == 201
    key_data = resp.json()
    raw_key = key_data["raw_key"]
    key_id = key_data["id"]
    assert raw_key.startswith("bx_live_")

    # 3. Use the raw key in X-API-Key header to authenticate
    api_headers = {
        "X-API-Key": raw_key
    }
    resp = client.get("/api/v1/documents", headers=api_headers)
    assert resp.status_code == 200
    assert resp.json() == []

    # 4. Revoke the key
    resp = client.delete(f"/api/v1/api-keys/{key_id}", headers=jwt_headers)
    assert resp.status_code == 200

    # 5. Verify revoked key cannot access endpoints (Section 13.2 Scenario 2)
    resp = client.get("/api/v1/documents", headers=api_headers)
    assert resp.status_code == 401
    assert "revoked" in resp.json()["error"]["message"].lower()
