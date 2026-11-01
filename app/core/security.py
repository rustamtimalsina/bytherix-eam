"""Password hashing and access tokens.

Passwords: Argon2id (the current OWASP-recommended algorithm), via argon2-cffi.
Argon2 generates a random salt for every hash and stores the salt and cost
parameters inside the hash string, so you never handle salts yourself.

Tokens: short-lived signed JWTs that carry only the user id. Tenant (organization)
and role are always looked up from the database, never trusted from the client.
"""

import uuid
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.core.config import get_settings

_hasher = PasswordHasher()  # Argon2id with safe default parameters

# Used to burn the same amount of time when an email does not exist, so an
# attacker cannot discover registered emails by measuring response time.
_DUMMY_HASH = _hasher.hash("not-a-real-password-just-for-timing")


def hash_password(plain_password: str) -> str:
    return _hasher.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, plain_password)
    except (VerificationError, InvalidHashError):
        return False


def password_needs_rehash(password_hash: str) -> bool:
    """True if the hash was made with weaker settings than we use today."""
    return _hasher.check_needs_rehash(password_hash)


def burn_password_check_time(plain_password: str) -> None:
    verify_password(plain_password, _DUMMY_HASH)


def create_access_token(user_id: uuid.UUID) -> tuple[str, int]:
    """Returns (token, expires_in_seconds)."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + expires_delta,
        "jti": uuid.uuid4().hex,
    }
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)
    return token, int(expires_delta.total_seconds())


def decode_access_token(token: str) -> uuid.UUID:
    """Returns the user id, or raises jwt.PyJWTError / ValueError if invalid."""
    settings = get_settings()
    payload = jwt.decode(
        token,
        settings.secret_key,
        algorithms=[settings.jwt_algorithm],
        options={"require": ["exp", "iat", "sub"]},
    )
    return uuid.UUID(payload["sub"])
