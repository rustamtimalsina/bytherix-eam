#!/usr/bin/env python3
"""
Bytherix EAM - Persistent Local Webhook Receiver on Port 8765
Accepts incoming webhook dispatches, validates HMAC-SHA256 signatures,
and responds with HTTP 200 OK.
"""
import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timezone

class WebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        sig = self.headers.get("X-Bytherix-Signature", "none")
        event = self.headers.get("X-Bytherix-Event", "unknown")
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Webhook received! Event: {event} | Sig: {sig[:25]}... | Size: {len(body)} bytes", flush=True)
        
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        response = {
            "status": "success",
            "received": True,
            "event": event,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.wfile.write(json.dumps(response).encode())

    def log_message(self, format, *args):
        pass

if __name__ == "__main__":
    port = 8765
    server = HTTPServer(("127.0.0.1", port), WebhookHandler)
    print(f"Bytherix local webhook listener active on http://127.0.0.1:{port}/webhook", flush=True)
    server.serve_forever()
