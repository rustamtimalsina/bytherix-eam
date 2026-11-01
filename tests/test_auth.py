from sqlalchemy import select

from app.db.models import Membership, Organization, User

SIGNUP = {
    "full_name": "Alex Mercer",
    "email": "alex@acme.ai",
    "password": "correct horse battery",
    "organization_name": "Acme Intelligence",
}


def signup(client, **overrides):
    return client.post("/api/v1/auth/signup", json={**SIGNUP, **overrides})


def test_signup_creates_user_org_and_owner_membership(client, session_factory):
    res = signup(client)
    assert res.status_code == 201
    body = res.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "alex@acme.ai"
    assert body["organization"]["name"] == "Acme Intelligence"
    assert body["role"] == "owner"
    assert "password" not in str(body).lower()

    with session_factory() as db:
        assert len(db.scalars(select(User)).all()) == 1
        assert len(db.scalars(select(Organization)).all()) == 1
        assert db.scalars(select(Membership)).one().role == "owner"


def test_password_is_stored_as_argon2_hash_not_plaintext(client, session_factory):
    signup(client)
    with session_factory() as db:
        user = db.scalars(select(User)).one()
    assert user.password_hash != SIGNUP["password"]
    assert user.password_hash.startswith("$argon2id$")
    assert SIGNUP["password"] not in user.password_hash


def test_same_password_gets_different_hashes(client, session_factory):
    signup(client, email="a@acme.ai")
    signup(client, email="b@acme.ai", organization_name="Other Org")
    with session_factory() as db:
        hashes = [u.password_hash for u in db.scalars(select(User)).all()]
    assert len(set(hashes)) == 2  # random salt per hash


def test_duplicate_email_rejected_case_insensitively(client):
    assert signup(client).status_code == 201
    res = signup(client, email="ALEX@Acme.AI")
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "EMAIL_ALREADY_REGISTERED"


def test_short_password_rejected_and_not_echoed(client):
    res = signup(client, password="short")
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"
    assert "short" not in res.text.replace("should have at least", "")


def test_invalid_email_rejected(client):
    assert signup(client, email="not-an-email").status_code == 422


def test_login_success(client):
    signup(client)
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "Alex@acme.ai", "password": SIGNUP["password"]},
    )
    assert res.status_code == 200
    assert res.json()["access_token"]


def test_login_wrong_password_and_unknown_email_look_identical(client):
    signup(client)
    wrong_pw = client.post(
        "/api/v1/auth/login", json={"email": "alex@acme.ai", "password": "wrong-password"}
    )
    unknown = client.post(
        "/api/v1/auth/login", json={"email": "nobody@acme.ai", "password": "wrong-password"}
    )
    assert wrong_pw.status_code == unknown.status_code == 401
    assert wrong_pw.json()["error"]["message"] == unknown.json()["error"]["message"]
    assert wrong_pw.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_inactive_user_cannot_log_in(client, session_factory):
    signup(client)
    with session_factory() as db:
        user = db.scalars(select(User)).one()
        user.is_active = False
        db.commit()
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "alex@acme.ai", "password": SIGNUP["password"]},
    )
    assert res.status_code == 401


def test_me_with_valid_token(client):
    token = signup(client).json()["access_token"]
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["user"]["email"] == "alex@acme.ai"
    assert res.json()["role"] == "owner"


def test_me_without_token_is_401(client):
    assert client.get("/api/v1/auth/me").status_code == 401


def test_me_with_garbage_token_is_401(client):
    res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not.a.token"})
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "INVALID_TOKEN"


def test_each_signup_gets_its_own_organization(client):
    a = signup(client, email="a@acme.ai", organization_name="Org A").json()
    b = signup(client, email="b@beta.ai", organization_name="Org B").json()
    assert a["organization"]["id"] != b["organization"]["id"]
    me_a = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {a['access_token']}"}
    ).json()
    assert me_a["organization"]["name"] == "Org A"


def test_health_endpoints(client):
    assert client.get("/health/live").json() == {"status": "ok"}
    assert client.get("/health/ready").status_code == 200
