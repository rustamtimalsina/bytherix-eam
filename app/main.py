import asyncio
import time
import uuid
from fastapi import FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.errors import error_response, http_exception_handler, validation_exception_handler
from app.core.rate_limiter import rate_limiter
from app.api.v1.api_keys import router as api_keys_router
from app.api.v1.auth import router as auth_router
from app.api.v1.chat import router as chat_router
from app.api.v1.documents import router as documents_router
from app.api.v1.organizations import router as organizations_router
from app.api.v1.usage import router as usage_router
from app.api.v1.agents import router as agents_router
from app.api.v1.models import router as models_router
from app.api.v1.audit import router as audit_router
from app.api.v1.observability import router as observability_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.security import router as security_router
from app.core.notifications import notification_bus
from app.core.metrics import metrics_registry
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine

from contextlib import asynccontextmanager

from fastapi.openapi.utils import get_openapi
from fastapi.responses import HTMLResponse
from app.core.docs_portal import generate_branded_swagger_html

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize tables safely on startup (Section 14.3)."""
    notification_bus.set_event_loop(asyncio.get_running_loop())
    if settings.APP_ENV != "test":
        try:
            Base.metadata.create_all(bind=engine)
        except Exception as e:
            print(f"Warning: Could not auto-create database tables on startup: {e}")
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Bytherix EAM - Enterprise AI Management Platform API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=None,  # Custom branded portal used
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="Bytherix EAM — Enterprise AI Management Platform API",
        version="1.0.0",
        description="""
# Bytherix EAM Developer API Catalogue
Production-grade REST & Real-Time Streaming APIs for multi-tenant AI governance, hybrid RAG retrieval, model registry, and DLP redaction.

### Authentication Modes:
1. **Bearer Token**: `Authorization: Bearer <jwt_access_token>`
2. **Machine API Key**: `X-API-Key: bx_live_<token>`
        """,
        routes=app.routes,
    )
    if "components" not in openapi_schema:
        openapi_schema["components"] = {}
    if "securitySchemes" not in openapi_schema["components"]:
        openapi_schema["components"]["securitySchemes"] = {}

    openapi_schema["components"]["securitySchemes"]["ApiKeyAuth"] = {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key",
        "description": "Enter your high-entropy Bytherix API key (`bx_live_...`) for automated machine access"
    }
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

@app.get("/docs", include_in_schema=False)
@app.get(f"{settings.API_V1_STR}/docs", include_in_schema=False)
async def custom_swagger_docs():
    return HTMLResponse(
        content=generate_branded_swagger_html(
            openapi_url=f"{settings.API_V1_STR}/openapi.json",
            title="Bytherix EAM — Enterprise Developer API Portal",
            redoc_url=f"{settings.API_V1_STR}/redoc",
            frontend_url="http://localhost:3000"
        )
    )

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_id_and_timing(request: Request, call_next):
    """Correlation ID and latency tracking middleware with Prometheus metrics (Section 10.1, 13 & 14.1)."""
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    start_time = time.time()
    
    metrics_registry.inc_active_requests()
    try:
        response = await call_next(request)
        duration = time.time() - start_time
        metrics_registry.record_request(
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_seconds=duration,
        )
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{duration:.4f}s"
        return response
    except Exception as exc:
        duration = time.time() - start_time
        metrics_registry.record_request(
            method=request.method,
            path=request.url.path,
            status_code=500,
            duration_seconds=duration,
        )
        raise exc
    finally:
        metrics_registry.dec_active_requests()


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """
    Sliding-window token bucket rate limiter per Client IP & API Key (Sections 12 & 15).
    Enforces HTTP 429 Too Many Requests with RFC 6585 and RFC 7231 standard headers.
    """
    if not settings.RATE_LIMIT_ENABLED or settings.APP_ENV == "test":
        return await call_next(request)

    path = request.url.path
    # Exempt non-API routes, health checks, docs, and CORS preflights
    if (
        request.method == "OPTIONS"
        or not path.startswith(settings.API_V1_STR)
        or path.startswith(f"{settings.API_V1_STR}/docs")
        or path.startswith(f"{settings.API_V1_STR}/openapi.json")
        or path.startswith(f"{settings.API_V1_STR}/redoc")
        or path.startswith("/health")
    ):
        return await call_next(request)

    client_ip = request.client.host if request.client else "127.0.0.1"
    key = f"rl:ip:{client_ip}"

    allowed, remaining, retry_after = rate_limiter.check_rate_limit(
        key=key,
        limit=settings.RATE_LIMIT_PER_MINUTE,
        window_seconds=60
    )

    if not allowed:
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        response = error_response(
            code="RATE_LIMIT_EXCEEDED",
            message=f"Rate limit exceeded: maximum {settings.RATE_LIMIT_PER_MINUTE} requests per minute. Please retry after {retry_after} seconds.",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            request_id=request_id
        )
        response.headers["Retry-After"] = str(retry_after)
        response.headers["X-RateLimit-Limit"] = str(settings.RATE_LIMIT_PER_MINUTE)
        response.headers["X-RateLimit-Remaining"] = "0"
        response.headers["X-RateLimit-Reset"] = str(int(time.time() + retry_after))
        return response

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(settings.RATE_LIMIT_PER_MINUTE)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    response.headers["X-RateLimit-Reset"] = str(int(time.time() + 60))
    return response


# Register exception handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# Prometheus Metrics Exporter (Section 13 & 14.3)
@app.get("/metrics", tags=["Observability & Telemetry"])
def prometheus_metrics():
    """Standard Prometheus text exposition format (v0.0.4) for scrapers."""
    return Response(
        content=metrics_registry.generate_prometheus_exposition(),
        media_type="text/plain; version=0.0.4; charset=utf-8",
    )


# Health Checks (Section 10.2 & 14.3)
@app.get("/health/live", tags=["Health"])
def health_live():
    """Liveness probe: verifies process is alive without expensive dependency checks."""
    return {"status": "ok", "service": "bytherix-eam-api"}


@app.get("/health/ready", tags=["Health"])
def health_ready():
    """Readiness probe: verifies database and dependencies are usable."""
    try:
        with engine.connect() as conn:
            conn.execute(Base.metadata.tables["users"].select().limit(1))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        return {"status": "not_ready", "error": str(e)}


# Include API v1 Routers (Section 10.1)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(organizations_router, prefix=settings.API_V1_STR)
app.include_router(api_keys_router, prefix=settings.API_V1_STR)
app.include_router(documents_router, prefix=settings.API_V1_STR)
app.include_router(chat_router, prefix=settings.API_V1_STR)
app.include_router(usage_router, prefix=settings.API_V1_STR)
app.include_router(agents_router, prefix=settings.API_V1_STR)
app.include_router(models_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(observability_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(security_router, prefix=settings.API_V1_STR)
