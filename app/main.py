import uuid

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session


from app.api.errors import register_error_handlers
from app.api.v1.router import api_router
from app.core.config import get_settings
from app.db.session import get_db
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
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine


settings = get_settings()

app = FastAPI(title=settings.app_name, version="0.1.0")


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    # Server-generated correlation id, returned in a header and in error bodies.
    request.state.request_id = str(uuid.uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

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



app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)


register_error_handlers(app)
app.include_router(api_router)


@app.get("/health/live", tags=["health"])
def live() -> dict:
    return {"status": "ok"}


@app.get("/health/ready", tags=["health"])
def ready(db: Session = Depends(get_db)):
    try:
        with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "database_unavailable"}
        )

    return {"status": "ready", "database": "connected"}

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

