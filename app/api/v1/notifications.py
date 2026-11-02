import asyncio
import json
from typing import Optional
from fastapi import APIRouter, Depends, Query, Header, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.notifications import notification_bus
from app.core.security import decode_token
from app.db.models.membership import Membership
from app.db.models.organization import Organization
from app.db.session import get_db

router = APIRouter(prefix="/notifications", tags=["Real-Time Notifications & Alerts"])


@router.get("/stream")
async def notifications_stream(
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-Id"),
    db: Session = Depends(get_db)
):
    """
    Real-Time Server-Sent Events (SSE) notification stream.
    Pushes instant alerts for Human-In-The-Loop approval gates, async indexing completions, and security events.
    Supports standard Authorization Bearer header or ?token= query parameter.
    """
    raw_token = token
    if not raw_token and authorization and authorization.startswith("Bearer "):
        raw_token = authorization.split(" ")[1]

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required for real-time notification stream"
        )

    try:
        payload = decode_token(raw_token)
    except Exception:
        payload = None
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    user_id = payload.get("sub")
    target_org_id = x_organization_id or payload.get("organization_id")

    if not target_org_id:
        membership = db.query(Membership).filter(
            Membership.user_id == user_id,
            Membership.status == "active"
        ).first()
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Active tenant membership required"
            )
        target_org_id = membership.organization_id

    queue = notification_bus.subscribe(target_org_id)

    async def event_generator():
        try:
            # Handshake
            yield f'data: {json.dumps({"type": "connected", "organization_id": target_org_id, "message": "Live notification bus active"})}\n\n'

            while True:
                try:
                    payload_data = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {payload_data}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            notification_bus.unsubscribe(target_org_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
