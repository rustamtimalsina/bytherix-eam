"""Business rules for signup and login. No HTTP code in here."""

import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.errors import AppError
from app.core.config import get_settings
from app.core.security import (
    burn_password_check_time,
    create_access_token,
    hash_password,
    password_needs_rehash,
    verify_password,
)
from app.db.base import utcnow
from app.db.models import Membership, Organization, Role, User
from app.repositories.login_attempt_repository import LoginAttemptRepository
from app.repositories.organization_repository import OrganizationRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, SignupRequest


@dataclass
class AuthResult:
    user: User
    organization: Organization
    membership: Membership
    access_token: str
    expires_in: int


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)
        self.orgs = OrganizationRepository(db)
        self.attempts = LoginAttemptRepository(db)

    def signup(self, data: SignupRequest) -> AuthResult:
        email = data.email.lower()

        if self.users.get_by_email(email):
            raise self._email_taken()

        user = User(
            email=email,
            full_name=data.full_name,
            password_hash=hash_password(data.password),
        )
        organization = Organization(name=data.organization_name, plan="free")
        try:
            self.users.add(user)
            self.orgs.add_organization(organization)
            self.db.flush()  
            membership = Membership(
                user_id=user.id, organization_id=organization.id, role=Role.OWNER.value
            )
            self.orgs.add_membership(membership)
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise self._email_taken()

        token, expires_in = create_access_token(user.id)
        return AuthResult(user, organization, membership, token, expires_in)

    def login(self, data: LoginRequest, ip_address: str) -> AuthResult:
        email = data.email.lower()
        self._ensure_not_rate_limited(email, ip_address)

        user = self.users.get_by_email(email)

        if user is None:
            burn_password_check_time(data.password)
            raise self._failed_login(email, ip_address)
        if not verify_password(data.password, user.password_hash):
            raise self._failed_login(email, ip_address)
        if not user.is_active:
            raise self._failed_login(email, ip_address)

        membership = self.orgs.get_active_membership(user.id)
        if membership is None:
            raise AppError(403, "NO_ORGANIZATION", "This account has no active organization.")

        self.attempts.clear_for_email(email)

        if password_needs_rehash(user.password_hash):
            user.password_hash = hash_password(data.password)
        user.last_login_at = utcnow()
        self.db.commit()

        token, expires_in = create_access_token(user.id)
        return AuthResult(user, membership.organization, membership, token, expires_in)


    def _ensure_not_rate_limited(self, email: str, ip_address: str) -> None:
        settings = get_settings()
        window = timedelta(minutes=settings.login_lockout_window_minutes)
        now = utcnow()
        since = now - window

        retry_after = 0
        email_count, email_oldest = self.attempts.stats(since, email=email)
        if email_count >= settings.login_max_failures_per_email:
            retry_after = max(retry_after, self._seconds_left(email_oldest, window, now))
        ip_count, ip_oldest = self.attempts.stats(since, ip=ip_address)
        if ip_count >= settings.login_max_failures_per_ip:
            retry_after = max(retry_after, self._seconds_left(ip_oldest, window, now))

        if retry_after:
            raise AppError(
                429,
                "TOO_MANY_ATTEMPTS",
                "Too many failed login attempts. Please try again later.",
                headers={"Retry-After": str(retry_after)},
                extra={"retry_after_seconds": retry_after},
            )

    @staticmethod
    def _seconds_left(oldest: datetime | None, window: timedelta, now: datetime) -> int:
        if oldest is None:
            return 1
        if oldest.tzinfo is None:  # SQLite returns naive datetimes
            oldest = oldest.replace(tzinfo=timezone.utc)
        return max(1, math.ceil((oldest + window - now).total_seconds()))

    def _failed_login(self, email: str, ip_address: str) -> AppError:
        """Record the failure (and commit it!) before the caller raises the error."""
        self.attempts.add_failure(email, ip_address)
        self.attempts.purge_older_than(utcnow() - timedelta(days=1))
        self.db.commit()
        return AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.")

    @staticmethod
    def _email_taken() -> AppError:
        return AppError(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists.")
