import os
import re
import threading
import time
from typing import Any, Dict, List, Optional, Tuple


class InMemoryMetricsRegistry:
    """
    Thread-safe Prometheus metrics registry and real-time observability engine
    compliant with Section 13 (Observability & Monitoring) and Section 14.3 (Health & Metrics).
    Includes Real-Time Latency Budget and SLA Alerting (Section 13.2).
    """

    HISTOGRAM_BUCKETS = (0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)
    DEFAULT_LATENCY_BUDGET_MS = 2000.0  # 2.0s SLA Budget Target

    def __init__(self):
        self._lock = threading.Lock()
        self._start_time = time.time()

        # Counters: (name, label_tuple) -> count
        # e.g., ("http_requests_total", (("endpoint", "/api/v1/documents"), ("method", "GET"), ("status", "200"))) -> 12
        self._counters: Dict[Tuple[str, Tuple[Tuple[str, str], ...]], float] = {}

        # Gauges: (name, label_tuple) -> value
        self._gauges: Dict[Tuple[str, Tuple[Tuple[str, str], ...]], float] = {}

        # Histograms: (name, label_tuple) -> {"buckets": {le: count}, "sum": float, "count": int}
        self._histograms: Dict[Tuple[str, Tuple[Tuple[str, str], ...]], Dict[str, Any]] = {}

        # Sliding window of recent request latencies in milliseconds for accurate p50, p95, p99 calculation
        # list of (timestamp, duration_ms)
        self._recent_latencies: List[Tuple[float, float]] = []

        # Internal active requests counter
        self._active_requests = 0

        # Latency Budget SLA (Section 13.2)
        self.latency_budget_ms = self.DEFAULT_LATENCY_BUDGET_MS
        self._last_breach_alert_time = 0.0

    def reset(self):
        """Reset all metrics state for clean test isolation."""
        with self._lock:
            self._start_time = time.time()
            self._counters.clear()
            self._gauges.clear()
            self._histograms.clear()
            self._recent_latencies.clear()
            self._active_requests = 0
            self._last_breach_alert_time = 0.0

    @staticmethod
    def normalize_path(path: str) -> str:
        """
        Normalize dynamic route parameters (UUIDs, hashes, and numeric IDs)
        to prevent high-cardinality label explosion in Prometheus.
        """
        if not path:
            return "/"
        # Replace UUID patterns (e.g. 123e4567-e89b-12d3-a456-426614174000)
        p = re.sub(
            r"/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
            "/{id}",
            path,
        )
        # Replace 32-char hex hashes
        p = re.sub(r"/[0-9a-fA-F]{32,64}", "/{hash}", p)
        # Replace purely numeric IDs (e.g. /123)
        p = re.sub(r"/\d+", "/{id}", p)
        return p

    def inc_active_requests(self):
        with self._lock:
            self._active_requests += 1

    def dec_active_requests(self):
        with self._lock:
            if self._active_requests > 0:
                self._active_requests -= 1

    def record_request(
        self,
        method: str,
        path: str,
        status_code: int,
        duration_seconds: float,
    ):
        """Record an HTTP request into counters, latency histograms, recent latency queue, and SLA breach tracking."""
        normalized_path = self.normalize_path(path)
        status_str = str(status_code)
        method_upper = method.upper()

        labels = (
            ("endpoint", normalized_path),
            ("method", method_upper),
            ("status", status_str),
        )

        duration_ms = duration_seconds * 1000.0
        now = time.time()

        with self._lock:
            # 1. Increment http_requests_total
            counter_key = ("http_requests_total", labels)
            self._counters[counter_key] = self._counters.get(counter_key, 0.0) + 1.0

            # 2. SLA Latency Budget Tracking (Section 13.2)
            if duration_ms > self.latency_budget_ms:
                breach_labels = (
                    ("endpoint", normalized_path),
                    ("method", method_upper),
                )
                breach_key = ("sla_breaches_total", breach_labels)
                self._counters[breach_key] = self._counters.get(breach_key, 0.0) + 1.0

            # 3. Record in http_request_duration_seconds histogram
            hist_labels = (
                ("endpoint", normalized_path),
                ("method", method_upper),
            )
            hist_key = ("http_request_duration_seconds", hist_labels)
            if hist_key not in self._histograms:
                self._histograms[hist_key] = {
                    "buckets": {le: 0 for le in self.HISTOGRAM_BUCKETS},
                    "sum": 0.0,
                    "count": 0,
                }

            h = self._histograms[hist_key]
            h["count"] += 1
            h["sum"] += duration_seconds
            for le in self.HISTOGRAM_BUCKETS:
                if duration_seconds <= le:
                    h["buckets"][le] += 1

            # 4. Store in recent latencies (keep up to 1,000 recent samples within the last 5 minutes)
            cutoff = now - 300.0
            self._recent_latencies = [
                item for item in self._recent_latencies if item[0] > cutoff
            ]
            self._recent_latencies.append((now, duration_ms))

    def record_token_usage(
        self,
        model: str,
        organization_id: str,
        tokens: int,
    ):
        """Record LLM token consumption into Prometheus counters."""
        labels = (
            ("model", model),
            ("organization_id", str(organization_id)),
        )
        with self._lock:
            key = ("token_usage_total", labels)
            self._counters[key] = self._counters.get(key, 0.0) + float(tokens)

    def generate_prometheus_exposition(self) -> str:
        """
        Generate standard Prometheus text exposition format (version 0.0.4).
        """
        lines: List[str] = []

        with self._lock:
            # 1. http_requests_total
            lines.append("# HELP http_requests_total Total number of HTTP requests processed")
            lines.append("# TYPE http_requests_total counter")
            for (name, labels), count in sorted(self._counters.items()):
                if name == "http_requests_total":
                    label_str = ",".join(f'{k}="{v}"' for k, v in labels)
                    lines.append(f"{name}{{{label_str}}} {int(count)}")

            # 2. sla_breaches_total (Section 13.2)
            has_breaches = any(name == "sla_breaches_total" for name, _ in self._counters.keys())
            if has_breaches:
                lines.append("# HELP sla_breaches_total Cumulative requests exceeding the SLA latency budget")
                lines.append("# TYPE sla_breaches_total counter")
                for (name, labels), count in sorted(self._counters.items()):
                    if name == "sla_breaches_total":
                        label_str = ",".join(f'{k}="{v}"' for k, v in labels)
                        lines.append(f"{name}{{{label_str}}} {int(count)}")

            # 3. token_usage_total
            has_tokens = any(name == "token_usage_total" for name, _ in self._counters.keys())
            if has_tokens:
                lines.append("# HELP token_usage_total Cumulative tokens consumed by LLM and MLOps inference")
                lines.append("# TYPE token_usage_total counter")
                for (name, labels), count in sorted(self._counters.items()):
                    if name == "token_usage_total":
                        label_str = ",".join(f'{k}="{v}"' for k, v in labels)
                        lines.append(f"{name}{{{label_str}}} {int(count)}")

            # 4. http_request_duration_seconds (histogram)
            lines.append("# HELP http_request_duration_seconds HTTP request duration in seconds")
            lines.append("# TYPE http_request_duration_seconds histogram")
            for (name, labels), data in sorted(self._histograms.items()):
                base_labels = ",".join(f'{k}="{v}"' for k, v in labels)
                # Output buckets
                for le in self.HISTOGRAM_BUCKETS:
                    le_labels = f'{base_labels},le="{le}"' if base_labels else f'le="{le}"'
                    lines.append(f"{name}_bucket{{{le_labels}}} {data['buckets'][le]}")
                # Output +Inf bucket
                inf_labels = f'{base_labels},le="+Inf"' if base_labels else 'le="+Inf"'
                lines.append(f"{name}_bucket{{{inf_labels}}} {data['count']}")
                # Output sum and count
                lines.append(f"{name}_sum{{{base_labels}}} {data['sum']:.6f}")
                lines.append(f"{name}_count{{{base_labels}}} {data['count']}")

            # 5. active_requests (gauge)
            lines.append("# HELP active_requests Currently in-flight HTTP requests")
            lines.append("# TYPE active_requests gauge")
            lines.append(f"active_requests {self._active_requests}")

            # 6. system_uptime_seconds (gauge)
            uptime = time.time() - self._start_time
            lines.append("# HELP system_uptime_seconds Application uptime in seconds")
            lines.append("# TYPE system_uptime_seconds gauge")
            lines.append(f"system_uptime_seconds {uptime:.2f}")

        # Trailing newline required by Prometheus RFC
        return "\n".join(lines) + "\n"

    def get_dashboard_telemetry(self) -> Dict[str, Any]:
        """
        Generate structured JSON telemetry for the frontend dashboard cards:
        - Latency percentiles (p50, p95, p99)
        - Latency Budget SLA compliance & breach status (Section 13.2)
        - Throughput (req/min)
        - Error rate (%)
        - Status code distribution (2xx, 4xx, 5xx)
        - Active requests & uptime
        """
        now = time.time()
        with self._lock:
            uptime = max(1.0, now - self._start_time)
            active = self._active_requests

            # Calculate total requests and status code breakdown
            status_breakdown = {"2xx": 0, "4xx": 0, "5xx": 0, "other": 0}
            total_requests = 0
            endpoint_counts: Dict[str, Dict[str, Any]] = {}

            for (name, labels), count in self._counters.items():
                if name == "http_requests_total":
                    count_int = int(count)
                    total_requests += count_int
                    label_dict = dict(labels)
                    status = label_dict.get("status", "200")
                    endpoint = label_dict.get("endpoint", "/")

                    if status.startswith("2"):
                        status_breakdown["2xx"] += count_int
                    elif status.startswith("4"):
                        status_breakdown["4xx"] += count_int
                    elif status.startswith("5"):
                        status_breakdown["5xx"] += count_int
                    else:
                        status_breakdown["other"] += count_int

                    if endpoint not in endpoint_counts:
                        endpoint_counts[endpoint] = {"endpoint": endpoint, "requests": 0}
                    endpoint_counts[endpoint]["requests"] += count_int

            # Calculate requests per minute (based on sliding window or uptime)
            recent_count = len(self._recent_latencies)
            rpm = (recent_count / min(uptime, 300.0)) * 60.0

            # Calculate latency percentiles
            durations = sorted([item[1] for item in self._recent_latencies])
            if durations:
                n = len(durations)
                avg_lat = sum(durations) / n
                p50 = durations[min(n - 1, int(round(0.50 * (n - 1))))]
                p95 = durations[min(n - 1, int(round(0.95 * (n - 1))))]
                p99 = durations[min(n - 1, int(round(0.99 * (n - 1))))]
            else:
                avg_lat = 0.0
                p50 = 0.0
                p95 = 0.0
                p99 = 0.0

            # SLA compliance calculation
            if durations:
                compliant_samples = sum(1 for d in durations if d <= self.latency_budget_ms)
                sla_compliance = round((compliant_samples / len(durations)) * 100.0, 1)
            else:
                sla_compliance = 100.0

            is_breached = (p95 > self.latency_budget_ms) if durations else False
            if is_breached:
                budget_status = "breached"
            elif durations and (p95 >= (self.latency_budget_ms * 0.75)):
                budget_status = "warning"
            else:
                budget_status = "healthy"

            # Error rate
            error_count = status_breakdown["4xx"] + status_breakdown["5xx"]
            error_rate = (error_count / total_requests * 100.0) if total_requests > 0 else 0.0

            # Top endpoints sorted by request volume
            top_endpoints = sorted(
                endpoint_counts.values(),
                key=lambda x: x["requests"],
                reverse=True,
            )[:5]

            return {
                "uptime_seconds": round(uptime, 1),
                "active_requests": active,
                "total_requests": total_requests,
                "requests_per_minute": round(rpm, 1),
                "avg_latency_ms": round(avg_lat, 2),
                "p50_latency_ms": round(p50, 2),
                "p95_latency_ms": round(p95, 2),
                "p99_latency_ms": round(p99, 2),
                "latency_budget_ms": self.latency_budget_ms,
                "sla_target_ms": self.latency_budget_ms,
                "sla_compliance_percentage": sla_compliance,
                "is_latency_budget_breached": is_breached,
                "latency_budget_status": budget_status,
                "error_rate_percentage": round(error_rate, 2),
                "status_breakdown": status_breakdown,
                "top_endpoints": top_endpoints,
            }

    def check_and_notify_sla_breach(self, organization_id: Optional[str] = None):
        """Dispatches an SSE notification if rolling p95 latency breaches SLA budget."""
        telemetry = self.get_dashboard_telemetry()
        now = time.time()
        if telemetry["is_latency_budget_breached"] and (now - self._last_breach_alert_time) > 60.0:
            self._last_breach_alert_time = now
            if organization_id:
                try:
                    from app.core.notifications import notification_bus
                    notification_bus.publish(
                        organization_id,
                        {
                            "type": "latency_budget_exceeded",
                            "title": "Latency Budget SLA Alert",
                            "message": f"Platform p95 latency is {telemetry['p95_latency_ms']}ms, exceeding the {telemetry['latency_budget_ms']}ms SLA threshold.",
                            "p95_latency_ms": telemetry["p95_latency_ms"],
                            "latency_budget_ms": telemetry["latency_budget_ms"],
                            "compliance_percentage": telemetry["sla_compliance_percentage"],
                        }
                    )
                except Exception:
                    pass


# Global metrics registry singleton
metrics_registry = InMemoryMetricsRegistry()
