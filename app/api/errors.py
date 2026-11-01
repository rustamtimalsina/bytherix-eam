"""One consistent error shape for the whole API (see section 10.3 of the spec):

{"error": {"code": "...", "message": "...", "request_id": "..."}, "detail": "..."}

`detail` repeats the message so simple frontends that read FastAPI's usual
`detail` field keep working.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("app")


class AppError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        headers: dict[str, str] | None = None,
        extra: dict | None = None,
    ):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.headers = headers
        self.extra = extra or {}


def _body(request: Request, code: str, message: str, **extra) -> dict:
    request_id = getattr(request.state, "request_id", "unknown")
    body = {
        "error": {"code": code, "message": message, "request_id": request_id},
        "detail": message,
    }
    body["error"].update(extra)
    return body


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content=_body(request, exc.code, exc.message, **exc.extra),
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError):
        # We deliberately do NOT echo the submitted input (it may contain a password).
        fields = []
        for err in exc.errors():
            loc = ".".join(str(p) for p in err["loc"] if p != "body")
            fields.append({"field": loc, "message": err["msg"]})
        first = fields[0] if fields else {"field": "", "message": "Invalid request."}
        message = (
            f"{first['field']}: {first['message']}" if first["field"] else first["message"]
        )
        return JSONResponse(
            status_code=422,
            content=_body(request, "VALIDATION_ERROR", message, fields=fields),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception):
        logger.exception("Unhandled error", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content=_body(request, "INTERNAL_ERROR", "Something went wrong on our side."),
        )
