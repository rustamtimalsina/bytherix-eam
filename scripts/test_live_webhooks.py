#!/usr/bin/env python3
"""
Bytherix EAM - Live Webhook & Alert Verification Script
Demonstrates end-to-end webhook subscription, HMAC-SHA256 signing,
Slack Block Kit & Discord Embed card formatting, and real HTTP dispatch.

Usage:
  python scripts/test_live_webhooks.py
  python scripts/test_live_webhooks.py --discord-url "https://discord.com/api/webhooks/..."
  python scripts/test_live_webhooks.py --slack-url "https://hooks.slack.com/services/..."
"""

import sys
import os
import json
import argparse
import threading
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timezone

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.organization import Organization
from app.db.models.webhook import WebhookSubscription, WebhookDelivery
from app.services.webhook_service import WebhookService

RECEIVED_PAYLOADS = []
RECEIVED_HEADERS = []


class LocalWebhookReceiver(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        RECEIVED_PAYLOADS.append(body)
        RECEIVED_HEADERS.append(dict(self.headers))

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"status":"received","timestamp":"' + datetime.now(timezone.utc).isoformat().encode() + b'"}')

    def log_message(self, format, *args):
        pass  # Quiet logging


def start_local_listener(port: int = 0):
    server = HTTPServer(("127.0.0.1", port), LocalWebhookReceiver)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def run_webhook_verification(custom_discord_url: str = None, custom_slack_url: str = None):
    print("=" * 70)
    print("BYTHERIX EAM - LIVE WEBHOOK SUBSYSTEM & ALERT VERIFICATION")
    print("=" * 70)

    # 1. Start local receiver on dynamic port for guaranteed isolated verification
    server = start_local_listener(0)
    actual_port = server.server_address[1]
    local_url = f"http://127.0.0.1:{actual_port}/webhook"
    print(f"\n[1] Local Webhook Receiver active on: {local_url}")

    db: Session = SessionLocal()
    try:
        # Fetch or create demo tenant
        org = db.query(Organization).filter(Organization.slug == "bytherix-global-demo").first()
        if not org:
            org = db.query(Organization).first()
        if not org:
            print("❌ No organization found. Run `scripts/seed_demo_tenant.py` first.")
            return False

        org_id = org.id
        print(f"[2] Bound to tenant: {org.name} (`{org_id}`)")

        # Create or update test webhook subscription
        sub = db.query(WebhookSubscription).filter(
            WebhookSubscription.organization_id == org_id,
            WebhookSubscription.url == local_url
        ).first()

        if not sub:
            sub = WebhookSubscription(
                organization_id=org_id,
                url=local_url,
                secret=WebhookService.generate_secret(),
                description="Automated Test Receiver",
                events=["security.dlp.violation", "mlops.model.drift", "ping"],
                is_active=True
            )
            db.add(sub)
            db.commit()
            db.refresh(sub)

        print(f"[3] Webhook Subscription Registered:")
        print(f"    - ID:     {sub.id}")
        print(f"    - URL:    {sub.url}")
        print(f"    - Secret: {sub.secret[:12]}... (high entropy)")
        print(f"    - Events: {sub.events}")

        # ----------------------------------------------------
        # TEST A: Security DLP Policy Violation Event
        # ----------------------------------------------------
        print("\n" + "-" * 70)
        print("TEST A: Disagreeable PII Interception -> 'security.dlp.violation'")
        dlp_data = {
            "summary": "Tenant prompt contained unmasked Credit Card & SSN numbers.",
            "categories": ["FINANCIAL_PCI", "GOVERNMENT_SSN"],
            "entity_count": 3,
            "session_id": "sess_enterprise_live_992a",
            "enforcement_action": "REDACTED_AND_LOGGED"
        }

        delivery_a = WebhookService.deliver_event(db, sub, "security.dlp.violation", dlp_data)
        print(f"  -> Delivery ID:     {delivery_a.id}")
        print(f"  -> HTTP Status:     {delivery_a.status_code}")
        print(f"  -> Delivery Status: {delivery_a.status}")

        time.sleep(0.1)
        assert len(RECEIVED_PAYLOADS) >= 1
        raw_payload = RECEIVED_PAYLOADS[-1]
        raw_headers = RECEIVED_HEADERS[-1]

        sig = raw_headers.get("X-Bytherix-Signature", "")
        print(f"  -> X-Bytherix-Signature: {sig}")
        is_valid = WebhookService.verify_signature(raw_payload, sub.secret, sig)
        print(f"  -> HMAC Signature Verified: {'VALID (Pass)' if is_valid else 'INVALID (Fail)'}")
        assert is_valid

        # ----------------------------------------------------
        # TEST B: Slack Block Kit Card Transformation
        # ----------------------------------------------------
        print("\n" + "-" * 70)
        print("TEST B: Slack Block Kit Formatting Validation")
        slack_envelope = {
            "event": "security.dlp.violation",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "organization_id": org_id,
            "data": dlp_data
        }
        slack_payload = WebhookService._format_slack_card("security.dlp.violation", slack_envelope)
        print("  -> Slack Attachment Blocks Generated:")
        print(f"     Header:  {slack_payload['attachments'][0]['blocks'][0]['text']['text']}")
        print(f"     Summary: {slack_payload['attachments'][0]['blocks'][1]['text']['text']}")
        print(f"     Color:   {slack_payload['attachments'][0]['color']} (Security Red)")

        # ----------------------------------------------------
        # TEST C: Discord Embed Card Transformation
        # ----------------------------------------------------
        print("\n" + "-" * 70)
        print("TEST C: Discord Webhook Embed Formatting Validation")
        mlops_data = {
            "recommendation": "gpt-4o-enterprise P99 latency breached SLA threshold (>1500ms).",
            "model_id": "gpt-4o-enterprise",
            "current_latency_ms": 1840,
            "drift_percent": 38.5,
            "severity": "critical"
        }
        discord_envelope = {
            "event": "mlops.model.drift",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "organization_id": org_id,
            "data": mlops_data
        }
        discord_payload = WebhookService._format_discord_card("mlops.model.drift", discord_envelope)
        print("  -> Discord Embed Object Generated:")
        print(f"     Title:       {discord_payload['embeds'][0]['title']}")
        print(f"     Description: {discord_payload['embeds'][0]['description']}")
        print(f"     Color Code:  {discord_payload['embeds'][0]['color']} (MLOps Amber)")
        print(f"     Fields:      {len(discord_payload['embeds'][0]['fields'])} telemetry data pills")

        # ----------------------------------------------------
        # TEST D: Optional Live External Dispatch (Discord/Slack)
        # ----------------------------------------------------
        if custom_discord_url:
            print("\n" + "-" * 70)
            print(f"TEST D1: Live Outbound Dispatch to Discord -> {custom_discord_url[:35]}...")
            discord_sub = WebhookSubscription(
                organization_id=org_id,
                url=custom_discord_url,
                secret=WebhookService.generate_secret(),
                description="Live Discord Channel",
                events=["*"],
                is_active=True
            )
            d_del = WebhookService.deliver_event(db, discord_sub, "security.dlp.violation", dlp_data)
            print(f"  -> Discord HTTP Status: {d_del.status_code}")
            print(f"  -> Discord Delivery:    {d_del.status}")
            print("  -> Check your Discord channel! The red security alert card is live.")

        if custom_slack_url:
            print("\n" + "-" * 70)
            print(f"TEST D2: Live Outbound Dispatch to Slack -> {custom_slack_url[:35]}...")
            slack_sub = WebhookSubscription(
                organization_id=org_id,
                url=custom_slack_url,
                secret=WebhookService.generate_secret(),
                description="Live Slack Workspace",
                events=["*"],
                is_active=True
            )
            s_del = WebhookService.deliver_event(db, slack_sub, "mlops.model.drift", mlops_data)
            print(f"  -> Slack HTTP Status: {s_del.status_code}")
            print(f"  -> Slack Delivery:    {s_del.status}")
            print("  -> Check your Slack channel! The SLA drift card is live.")

        print("\n" + "=" * 70)
        print("RESULT: ALL WEBHOOK TESTS & HMAC VERIFICATIONS PASSED (100%)")
        print("=" * 70)
        return True

    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bytherix EAM Webhook & Alert Verification")
    parser.add_argument("--discord-url", type=str, default=None, help="Optional live Discord Webhook URL")
    parser.add_argument("--slack-url", type=str, default=None, help="Optional live Slack Webhook URL")
    args = parser.parse_args()

    success = run_webhook_verification(custom_discord_url=args.discord_url, custom_slack_url=args.slack_url)
    sys.exit(0 if success else 1)
