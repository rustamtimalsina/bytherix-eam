
"""
One consistent error shape for the whole API (see section 10.3 of the spec):

{
    "error": {
        "code": "...",
        "message": "...",
        "request_id": "..."
    },
    "detail": "..."
}

`detail` repeats the message so simple frontends that read FastAPI's
usual `detail` field keep working.
"""

import logging

from typing import Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("app")


class AppError(Exception):
    """
    Custom application exception with a standardized error response.
    """

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        headers: dict[str, str] | None = None,
        extra: dict[str, Any] | None = None,
    ):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.headers = headers
        self.extra = extra or {}

        super().__init__(message)


def _body(
    request: Request,
    code: str,
    message: str,
    **extra: Any,
) -> dict:
    """
    Build the standardized API error response body.
    """

    request_id = getattr(request.state, "request_id", None) or "unknown"

    body = {
        "error": {
            "code": code,
            "message": message,
            "request_id": request_id,
        },
        "detail": message,
    }

    body["error"].update(extra)

    return body


def error_response(
    code: str,
    message: str,
    status_code: int = status.HTTP_400_BAD_REQUEST,
    request_id: str | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    """
    Create a standardized API error response.

    Useful outside exception handlers as well.
    """

    resolved_request_id = request_id or str(uuid4())

    return JSONResponse(
        status_code=status_code,
        headers=headers,
        content={
            "error": {
                "code": code,
                "message": message,
                "request_id": resolved_request_id,
            },
            "detail": message,
        },
    )


def register_error_handlers(app: FastAPI) -> None:

    @app.exception_handler(AppError)
    async def handle_app_error(
        request: Request,
        exc: AppError,
    ):
        return JSONResponse(
            status_code=exc.status_code,
            content=_body(
                request,
                exc.code,
                exc.message,
                **exc.extra,
            ),
            headers=exc.headers,
        )

    @app.exception_handler(HTTPException)
    async def handle_http_error(
        request: Request,
        exc: HTTPException,
    ):
        code_map = {
            400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
            409: "CONFLICT",
            422: "VALIDATION_ERROR",
            429: "RATE_LIMIT_EXCEEDED",
        }

        message = (
            exc.detail
            if isinstance(exc.detail, str)
            else "Request could not be processed."
        )

        code = code_map.get(
            exc.status_code,
            "HTTP_ERROR",
        )

        return JSONResponse(
            status_code=exc.status_code,
            content=_body(request, code, message),
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request,
        exc: RequestValidationError,
    ):
        # Never echo submitted input because it may contain passwords
        # or other sensitive information.

        fields = []

        for err in exc.errors():
            loc = ".".join(
                str(part)
                for part in err["loc"]
                if part != "body"
            )

            fields.append({
                "field": loc,
                "message": err["msg"],
            })

        first = (
            fields[0]
            if fields
            else {
                "field": "",
                "message": "Invalid request.",
            }
        )

        message = (
            f"{first['field']}: {first['message']}"
            if first["field"]
            else first["message"]
        )

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_body(
                request,
                "VALIDATION_ERROR",
                message,
                fields=fields,
            ),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(
        request: Request,
        exc: Exception,
    ):
        logger.exception(
            "Unhandled error",
            exc_info=exc,
        )

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_body(
                request,
                "INTERNAL_ERROR",
                "Something went wrong on our side.",
            ),
        )
