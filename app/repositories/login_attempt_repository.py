from datetime import datetime

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.db.models import LoginAttempt


class LoginAttemptRepository:
    def __init__(self, db: Session):
        self.db = db

    def stats(
        self, since: datetime, *, email: str | None = None, ip: str | None = None
    ) -> tuple[int, datetime | None]:
        """(number of failures since `since`, time of the oldest one)."""
        stmt = select(func.count(LoginAttempt.id), func.min(LoginAttempt.created_at)).where(
            LoginAttempt.created_at >= since
        )
        if email is not None:
            stmt = stmt.where(LoginAttempt.email == email)
        if ip is not None:
            stmt = stmt.where(LoginAttempt.ip_address == ip)
        count, oldest = self.db.execute(stmt).one()
        return count, oldest

    def add_failure(self, email: str, ip: str) -> None:
        self.db.add(LoginAttempt(email=email[:320], ip_address=ip[:45]))

    def clear_for_email(self, email: str) -> None:
        self.db.execute(delete(LoginAttempt).where(LoginAttempt.email == email))

    def purge_older_than(self, cutoff: datetime) -> None:
        self.db.execute(delete(LoginAttempt).where(LoginAttempt.created_at < cutoff))
