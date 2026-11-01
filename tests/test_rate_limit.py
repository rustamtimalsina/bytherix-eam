import pytest

from app.core.config import get_settings

SIGNUP = {
    "full_name": "Alex Mercer",
    "email": "alex@acme.ai",
    "password": "correct horse battery",
    "organization_name": "Acme Intelligence",
}


def login(client, email="alex@acme.ai", password="wrong-password"):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


@pytest.fixture()
def registered(client):
    assert client.post("/api/v1/auth/signup", json=SIGNUP).status_code == 201


def test_locked_after_five_failures_even_with_correct_password(client, registered):
    for _ in range(5):
        assert login(client).status_code == 401
    res = login(client, password=SIGNUP["password"])
    assert res.status_code == 429
    assert res.json()["error"]["code"] == "TOO_MANY_ATTEMPTS"
    assert int(res.headers["Retry-After"]) > 0
    assert res.json()["error"]["retry_after_seconds"] > 0


def test_other_accounts_are_not_locked(client, registered):
    for _ in range(5):
        login(client)
    other = login(client, email="someone-else@acme.ai")
    assert other.status_code == 401  # a normal failure, not 429


def test_unknown_email_is_limited_the_same_way(client):
    for _ in range(5):
        assert login(client, email="ghost@acme.ai").status_code == 401
    assert login(client, email="ghost@acme.ai").status_code == 429


def test_successful_login_resets_the_counter(client, registered):
    for _ in range(4):
        assert login(client).status_code == 401
    assert login(client, password=SIGNUP["password"]).status_code == 200
    for _ in range(4):
        assert login(client).status_code == 401
    assert login(client, password=SIGNUP["password"]).status_code == 200


def test_ip_limit_blocks_many_different_emails(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "login_max_failures_per_ip", 3)
    for i in range(3):
        assert login(client, email=f"user{i}@acme.ai").status_code == 401
    assert login(client, email="user99@acme.ai").status_code == 429
