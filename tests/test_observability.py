import pytest
from fastapi.testclient import TestClient

from app.core.metrics import metrics_registry


@pytest.fixture(autouse=True)
def clean_metrics():
    """Reset metrics registry before and after each test."""
    metrics_registry.reset()
    yield
    metrics_registry.reset()


def test_prometheus_metrics_endpoint_format(client: TestClient):
    """
    Verify Section 13 & 14.3:
    1. /metrics returns HTTP 200 with text/plain Prometheus exposition format.
    2. # HELP and # TYPE headers are present for counters, histograms, and gauges.
    3. Requests increment http_requests_total and record latency in histogram buckets.
    """
    # Make a few test calls to generate traffic
    resp1 = client.get("/health/live")
    assert resp1.status_code == 200

    resp2 = client.get("/health/ready")
    assert resp2.status_code == 200

    # Trigger a 404
    resp_404 = client.get("/non-existent-endpoint")
    assert resp_404.status_code == 404

    # Scrape /metrics
    metrics_resp = client.get("/metrics")
    assert metrics_resp.status_code == 200
    assert "text/plain" in metrics_resp.headers.get("Content-Type", "")

    content = metrics_resp.text

    # Verify Prometheus exposition standards
    assert "# HELP http_requests_total" in content
    assert "# TYPE http_requests_total counter" in content
    assert 'http_requests_total{endpoint="/health/live",method="GET",status="200"}' in content
    assert 'http_requests_total{endpoint="/health/ready",method="GET",status="200"}' in content
    assert 'http_requests_total{endpoint="/non-existent-endpoint",method="GET",status="404"}' in content

    # Verify Histogram exposition
    assert "# HELP http_request_duration_seconds" in content
    assert "# TYPE http_request_duration_seconds histogram" in content
    assert 'http_request_duration_seconds_bucket{endpoint="/health/live",method="GET",le="0.05"}' in content
    assert 'http_request_duration_seconds_bucket{endpoint="/health/live",method="GET",le="+Inf"}' in content
    assert 'http_request_duration_seconds_sum{endpoint="/health/live",method="GET"}' in content
    assert 'http_request_duration_seconds_count{endpoint="/health/live",method="GET"}' in content

    # Verify Gauges
    assert "# HELP active_requests" in content
    assert "# TYPE active_requests gauge" in content
    assert "active_requests" in content

    assert "# HELP system_uptime_seconds" in content
    assert "# TYPE system_uptime_seconds gauge" in content


def test_path_normalization_prevents_cardinality_explosion():
    """Verify UUID and numeric parameters are normalized to {id}."""
    raw_path_uuid = "/api/v1/documents/c3b1a8f9-4d2e-4b6a-9a8c-7f1e2d3c4b5a"
    normalized = metrics_registry.normalize_path(raw_path_uuid)
    assert normalized == "/api/v1/documents/{id}"

    raw_path_num = "/api/v1/items/42/details"
    normalized_num = metrics_registry.normalize_path(raw_path_num)
    assert normalized_num == "/api/v1/items/{id}/details"


def test_token_usage_metric_recording(client: TestClient):
    """Verify token usage metrics are exported correctly to Prometheus."""
    metrics_registry.record_token_usage(
        model="claude-3-5-sonnet",
        organization_id="org-acme-123",
        tokens=1540
    )

    metrics_resp = client.get("/metrics")
    content = metrics_resp.text

    assert "# HELP token_usage_total" in content
    assert "# TYPE token_usage_total counter" in content
    assert 'token_usage_total{model="claude-3-5-sonnet",organization_id="org-acme-123"} 1540' in content


def test_dashboard_telemetry_endpoint_contract(client: TestClient):
    """
    Verify Section 13 Dashboard Telemetry API:
    1. Unauthenticated request rejected with 401.
    2. Authenticated user receives JSON telemetry with p50, p95, p99 latencies,
       throughput, error rate, status breakdown, and top endpoints.
    """
    # 1. Unauthenticated -> 401
    unauth_resp = client.get("/api/v1/observability/telemetry")
    assert unauth_resp.status_code == 401

    # 2. Sign up and authenticate
    signup_resp = client.post("/api/v1/auth/signup", json={
        "email": "telemetry_admin@bytherix.com",
        "password": "Password123!",
        "full_name": "Telemetry Admin",
        "organization_name": "Bytherix Telemetry Corp"
    })
    assert signup_resp.status_code == 201
    token = signup_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Generate various requests
    for _ in range(5):
        client.get("/health/live")

    # Fetch telemetry
    telemetry_resp = client.get("/api/v1/observability/telemetry", headers=headers)
    assert telemetry_resp.status_code == 200
    data = telemetry_resp.json()

    assert "total_requests" in data
    assert data["total_requests"] >= 6  # signup + health checks + telemetry call
    assert "requests_per_minute" in data
    assert "avg_latency_ms" in data
    assert "p50_latency_ms" in data
    assert "p95_latency_ms" in data
    assert "p99_latency_ms" in data
    assert "error_rate_percentage" in data
    assert "status_breakdown" in data
    assert data["status_breakdown"]["2xx"] >= 6
    assert "active_requests" in data
    assert "uptime_seconds" in data
    assert "top_endpoints" in data
    assert isinstance(data["top_endpoints"], list)
