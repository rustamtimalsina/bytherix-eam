import asyncio
import json
import logging
from typing import Dict, List, Any

logger = logging.getLogger("bytherix.notifications")


class NotificationManager:
    """
    Thread-safe, multi-tenant in-memory Server-Sent Events (SSE) notification bus.
    Enables instant push for Human-In-The-Loop approval gates, document readiness, and security alerts.
    """
    def __init__(self):
        self._subscribers: Dict[str, List[asyncio.Queue]] = {}
        self._loop: asyncio.AbstractEventLoop | None = None

    def set_event_loop(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop

    def subscribe(self, organization_id: str) -> asyncio.Queue:
        queue = asyncio.Queue(maxsize=100)
        if organization_id not in self._subscribers:
            self._subscribers[organization_id] = []
        self._subscribers[organization_id].append(queue)
        logger.debug(f"Client subscribed to notifications for org: {organization_id}")
        return queue

    def unsubscribe(self, organization_id: str, queue: asyncio.Queue):
        if organization_id in self._subscribers:
            try:
                self._subscribers[organization_id].remove(queue)
                if not self._subscribers[organization_id]:
                    del self._subscribers[organization_id]
            except ValueError:
                pass
        logger.debug(f"Client unsubscribed from notifications for org: {organization_id}")

    def publish(self, organization_id: str, event_data: Dict[str, Any]):
        """Publish an event to all active tenant subscribers in a thread-safe manner."""
        queues = self._subscribers.get(organization_id, [])
        if not queues:
            return

        payload = json.dumps(event_data)

        for q in list(queues):
            try:
                if self._loop and self._loop.is_running():
                    self._loop.call_soon_threadsafe(self._put_queue, q, payload)
                else:
                    q.put_nowait(payload)
            except Exception as e:
                logger.warning(f"Failed to deliver notification to subscriber: {e}")

    @staticmethod
    def _put_queue(queue: asyncio.Queue, payload: str):
        try:
            queue.put_nowait(payload)
        except asyncio.QueueFull:
            pass


notification_bus = NotificationManager()
