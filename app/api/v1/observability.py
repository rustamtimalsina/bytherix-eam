from fastapi import APIRouter, Depends, Response
from typing import Any, Dict

from app.core.metrics import metrics_registry
from app.core.tenant_context import get_current_user
from app.db.models.user import User

router = APIRouter(prefix="/observability", tags=["Observability & Telemetry"])


@router.get("/telemetry", response_model=Dict[str, Any])
def get_live_telemetry(
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve real-time platform observability telemetry (Section 13 & 14.3):
    - Request latencies: average, p50, p95, p99 percentiles
    - Active concurrent requests and requests per minute (throughput)
    - Status code distribution (2xx, 4xx, 5xx) and error rate percentage
    - System uptime and top endpoint traffic
    """
    return metrics_registry.get_dashboard_telemetry()


@router.get("/metrics")
def get_prometheus_metrics():
    """
    Expose Prometheus text exposition format (version 0.0.4) for external scrapers.
    """
    exposition = metrics_registry.generate_prometheus_exposition()
    return Response(
        content=exposition,
        media_type="text/plain; version=0.0.4; charset=utf-8",
    )
