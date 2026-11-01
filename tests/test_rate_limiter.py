import time
from fastapi.testclient import TestClient

from app.core.rate_limiter import InMemoryRateLimiter, rate_limiter


def test_in_memory_rate_limiter_sliding_window():
    """Verify in-memory sliding-window token calculation and retry-after calculation."""
    limiter = InMemoryRateLimiter()

    # Allow 3 requests in a 2-second window
    allowed1, rem1, retry1 = limiter.check_rate_limit("key_a", limit=3, window_seconds=2)
    assert allowed1 is True
    assert rem1 == 2
    assert retry1 == 0

    allowed2, rem2, retry2 = limiter.check_rate_limit("key_a", limit=3, window_seconds=2)
    assert allowed2 is True
    assert rem2 == 1

    allowed3, rem3, retry3 = limiter.check_rate_limit("key_a", limit=3, window_seconds=2)
    assert allowed3 is True
    assert rem3 == 0

    # 4th request should be throttled
    allowed4, rem4, retry4 = limiter.check_rate_limit("key_a", limit=3, window_seconds=2)
    assert allowed4 is False
    assert rem4 == 0
    assert retry4 >= 1

    # Independent key is unaffected
    allowed_b, rem_b, _ = limiter.check_rate_limit("key_b", limit=3, window_seconds=2)
    assert allowed_b is True
    assert rem_b == 2


def test_login_brute_force_lockout_and_audit_trail(client: TestClient):
    """
    Verify Section 12 & 15 Brute-Force defense:
    5 failed login attempts trigger HTTP 429 Too Many Requests,
    inject Retry-After headers, and log a critical security event in AuditLog.
    """
    rate_limiter.reset()

    # 1. Sign up an account
    signup_resp = client.post("/api/v1/auth/signup", json={
        "email": "defender@acme.com",
        "password": "CorrectPassword123!",
        "full_name": "Security Defender",
        "organization_name": "Defended Corp"
    })
    assert signup_resp.status_code == 201
    auth_token = signup_resp.json()["access_token"]
    org_id = signup_resp.json()["organization_id"]

    # 2. Attempt 4 incorrect passwords -> should return 401 Unauthorized
    for i in range(4):
        resp = client.post("/api/v1/auth/login", json={
            "email": "defender@acme.com",
            "password": f"WrongPassword{i}!"
        })
        assert resp.status_code == 401, f"Attempt {i+1} should be 401"
        err_msg = resp.json()["error"]["message"]
        assert "Incorrect email or password" in err_msg

    # 3. 5th incorrect attempt -> triggers lockout threshold (HTTP 429)
    resp_5 = client.post("/api/v1/auth/login", json={
        "email": "defender@acme.com",
        "password": "WrongPassword5!"
    })
    assert resp_5.status_code == 429
    err_5 = resp_5.json()["error"]["message"]
    assert "Too many failed login attempts" in err_5
    assert "Retry-After" in resp_5.headers

    # 4. Even trying the CORRECT password while locked out must be blocked
    resp_locked = client.post("/api/v1/auth/login", json={
        "email": "defender@acme.com",
        "password": "CorrectPassword123!"
    })
    assert resp_locked.status_code == 429
    assert "Too many failed login attempts" in resp_locked.json()["error"]["message"]

    # 5. Check Audit Trail -> critical security event recorded
    audit_resp = client.get("/api/v1/audit-logs", headers={
        "Authorization": f"Bearer {auth_token}",
        "X-Organization-Id": org_id
    })
    assert audit_resp.status_code == 200
    actions = [item["action"] for item in audit_resp.json()["items"]]
    assert "auth.login_brute_force_blocked" in actions


def test_login_success_resets_failed_attempt_counters(client: TestClient):
    """Verify that successful authentication resets failed attempt tracking."""
    rate_limiter.reset()

    # Sign up
    client.post("/api/v1/auth/signup", json={
        "email": "reset_user@acme.com",
        "password": "ValidPassword123!",
        "full_name": "Reset Test User",
        "organization_name": "Reset Corp"
    })

    # 2 failed attempts
    client.post("/api/v1/auth/login", json={"email": "reset_user@acme.com", "password": "Wrong1!"})
    client.post("/api/v1/auth/login", json={"email": "reset_user@acme.com", "password": "Wrong2!"})

    # Successful login
    succ_resp = client.post("/api/v1/auth/login", json={
        "email": "reset_user@acme.com",
        "password": "ValidPassword123!"
    })
    assert succ_resp.status_code == 200

    # Counter should be reset: another 4 failed attempts should still be 401, not 429
    for i in range(4):
        resp = client.post("/api/v1/auth/login", json={
            "email": "reset_user@acme.com",
            "password": f"NewWrong{i}!"
        })
        assert resp.status_code == 401
