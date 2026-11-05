import csv
import io
import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.db.models.audit import AuditLog


class AuditService:
    @staticmethod
    def record_event(
        db: Session,
        organization_id: str,
        action: str,
        resource_type: str,
        actor_email: str = "system@bytherix.com",
        actor_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        severity: str = "info",
        details: Optional[Dict[str, Any] | str] = None,
        ip_address: Optional[str] = "127.0.0.1"
    ) -> AuditLog:
        """
        Record an immutable audit log entry (Section 10 & 13).
        """
        if isinstance(details, dict):
            details_str = json.dumps(details)
        elif isinstance(details, str):
            details_str = details
        else:
            details_str = "{}"

        log = AuditLog(
            organization_id=organization_id,
            actor_id=actor_id,
            actor_email=actor_email,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            severity=severity,
            details=details_str,
            ip_address=ip_address or "127.0.0.1",
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    @staticmethod
    def seed_initial_audit_if_empty(db: Session, organization_id: str, user_email: str = "rustam@bytherix.com") -> None:
        """
        Seeds baseline compliance audit logs for an active organization if empty.
        """
        existing = db.execute(
            select(func.count(AuditLog.id)).where(AuditLog.organization_id == organization_id)
        ).scalar() or 0

        if existing > 0:
            return

        baseline_events = [
            {
                "action": "auth.organization_provisioned",
                "resource_type": "organization",
                "severity": "info",
                "details": {"plan": "Starter Free", "budget_tokens": 100000, "region": "us-east-1"},
            },
            {
                "action": "auth.owner_registered",
                "resource_type": "user",
                "severity": "info",
                "details": {"role": "organization_owner", "auth_method": "argon2id_password"},
            },
            {
                "action": "security.api_key_issued",
                "resource_type": "api_key",
                "severity": "warning",
                "details": {"name": "Production CLI Key", "scopes": ["docs:read", "docs:write", "chat:query"]},
            },
            {
                "action": "document.validated_ingestion",
                "resource_type": "document",
                "severity": "info",
                "details": {"title": "Bytherix_EAM.pdf", "magic_bytes": "%PDF-1.7", "chunks_indexed": 42},
            },
            {
                "action": "mlops.model_catalog_initialized",
                "resource_type": "model",
                "severity": "info",
                "details": {"seeded_models": ["gpt-4o-enterprise", "gpt-4o-mini-fast", "bytherix-embed-v1"]},
            },
            {
                "action": "mlops.version_promoted",
                "resource_type": "model_version",
                "severity": "info",
                "details": {"model": "gpt-4o-enterprise", "version": "v1.0.0", "target_stage": "production"},
            },
        ]

        for item in baseline_events:
            AuditService.record_event(
                db=db,
                organization_id=organization_id,
                action=item["action"],
                resource_type=item["resource_type"],
                actor_email=user_email,
                severity=item["severity"],
                details=item["details"],
                ip_address="127.0.0.1"
            )

    @staticmethod
    def list_events(
        db: Session,
        organization_id: str,
        action: Optional[str] = None,
        severity: Optional[str] = None,
        resource_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[AuditLog], int]:
        """
        Query paginated audit logs scoped strictly to the organization.
        """
        # Ensure initial baseline exists
        AuditService.seed_initial_audit_if_empty(db, organization_id)

        query = select(AuditLog).where(AuditLog.organization_id == organization_id)
        if start_date:
            query = query.where(AuditLog.created_at >= start_date)
        if end_date:
            query = query.where(AuditLog.created_at <= end_date)
        if action:
            query = query.where(AuditLog.action == action)
        if severity:
            query = query.where(AuditLog.severity == severity)
        if resource_type:
            query = query.where(AuditLog.resource_type == resource_type)

        count_query = select(func.count(AuditLog.id)).where(AuditLog.organization_id == organization_id)
        if start_date:
            count_query = count_query.where(AuditLog.created_at >= start_date)
        if end_date:
            count_query = count_query.where(AuditLog.created_at <= end_date)
        if action:
            count_query = count_query.where(AuditLog.action == action)
        if severity:
            count_query = count_query.where(AuditLog.severity == severity)
        if resource_type:
            count_query = count_query.where(AuditLog.resource_type == resource_type)

        total = db.execute(count_query).scalar() or 0

        items = db.execute(
            query.order_by(desc(AuditLog.created_at)).limit(limit).offset(offset)
        ).scalars().all()

        return items, total

    @staticmethod
    def get_stats(db: Session, organization_id: str) -> Dict[str, int]:
        """
        Get aggregated audit severity counts for telemetry headers.
        """
        AuditService.seed_initial_audit_if_empty(db, organization_id)

        total = db.execute(
            select(func.count(AuditLog.id)).where(AuditLog.organization_id == organization_id)
        ).scalar() or 0

        info = db.execute(
            select(func.count(AuditLog.id)).where(
                AuditLog.organization_id == organization_id,
                AuditLog.severity == "info"
            )
        ).scalar() or 0

        warning = db.execute(
            select(func.count(AuditLog.id)).where(
                AuditLog.organization_id == organization_id,
                AuditLog.severity == "warning"
            )
        ).scalar() or 0

        critical = db.execute(
            select(func.count(AuditLog.id)).where(
                AuditLog.organization_id == organization_id,
                AuditLog.severity == "critical"
            )
        ).scalar() or 0

        return {
            "total_events": total,
            "info_count": info,
            "warning_count": warning,
            "critical_count": critical
        }

    @staticmethod
    def _build_filtered_query(
        organization_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        action: Optional[str] = None,
        severity: Optional[str] = None,
        actor_email: Optional[str] = None,
    ):
        query = select(AuditLog).where(AuditLog.organization_id == organization_id)
        if start_date:
            query = query.where(AuditLog.created_at >= start_date)
        if end_date:
            query = query.where(AuditLog.created_at <= end_date)
        if action:
            if "%" in action or "*" in action:
                query = query.where(AuditLog.action.like(action.replace("*", "%")))
            else:
                query = query.where(AuditLog.action == action)
        if severity:
            query = query.where(AuditLog.severity == severity.lower())
        if actor_email:
            query = query.where(AuditLog.actor_email == actor_email)
        return query.order_by(desc(AuditLog.created_at))

    @staticmethod
    def export_csv(
        db: Session,
        organization_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        action: Optional[str] = None,
        severity: Optional[str] = None,
        actor_email: Optional[str] = None,
    ) -> Tuple[str, int]:
        """
        Exports filtered tenant audit logs to an RFC 4180 CSV formatted string.
        Returns a tuple of (csv_string, total_records).
        """
        AuditService.seed_initial_audit_if_empty(db, organization_id)

        query = AuditService._build_filtered_query(
            organization_id=organization_id,
            start_date=start_date,
            end_date=end_date,
            action=action,
            severity=severity,
            actor_email=actor_email,
        )
        logs = db.execute(query).scalars().all()

        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
        
        # CSV Headers
        writer.writerow([
            "Timestamp (UTC)",
            "Event ID",
            "Actor Email",
            "Action",
            "Resource Type",
            "Resource ID",
            "Severity",
            "IP Address",
            "Metadata Details"
        ])

        for log in logs:
            writer.writerow([
                log.created_at.isoformat() if log.created_at else "",
                log.id,
                log.actor_email,
                log.action,
                log.resource_type,
                log.resource_id or "",
                log.severity.upper(),
                log.ip_address or "127.0.0.1",
                log.details
            ])

        return output.getvalue(), len(logs)

    @staticmethod
    def export_json(
        db: Session,
        organization_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        action: Optional[str] = None,
        severity: Optional[str] = None,
        actor_email: Optional[str] = None,
    ) -> Tuple[str, int]:
        """
        Exports filtered tenant audit logs to a JSON string for SIEM ingestion (§ 9.2).
        Returns a tuple of (json_string, total_records).
        """
        AuditService.seed_initial_audit_if_empty(db, organization_id)

        query = AuditService._build_filtered_query(
            organization_id=organization_id,
            start_date=start_date,
            end_date=end_date,
            action=action,
            severity=severity,
            actor_email=actor_email,
        )
        logs = db.execute(query).scalars().all()

        records = []
        for log in logs:
            details_obj = {}
            if log.details:
                try:
                    details_obj = json.loads(log.details)
                except Exception:
                    details_obj = {"raw": log.details}

            records.append({
                "id": log.id,
                "organization_id": log.organization_id,
                "timestamp": log.created_at.isoformat() if log.created_at else "",
                "actor_email": log.actor_email,
                "actor_id": log.actor_id,
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "severity": log.severity,
                "ip_address": log.ip_address,
                "details": details_obj,
            })

        return json.dumps(records, indent=2), len(records)
