import email.utils
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
import smtplib
import threading
from typing import Optional

from app.core.config import settings

logger = logging.getLogger("bytherix.email")


class EmailService:
    @staticmethod
    def _send_smtp_sync(
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Synchronously dispatch email through configured SMTP gateway or fallback simulator."""
        if settings.APP_ENV == "test" or not settings.SMTP_HOST:
            # Safe local fallback simulation
            logger.info(
                f"[EMAIL SIMULATION] To: {to_email} | Subject: '{subject}' | SMTP not configured; logged locally."
            )
            return True

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = email.utils.formataddr((settings.SMTP_FROM_NAME, settings.SMTP_FROM_EMAIL))
            msg["To"] = to_email
            msg["Date"] = email.utils.formatdate(localtime=True)
            msg["Message-ID"] = email.utils.make_msgid(domain="bytherix.com")

            # Attach plain text fallback
            if text_content:
                msg.attach(MIMEText(text_content, "plain", "utf-8"))
            else:
                msg.attach(MIMEText("Please view this email in an HTML-compatible client.", "plain", "utf-8"))

            # Attach styled HTML
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            port = settings.SMTP_PORT
            if port == 465:
                # SSL
                server = smtplib.SMTP_SSL(settings.SMTP_HOST, port, timeout=10)
            else:
                # Standard TLS
                server = smtplib.SMTP(settings.SMTP_HOST, port, timeout=10)
                if settings.SMTP_USE_TLS:
                    server.starttls()

            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

            server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
            server.quit()
            logger.info(f"[EMAIL DISPATCHED] Successfully sent email to {to_email}")
            return True
        except Exception as e:
            logger.error(f"[EMAIL ERROR] Failed to send email to {to_email}: {e}")
            return False

    @staticmethod
    def send_email_async(
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> None:
        """Dispatches email in a background daemon thread to eliminate HTTP latency."""
        if settings.APP_ENV == "test":
            EmailService._send_smtp_sync(to_email, subject, html_content, text_content)
            return

        thread = threading.Thread(
            target=EmailService._send_smtp_sync,
            args=(to_email, subject, html_content, text_content),
            daemon=True
        )
        thread.start()

    @staticmethod
    def send_invitation_email(
        recipient_email: str,
        organization_name: str,
        role: str,
        invitation_token: str,
        inviter_name: str = "A Workspace Administrator"
    ) -> str:
        """
        Builds and sends a branded, responsive HTML invitation email (Section 7.1).
        Returns the generated invitation URL.
        """
        invite_url = f"{settings.FRONTEND_URL}/accept-invite?token={invitation_token}"

        subject = f"You've been invited to join {organization_name} on Bytherix EAM"

        text_content = (
            f"Hello,\n\n"
            f"{inviter_name} has invited you to join the organization '{organization_name}' "
            f"on Bytherix EAM (Enterprise AI Management Platform) as a {role.capitalize()}.\n\n"
            f"Accept your invitation and activate your account by clicking the link below:\n"
            f"{invite_url}\n\n"
            f"Security Notice: This link is single-use and will expire in 7 days per Section 7.1 policy.\n"
            f"If you did not expect this invitation, you can safely ignore this email.\n\n"
            f"— The Bytherix Team"
        )

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to join {organization_name}</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b101e;
      color: #e2e8f0;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .wrapper {{
      width: 100%;
      background-color: #0b101e;
      padding: 40px 15px;
      box-sizing: border-box;
    }}
    .card {{
      max-width: 560px;
      margin: 0 auto;
      background-color: #111827;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 36px 32px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }}
    .brand {{
      display: inline-block;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      margin-bottom: 24px;
    }}
    .brand span {{
      color: #6366f1;
    }}
    .badge {{
      display: inline-block;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #a5b4fc;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 10px;
      border-radius: 20px;
      margin-bottom: 16px;
    }}
    h1 {{
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 16px 0;
      line-height: 1.3;
    }}
    p {{
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 20px 0;
    }}
    .role-box {{
      background: #1e293b;
      border-left: 3px solid #6366f1;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 28px;
    }}
    .role-box strong {{
      color: #f1f5f9;
    }}
    .btn {{
      display: inline-block;
      width: 100%;
      text-align: center;
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      padding: 14px 24px;
      border-radius: 10px;
      box-sizing: border-box;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
      margin-bottom: 24px;
    }}
    .divider {{
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      margin: 24px 0;
    }}
    .footer {{
      font-size: 11px;
      color: #64748b;
      line-height: 1.5;
    }}
    .footer a {{
      color: #818cf8;
      text-decoration: none;
    }}
    .direct-link {{
      word-break: break-all;
      color: #818cf8;
      font-family: monospace;
      font-size: 11px;
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="brand">BYTHERIX <span>EAM</span></div>
      <div><span class="badge">Workspace Invitation</span></div>
      <h1>Join {organization_name}</h1>
      <p>
        Hello,<br><br>
        <strong>{inviter_name}</strong> has invited you to collaborate on the 
        <strong>{organization_name}</strong> tenant on Bytherix EAM (Enterprise AI Management Platform).
      </p>

      <div class="role-box">
        <p style="margin: 0; font-size: 13px;">
          <strong>Assigned Role:</strong> {role.capitalize()}<br>
          <strong>Access Level:</strong> Scoped tenant workspace & knowledge boundaries
        </p>
      </div>

      <a href="{invite_url}" class="btn" target="_blank">Accept Invitation & Join Workspace</a>

      <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
        If the button above does not work, copy and paste this secure link directly into your browser:
      </p>
      <div class="direct-link">{invite_url}</div>

      <div class="divider"></div>

      <div class="footer">
        <strong>Security Notice (Section 7.1 Compliance):</strong> This invitation is single-use, cryptographically verified, and will expire in 7 days.<br>
        If you did not anticipate this invitation, no action is required and you can safely disregard this email.<br><br>
        &copy; Bytherix Technology Pvt. Ltd. &bull; Enterprise AI Management Platform
      </div>
    </div>
  </div>
</body>
</html>"""

        EmailService.send_email_async(
            to_email=recipient_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )

        return invite_url
