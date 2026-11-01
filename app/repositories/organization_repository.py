import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.models import Membership, Organization


class OrganizationRepository:
    def __init__(self, db: Session):
        self.db = db

    def add_organization(self, org: Organization) -> None:
        self.db.add(org)

    def add_membership(self, membership: Membership) -> None:
        self.db.add(membership)

    def get_active_membership(self, user_id: uuid.UUID) -> Membership | None:
        """The user's oldest active membership, with its organization loaded.

        For now each user belongs to one organization. When multi-org support is
        added, this is the one place that decides which organization is 'current'.
        """
        stmt = (
            select(Membership)
            .options(joinedload(Membership.organization))
            .where(Membership.user_id == user_id, Membership.status == "active")
            .order_by(Membership.created_at)
            .limit(1)
        )
        return self.db.scalar(stmt)
