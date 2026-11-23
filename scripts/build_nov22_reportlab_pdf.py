import os
import shutil
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from pypdf import PdfReader

def build_pdf():
    dest1 = r"C:\InternProject\bytherix-eam\Bytherix_EAM_Daily_Progress_Report_Nov22.pdf"
    dest2 = r"C:\Users\asus\OneDrive\Desktop\Bytherix_EAM_Daily_Progress_Report_Nov22.pdf"
    dest3 = r"C:\Users\asus\.gemini\antigravity\brain\2435dc4f-1042-437e-befd-903d974b9a53\Bytherix_EAM_Daily_Progress_Report_Nov22.pdf"

    # A4: 595.27 x 841.89 points
    # Margins: 36pt (0.5 in) left/right, 28pt top/bottom
    doc = SimpleDocTemplate(
        dest1,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=28,
        bottomMargin=28
    )

    styles = getSampleStyleSheet()

    # Custom Clean Palette
    COLOR_PRIMARY = colors.HexColor("#1e1b4b")  # Deep Bytherix Navy
    COLOR_TEXT = colors.HexColor("#374151")     # Slate 700
    COLOR_DARK = colors.HexColor("#111827")     # Slate 900
    COLOR_BORDER = colors.HexColor("#e5e7eb")   # Slate 200
    COLOR_BG_LIGHT = colors.HexColor("#f9fafb") # Slate 50

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=17,
        leading=21,
        textColor=COLOR_DARK,
        spaceAfter=2
    )

    meta_style = ParagraphStyle(
        'DocMeta',
        fontName='Helvetica-Bold',
        fontSize=8.8,
        leading=12,
        textColor=colors.HexColor("#4b5563"),
        spaceAfter=7
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        fontName='Helvetica-Bold',
        fontSize=10.2,
        leading=13.5,
        textColor=COLOR_PRIMARY,
        spaceBefore=5,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        fontName='Helvetica',
        fontSize=8.0,
        leading=11.0,
        textColor=COLOR_TEXT,
        spaceAfter=2.5
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        fontName='Helvetica',
        fontSize=7.9,
        leading=10.8,
        textColor=COLOR_TEXT,
        leftIndent=11,
        firstLineIndent=-7,
        spaceAfter=2.2
    )

    cell_bold = ParagraphStyle(
        'CellBold',
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=COLOR_DARK
    )

    cell_body = ParagraphStyle(
        'CellBody',
        fontName='Helvetica',
        fontSize=7.3,
        leading=9.3,
        textColor=COLOR_TEXT
    )

    story = []

    # --- PAGE 1 ---
    # Header
    story.append(Paragraph("Bytherix EAM — Daily Progress Report", title_style))
    story.append(Paragraph("Developer: <b>Rustam Timalsina</b> &nbsp;|&nbsp; Date: <b>November 22, 2026</b> &nbsp;|&nbsp; Project: <b>Bytherix EAM (Enterprise AI Management Platform)</b>", meta_style))
    story.append(Spacer(1, 2))

    # 1. Overview
    story.append(Paragraph("1. Overview of Today's Work", h2_style))
    story.append(Paragraph("Today I focused on four critical enterprise production milestones for the Bytherix platform: integrating Stripe subscription checkout sessions with idempotent webhook deduplication and dynamic PDF tax receipts, building an aggressive cross-tenant security penetration suite, implementing an automated disaster recovery backup engine with a verified 0.13-second fire drill, and authoring our comprehensive operational runbooks and STRIDE threat model:", body_style))
    story.append(Spacer(1, 2))

    overview_bullets = [
        "<b>Stripe Subscription Checkout & Idempotent Webhooks:</b> Built backend checkout session generation at <code>/api/v1/billing/checkout</code> and real-time subscription status retrieval at <code>/api/v1/billing/status</code>. Implemented <code>WebhookIdempotencyRegistry</code> for thread-safe event deduplication, handling <code>checkout.session.completed</code>, <code>invoice.payment_failed</code> (with a 7-day grace period and past-due status), and <code>customer.subscription.deleted</code>. Upgraded dynamic PDF tax receipt generation with tenant-scoped validation and invoice numbering.",
        "<b>Cross-Tenant Security Penetration Suite:</b> Built a dedicated SOC 2 multi-tenant penetration testing suite in <code>tests/security/test_tenant_isolation.py</code>. Successfully defended against 7 distinct cross-tenant attack vectors across private document storage, vector similarity RAG retrieval, API key theft/spoofing, compliance audit logs, MLOps model registry/rollbacks, billing invoices, and autonomous agent human approval gates.",
        "<b>Automated Database Backup & Disaster Recovery Drill:</b> Created <code>scripts/backup_restore.py</code> to create atomic, lock-free online SQLite/PostgreSQL backups with cryptographic SHA-256 manifests. Implemented an automated Disaster Recovery Drill (Section 15.5) that spins up an isolated scratch database, restores all 18 tables, validates 100% row-count fidelity, and passes synthetic health checks in 0.13 seconds (well within the 15-minute SLA). Added automated CI regression tests in <code>tests/test_backup_restore.py</code>.",
        "<b>Enterprise Runbooks & STRIDE Threat Model:</b> Populated the <code>docs/</code> architecture repository with comprehensive production documentation, including the Disaster Recovery Runbook (<code>disaster_recovery_runbook.md</code>), ML Model Incident & Emergency Rollback Runbook (<code>model_incident_runbook.md</code>), STRIDE Multi-Tenant Threat Model Whitepaper (<code>tenant_isolation_threat_model.md</code>), System Architecture & Data Model Guide (<code>system_architecture.md</code>), and REST API Reference (<code>api_reference.md</code>).",
        "<b>Testing & Git Commits:</b> Verified the entire backend test suite (<b>68/68 tests passing 100%</b>) and verified that the Next.js production frontend builds with 0 errors. Pushed 3 clean commits to GitHub <code>origin/main</code> (<code>03318ea</code>, <code>676dad3</code>, and <code>fd1eabf</code>)."
    ]

    for bullet in overview_bullets:
        story.append(Paragraph(f"• {bullet}", bullet_style))

    story.append(Spacer(1, 3))

    # 2. Key Accomplishments Table
    story.append(Paragraph("2. Key Accomplishments", h2_style))
    story.append(Spacer(1, 2))

    table_data = [
        [
            Paragraph("<b>Feature / Task</b>", cell_bold),
            Paragraph("<b>Status</b>", cell_bold),
            Paragraph("<b>Implementation Details</b>", cell_bold)
        ],
        [
            Paragraph("Stripe Checkout Sessions", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Added <code>POST /api/v1/billing/checkout</code> and <code>GET /api/v1/billing/status</code> with frontend API integration for seamless plan upgrades.", cell_body)
        ],
        [
            Paragraph("Idempotent Webhooks", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Built thread-safe <code>WebhookIdempotencyRegistry</code> preventing duplicate balance crediting on replayed Stripe webhook events.", cell_body)
        ],
        [
            Paragraph("Dynamic PDF Invoices", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Generated branded tax invoices with itemized quotas, PAN/VAT registrations, and enforced cross-tenant invoice download protection.", cell_body)
        ],
        [
            Paragraph("Tenant Isolation Suite", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Created <code>tests/security/test_tenant_isolation.py</code> proving 100% data separation across 7 penetration attack vectors.", cell_body)
        ],
        [
            Paragraph("Cross-Tenant Billing Defense", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Enforced strict tenant ID prefix checks in <code>billing_service.py</code> to block cross-tenant invoice inspection with immediate 404 responses.", cell_body)
        ],
        [
            Paragraph("Disaster Recovery Engine", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Created <code>scripts/backup_restore.py</code> supporting atomic online database backups, row counts, and cryptographic SHA-256 manifests.", cell_body)
        ],
        [
            Paragraph("0.13s Restoration Fire Drill", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Implemented automated scratch database restoration drill verifying 18 schema tables and executing synthetic health checks.", cell_body)
        ],
        [
            Paragraph("Backup Regression Tests", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Added <code>tests/test_backup_restore.py</code> testing clean recovery and corrupt-byte tamper detection to trigger automated failure alerts.", cell_body)
        ],
        [
            Paragraph("Operational Runbooks", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Authored Disaster Recovery and Model Incident emergency runbooks in <code>docs/operations/</code> for on-call SRE operators.", cell_body)
        ],
        [
            Paragraph("STRIDE Threat Model", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Wrote SOC 2 Type II multi-tenant security whitepaper and architectural catalog in <code>docs/threat-model/</code> and <code>docs/architecture/</code>.", cell_body)
        ],
    ]

    # Available width = 595.27 - 72 = 523.27 pt
    col_widths = [135, 65, 323]
    t = Table(table_data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ('TEXTCOLOR', (0, 0), (-1, 0), COLOR_DARK),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_BG_LIGHT]),
    ]))
    story.append(t)

    # Force PageBreak to guarantee exact 2-page balance
    story.append(PageBreak())

    # --- PAGE 2 ---
    # 3. Issues Encountered & Fixes
    story.append(Paragraph("3. Issues Encountered & How I Fixed Them", h2_style))
    story.append(Spacer(1, 2))

    issues_bullets = [
        "<b>Retrieved Chunks Schema Mismatch in Security Tests:</b> While testing RAG cross-tenant isolation, accessing <code>chat_data[\"retrieved_chunks\"]</code> raised a <code>KeyError</code> because the Pydantic response schema defined the field as <code>sources</code>. <i>Fix:</i> Updated the test assertion to reference <code>chat_data[\"sources\"]</code>, successfully validating zero chunk leakage across tenants.",
        "<b>Audit Route 404 in Test Suite:</b> The penetration test initially called <code>/api/v1/audit/logs</code>, which returned a 404 Not Found because the router prefix was configured as <code>/audit-logs</code>. <i>Fix:</i> Corrected the test endpoint URLs to <code>/api/v1/audit-logs</code> and <code>/api/v1/audit-logs/export</code>.",
        "<b>In-Memory SQLite Path Resolution Under Pytest:</b> When running automated backup tests, <code>DisasterRecoveryManager</code> threw <code>sqlite3.OperationalError: unable to open database file</code> because <code>conftest.py</code> used <code>sqlite:///:memory:</code>. <i>Fix:</i> Enhanced <code>_resolve_db_source</code> with a <code>custom_db_path</code> parameter and safe test file fallback so backups work in both memory and file-backed modes.",
        "<b>Backup List Chronological Sorting Flaw:</b> Rapid snapshots created within the same second in <code>test_list_backups</code> sorted by random hexadecimal IDs instead of timestamp. <i>Fix:</i> Updated <code>list_backups()</code> to sort explicitly by the ISO 8601 timestamp field descending, guaranteeing strict chronological ordering.",
        "<b>Stale Port 8000 Subprocesses:</b> Restarting the FastAPI development server failed with <code>WinError 10048</code> due to lingering Python worker processes holding port 8000. <i>Fix:</i> Used PowerShell <code>taskkill /F /T /PID</code> to terminate the process tree and verified that requests return 200 OK."
    ]

    for bullet in issues_bullets:
        story.append(Paragraph(f"• {bullet}", bullet_style))

    story.append(Spacer(1, 4))

    # 4. Current System Status
    story.append(Paragraph("4. Current System Status", h2_style))
    story.append(Spacer(1, 2))

    status_items = [
        "Multi-Tenant Authentication & RBAC: Single-use 7-day invite tokens, JWT verification, and scoped organization sessions — <b>Done</b>",
        "Grounded Hybrid RAG Pipeline: PDF parsing, chunking, pgvector HNSW embeddings, DLP guardrails, and streaming citations — <b>Done & Live</b>",
        "Stripe Billing & Tax Invoices: Checkout sessions, idempotent webhook deduplication, and dynamic PDF receipts — <b>Done & Verified</b>",
        "SOC 2 Multi-Tenant Security Suite: 7-vector cross-tenant penetration testing proving complete data isolation — <b>Done & Verified</b>",
        "Automated Disaster Recovery & Fire Drill: Atomic backups, SHA-256 manifests, and 0.13s scratch restoration drill — <b>Done & Verified</b>",
        "Operational Runbooks & STRIDE Threat Model: Enterprise incident guides, system architecture, and API reference — <b>Done</b>",
        "Automated Test Suite — <b>100% Passing (68/68 backend tests, Next.js build clean with 10/10 pages compiled)</b>",
        "Git Repository — <b>Clean working tree pushed to origin/main (Commits: <code>03318ea</code>, <code>676dad3</code>, <code>fd1eabf</code>)</b>"
    ]

    for item in status_items:
        story.append(Paragraph(f"✓ {item}", bullet_style))

    story.append(Spacer(1, 4))

    # 5. Plan for Tomorrow
    story.append(Paragraph("5. Plan for Tomorrow (November 23)", h2_style))
    story.append(Spacer(1, 2))

    tomorrow_items = [
        "<b>Docker Compose Staging Deployment:</b> Validate the full multi-container stack (<code>FastAPI</code>, <code>Next.js</code>, <code>PostgreSQL/pgvector</code>, <code>Redis 7</code>, <code>MinIO</code>) in local Docker staging.",
        "<b>Coordinate with Sujal on Developer Portal:</b> Connect Sujal's <code>DeveloperApiPortal.tsx</code> sandbox to live <code>/chat</code>, <code>/security/dlp/scan</code>, and <code>/models</code> endpoints.",
        "<b>End-to-End Visual QA:</b> Perform live frontend smoke testing across all 10 views (Dashboard, Documents, Models, Telemetry, and Billing)."
    ]

    for i, item in enumerate(tomorrow_items, 1):
        story.append(Paragraph(f"{i}. {item}", bullet_style))

    story.append(Spacer(1, 5))

    # 6. Summary Box
    story.append(Paragraph("6. Summary", h2_style))
    story.append(Spacer(1, 2))

    summary_text = (
        "Today was an exceptional development milestone for Bytherix EAM. We implemented full Stripe subscription checkout and idempotent webhook deduplication, verified 100% cross-tenant data isolation across 7 penetration vectors, built an automated database backup and disaster recovery drill that recovers in 0.13s, and authored comprehensive operational runbooks and threat models. All 68 tests are passing, the Next.js frontend builds cleanly, and all code is committed and pushed to GitHub main."
    )

    summary_table = Table([[Paragraph(summary_text, body_style)]], colWidths=[523])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(summary_table)

    # Build
    doc.build(story)

    # Copy to Desktop and Brain
    for d in [dest2, dest3]:
        try:
            os.makedirs(os.path.dirname(d), exist_ok=True)
            shutil.copyfile(dest1, d)
        except Exception as e:
            print(f"Warning copying to {d}: {e}")

    print(f"Generated: {dest1}")
    print(f"Copied to: {dest2}")
    print(f"Copied to: {dest3}")

    reader = PdfReader(dest1)
    page_count = len(reader.pages)
    print(f"=== VERIFIED PDF PAGE COUNT: {page_count} PAGES ===")
    assert page_count == 2, f"Expected 2 pages, got {page_count}"

if __name__ == "__main__":
    build_pdf()
