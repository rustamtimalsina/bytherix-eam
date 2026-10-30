import time
import uuid
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.errors import http_exception_handler, validation_exception_handler
from app.api.v1.api_keys import router as api_keys_router
from app.api.v1.auth import router as auth_router
from app.api.v1.chat import router as chat_router
from app.api.v1.documents import router as documents_router
from app.api.v1.organizations import router as organizations_router
from app.api.v1.usage import router as usage_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize tables safely on startup (Section 14.3)."""
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
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
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
    """Correlation ID and latency tracking middleware (Section 10.1 & 14.1)."""
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{duration:.4f}s"
    return response


# Register exception handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

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
