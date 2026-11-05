import json
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.metrics import metrics_registry
from app.db.models.audit import AuditLog
from app.db.models.usage import UsageRecord
from app.services.usage_service import record_usage


def test_token_quota_warning_and_exceeded_alerts(client: TestClient, db: Session):
    """
    Verify Section 6.3 Real-Time Token Quota Alerting:
    1. Tenant starts at 0% usage -> healthy status.
    2. Tenant crosses 80% quota threshold -> warning alert emitted & audit logged.
    3. Tenant crosses 100% quota threshold -> critical alert emitted & audit logged.
    4. GET /api/v1/usage/alerts returns actionable alert item.
    """
    # 1. Signup fresh organization
    signup_payload = {
        "email": "alert_tester@bytherix.com",
        "password": "Password123!",
        "full_name": "Alert Tester",
        "organization_name": "Alert Dynamics"
    }
    resp = client.post("/api/v1/auth/signup", json=signup_payload)
    assert resp.status_code == 201
    token = resp.json()["access_token"]
    org_id = resp.json()["organization_id"]
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Organization-Id": org_id
    }

    # 2. Initial state: Healthy (< 80%)
    usage_resp = client.get("/api/v1/usage", headers=headers)
    assert usage_resp.status_code == 200
    u_data = usage_resp.json()
    assert u_data["quota_status"] == "healthy"
    assert u_data["is_quota_warning"] is False
    assert u_data["is_quota_exceeded"] is False
    assert u_data["warning_threshold"] == 80.0

    alerts_resp = client.get("/api/v1/usage/alerts", headers=headers)
    assert alerts_resp.status_code == 200
    # No quota warnings when 0 tokens used
    token_alerts = [a for a in alerts_resp.json() if "quota" in a["alert_type"]]
    assert len(token_alerts) == 0

    # 3. Add tokens to reach 82,000 (82% of 100,000 allowance -> Warning Threshold)
    record_usage(
        organization_id=org_id,
        user_id=None,
        event_type="rag_inference",
        prompt_tokens=50000,
        completion_tokens=32000,
        model="claude-3-5-sonnet",
        db=db,
        is_billable=True
    )

    # Verify usage reflects warning
    warn_usage = client.get("/api/v1/usage", headers=headers)
    assert warn_usage.status_code == 200
    w_data = warn_usage.json()
    assert w_data["tokens_used"] == 82000
    assert w_data["percentage_used"] == 82.0
    assert w_data["is_quota_warning"] is True
    assert w_data["is_quota_exceeded"] is False
    assert w_data["quota_status"] == "warning"

    # Verify GET /api/v1/usage/alerts reports warning
    warn_alerts_resp = client.get("/api/v1/usage/alerts", headers=headers)
    assert warn_alerts_resp.status_code == 200
    warn_alerts = warn_alerts_resp.json()
    quota_warn = next((a for a in warn_alerts if a["alert_type"] == "quota_warning"), None)
    assert quota_warn is not None
    assert quota_warn["severity"] == "warning"
    assert "82.0%" in quota_warn["message"]

    # Verify Audit log was recorded for quota.warning
    audit_warn = db.query(AuditLog).filter(
        AuditLog.organization_id == org_id,
        AuditLog.action == "quota.warning"
    ).first()
    assert audit_warn is not None
    assert audit_warn.severity == "warning"

    # 4. Add tokens to cross 100,000 (100% Exceeded)
    record_usage(
        organization_id=org_id,
        user_id=None,
        event_type="rag_inference",
        prompt_tokens=15000,
        completion_tokens=5000,
        model="claude-3-5-sonnet",
        db=db,
        is_billable=True
    )

    # Verify usage reflects exceeded status
    exc_usage = client.get("/api/v1/usage", headers=headers)
    assert exc_usage.status_code == 200
    e_data = exc_usage.json()
    assert e_data["tokens_used"] == 102000
    assert e_data["is_quota_warning"] is False
    assert e_data["is_quota_exceeded"] is True
    assert e_data["quota_status"] == "exceeded"

    # Verify alerts endpoint reflects critical quota exceeded
    exc_alerts_resp = client.get("/api/v1/usage/alerts", headers=headers)
    assert exc_alerts_resp.status_code == 200
    exc_alerts = exc_alerts_resp.json()
    quota_exc = next((a for a in exc_alerts if a["alert_type"] == "quota_exceeded"), None)
    assert quota_exc is not None
    assert quota_exc["severity"] == "critical"
    assert quota_exc["action_required"] is True

    # Verify Audit log was recorded for quota.exceeded
    audit_exc = db.query(AuditLog).filter(
        AuditLog.organization_id == org_id,
        AuditLog.action == "quota.exceeded"
    ).first()
    assert audit_exc is not None
    assert audit_exc.severity == "critical"


def test_latency_budget_sla_and_telemetry(client: TestClient):
    """
    Verify Section 13.2 Real-Time Latency Budget and SLA Alerting:
    1. Requests within budget keep SLA compliance at 100% and status healthy.
    2. Slower requests exceeding 2000ms increment sla_breaches_total.
    3. GET /metrics exports sla_breaches_total in Prometheus exposition.
    4. GET /api/v1/observability/telemetry reflects SLA budget metrics.
    """
    metrics_registry.reset()

    # 1. Normal fast request (50ms)
    metrics_registry.record_request("GET", "/api/v1/documents", 200, duration_seconds=0.050)
    telem = metrics_registry.get_dashboard_telemetry()
    assert telem["latency_budget_ms"] == 2000.0
    assert telem["sla_target_ms"] == 2000.0
    assert telem["sla_compliance_percentage"] == 100.0
    assert telem["is_latency_budget_breached"] is False
    assert telem["latency_budget_status"] == "healthy"

    # 2. Slow request exceeding 2000ms SLA target (2.5s)
    metrics_registry.record_request("POST", "/api/v1/chat", 200, duration_seconds=2.500)
    telem2 = metrics_registry.get_dashboard_telemetry()
    assert telem2["sla_compliance_percentage"] == 50.0  # 1 out of 2 compliant
    assert telem2["p95_latency_ms"] >= 2000.0
    assert telem2["is_latency_budget_breached"] is True
    assert telem2["latency_budget_status"] == "breached"

    # 3. Check Prometheus exposition
    metrics_text = metrics_registry.generate_prometheus_exposition()
    assert "# HELP sla_breaches_total" in metrics_text
    assert "# TYPE sla_breaches_total counter" in metrics_text
    assert 'sla_breaches_total{endpoint="/api/v1/chat",method="POST"} 1' in metrics_text
