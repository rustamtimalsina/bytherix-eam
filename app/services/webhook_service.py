import hmac
import hashlib
import json
import secrets
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import httpx
from sqlalchemy.orm import Session

from app.db.models.webhook import WebhookSubscription, WebhookDelivery


class WebhookService:
    @staticmethod
    def generate_secret() -> str:
        """Generate high-entropy HMAC secret with whsec_ prefix."""
        return f"whsec_{secrets.token_hex(24)}"

    @staticmethod
    def sign_payload(payload_bytes: bytes, secret: str) -> str:
        """Compute RFC 2104 HMAC-SHA256 signature formatted as sha256=<digest>."""
        digest = hmac.new(
            secret.encode("utf-8"),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()
        return f"sha256={digest}"

    @staticmethod
    def verify_signature(payload_bytes: bytes, secret: str, signature_header: str) -> bool:
        """Constant-time verification of HMAC signature against header."""
        expected = WebhookService.sign_payload(payload_bytes, secret)
        return hmac.compare_digest(expected, signature_header.strip())

    @classmethod
    def _format_slack_card(cls, event_type: str, envelope: Dict[str, Any]) -> Dict[str, Any]:
        """Format a rich Slack Block Kit alert message."""
        data = envelope.get("data", {})
        ts = envelope.get("timestamp", datetime.now(timezone.utc).isoformat())

        if "dlp" in event_type:
            title = "🚨 Security Alert: DLP Policy Violation Detected"
            color = "#dc2626"
            summary = data.get("summary", "Sensitive data was intercepted and masked.")
            details = [
                f"*Categories:* {', '.join(data.get('categories', [])) or 'General PII'}",
                f"*Entities Redacted:* {data.get('entity_count', 0)}",
                f"*Session ID:* `{data.get('session_id', 'unknown')}`"
            ]
        elif "model" in event_type:
            title = "⚠️ MLOps Alert: Model Latency SLA Breach"
            color = "#f59e0b"
            summary = data.get("recommendation", "Model latency exceeded configured SLA thresholds.")
            details = [
                f"*Model ID:* `{data.get('model_id', 'unknown')}`",
                f"*Current Latency:* {data.get('current_latency_ms', 0)} ms",
                f"*Drift Delta:* +{data.get('drift_percent', 0)}%",
                f"*Severity:* *{data.get('severity', 'warning').upper()}*"
            ]
        else:
            title = f"📢 Bytherix Notification: {event_type}"
            color = "#3b82f6"
            summary = str(data.get("message", "System event triggered."))
            details = [f"*Event:* `{event_type}`"]

        return {
            "text": f"{title}: {summary}",
            "attachments": [
                {
                    "color": color,
                    "blocks": [
                        {
                            "type": "header",
                            "text": {"type": "plain_text", "text": title, "emoji": True}
                        },
                        {
                            "type": "section",
                            "text": {"type": "mrkdwn", "text": f"*Summary:* {summary}"}
                        },
                        {
                            "type": "section",
                            "fields": [{"type": "mrkdwn", "text": d} for d in details]
                        },
                        {
                            "type": "context",
                            "elements": [
                                {"type": "mrkdwn", "text": f"Org: `{envelope.get('organization_id')}` | Time: {ts}"}
                            ]
                        }
                    ]
                }
            ]
        }

    @classmethod
    def _format_discord_card(cls, event_type: str, envelope: Dict[str, Any]) -> Dict[str, Any]:
        """Format a rich Discord Webhook Embed message."""
        data = envelope.get("data", {})
        ts = envelope.get("timestamp", datetime.now(timezone.utc).isoformat())

        if "dlp" in event_type:
            title = "🚨 Security Alert: DLP Policy Violation"
            color = 14431526  # Red
            desc = data.get("summary", "Sensitive data intercepted and masked.")
            fields = [
                {"name": "Categories", "value": ", ".join(data.get("categories", [])) or "PII", "inline": True},
                {"name": "Redacted Entities", "value": str(data.get("entity_count", 0)), "inline": True},
                {"name": "Session ID", "value": f"`{data.get('session_id', 'unknown')}`", "inline": False}
            ]
        elif "model" in event_type:
            title = "⚠️ MLOps Alert: Model SLA Breach"
            color = 16098827  # Amber
            desc = data.get("recommendation", "Model latency exceeded SLA threshold.")
            fields = [
                {"name": "Model", "value": f"`{data.get('model_id', 'unknown')}`", "inline": True},
                {"name": "Current Latency", "value": f"{data.get('current_latency_ms', 0)} ms", "inline": True},
                {"name": "Drift", "value": f"+{data.get('drift_percent', 0)}%", "inline": True}
            ]
        else:
            title = f"📢 Bytherix Event: {event_type}"
            color = 3899894
            desc = str(data.get("message", "Event triggered."))
            fields = []

        return {
            "content": f"**{title}**",
            "embeds": [
                {
                    "title": title,
                    "description": desc,
                    "color": color,
                    "fields": fields,
                    "footer": {"text": f"Org: {envelope.get('organization_id')} • {ts}"}
                }
            ]
        }

    @classmethod
    def deliver_event(
        cls,
        db: Session,
        subscription: WebhookSubscription,
        event_type: str,
        payload_data: Dict[str, Any]
    ) -> WebhookDelivery:
        """Deliver an event payload via signed HTTP POST and record delivery status."""
        envelope = {
            "event": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "subscription_id": subscription.id,
            "organization_id": subscription.organization_id,
            "data": payload_data
        }
        
        url_lower = subscription.url.lower()
        if "hooks.slack.com" in url_lower:
            outgoing_payload = cls._format_slack_card(event_type, envelope)
        elif "discord.com/api/webhooks" in url_lower:
            outgoing_payload = cls._format_discord_card(event_type, envelope)
        else:
            outgoing_payload = envelope

        payload_bytes = json.dumps(outgoing_payload, separators=(",", ":")).encode("utf-8")
        signature = cls.sign_payload(payload_bytes, subscription.secret)

        delivery = WebhookDelivery(
            subscription_id=subscription.id,
            event_type=event_type,
            payload=envelope,
            status="pending",
            attempts=1
        )
        db.add(delivery)
        db.commit()
        db.refresh(delivery)

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Bytherix-EAM-Webhook/1.0",
            "X-Bytherix-Signature": signature,
            "X-Bytherix-Event": event_type,
            "X-Bytherix-Delivery": delivery.id,
        }

        try:
            with httpx.Client(timeout=5.0, verify=False) as client:
                resp = client.post(subscription.url, content=payload_bytes, headers=headers)
                delivery.status_code = resp.status_code
                delivery.response_body = resp.text[:1000] if resp.text else None
                if 200 <= resp.status_code < 300:
                    delivery.status = "delivered"
                else:
                    delivery.status = "failed"
        except Exception as exc:
            delivery.status_code = None
            delivery.status = "failed"
            delivery.response_body = f"Transport Error: {str(exc)}"[:1000]

        db.commit()
        db.refresh(delivery)
        return delivery

    @classmethod
    def dispatch_event(
        cls,
        db: Session,
        organization_id: str,
        event_type: str,
        payload_data: Dict[str, Any]
    ) -> List[WebhookDelivery]:
        """Dispatch event to all active subscriptions matching org and event type."""
        subscriptions = db.query(WebhookSubscription).filter(
            WebhookSubscription.organization_id == organization_id,
            WebhookSubscription.is_active == True
        ).all()

        deliveries: List[WebhookDelivery] = []
        for sub in subscriptions:
            events = sub.events or []
            if "*" in events or event_type in events:
                delivery = cls.deliver_event(db, sub, event_type, payload_data)
                deliveries.append(delivery)

        return deliveries

    @classmethod
    def test_ping(
        cls,
        db: Session,
        subscription: WebhookSubscription
    ) -> Tuple[WebhookDelivery, str]:
        """Send a test ping event and return the delivery record with signature."""
        test_payload = {
            "ping": True,
            "message": "Bytherix EAM Webhook verification ping successful.",
            "test_timestamp": datetime.now(timezone.utc).isoformat()
        }
        envelope = {
            "event": "ping",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "subscription_id": subscription.id,
            "organization_id": subscription.organization_id,
            "data": test_payload
        }
        payload_bytes = json.dumps(envelope, separators=(",", ":")).encode("utf-8")
        signature = cls.sign_payload(payload_bytes, subscription.secret)

        delivery = cls.deliver_event(db, subscription, "ping", test_payload)
        return delivery, signature
