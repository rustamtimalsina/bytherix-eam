import os
import shutil
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from pypdf import PdfReader

def build_pdf():
    dest1 = r"C:\InternProject\bytherix-eam\Bytherix_EAM_Daily_Progress_Report_Nov24.pdf"
    dest2 = r"C:\Users\asus\OneDrive\Desktop\Bytherix_EAM_Daily_Progress_Report_Nov24.pdf"
    dest3 = r"C:\Users\asus\.gemini\antigravity\brain\2435dc4f-1042-437e-befd-903d974b9a53\Bytherix_EAM_Daily_Progress_Report_Nov24.pdf"

    # A4: 595.27 x 841.89 points
    # Margins: 36pt (0.5 in) left/right, 24pt top/bottom
    doc = SimpleDocTemplate(
        dest1,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=24,
        bottomMargin=24
    )

    styles = getSampleStyleSheet()

    COLOR_PRIMARY = colors.HexColor("#1e1b4b")  # Deep Bytherix Navy
    COLOR_TEXT = colors.HexColor("#374151")     # Slate 700
    COLOR_DARK = colors.HexColor("#111827")     # Slate 900
    COLOR_BORDER = colors.HexColor("#e5e7eb")   # Slate 200
    COLOR_BG_LIGHT = colors.HexColor("#f9fafb") # Slate 50

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=COLOR_DARK,
        spaceAfter=2
    )

    meta_style = ParagraphStyle(
        'DocMeta',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#4b5563"),
        spaceAfter=5
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        fontName='Helvetica-Bold',
        fontSize=9.8,
        leading=13,
        textColor=COLOR_PRIMARY,
        spaceBefore=4,
        spaceAfter=2.5,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        fontName='Helvetica',
        fontSize=7.7,
        leading=10.5,
        textColor=COLOR_TEXT,
        spaceAfter=2
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        fontName='Helvetica',
        fontSize=7.5,
        leading=10.2,
        textColor=COLOR_TEXT,
        leftIndent=10,
        firstLineIndent=-6,
        spaceAfter=1.8
    )

    cell_bold = ParagraphStyle(
        'CellBold',
        fontName='Helvetica-Bold',
        fontSize=7.2,
        leading=9.2,
        textColor=COLOR_DARK
    )

    cell_body = ParagraphStyle(
        'CellBody',
        fontName='Helvetica',
        fontSize=7.0,
        leading=9.0,
        textColor=COLOR_TEXT
    )

    story = []

    # --- PAGE 1 ---
    story.append(Paragraph("Bytherix EAM — Daily Progress Report", title_style))
    story.append(Paragraph("Developer: <b>Rustam Timalsina</b> &nbsp;|&nbsp; Date: <b>November 24, 2026</b> &nbsp;|&nbsp; Project: <b>Bytherix EAM</b>", meta_style))
    story.append(Spacer(1, 2))

    story.append(Paragraph("1. What I Worked On Today", h2_style))
    story.append(Paragraph("Today was focused on production cloud readiness, concurrency load benchmarking, real-time security alerts, and building an automated turnkey demo environment:", body_style))
    story.append(Spacer(1, 1))

    overview_bullets = [
        "<b>Production Deployment & Nginx SSL Ingress:</b> Configured production multi-container Docker Compose with PostgreSQL 16 (pgvector), Redis 7, Celery task workers, and Next.js standalone container. Set up production Nginx with HTTP-to-HTTPS redirect, modern TLS 1.3 ciphers, and unbuffered SSE streaming routes for live chat. Added <code>/health</code> monitoring probe.",
        "<b>Backend Concurrency & Database Tuning:</b> Benchmarked the FastAPI backend under 50 simultaneous virtual users across multiple organizations. Identified SQLite write contention, enabled Write-Ahead Logging (WAL mode), and set a 30-second busy timeout so concurrent queries execute smoothly without database locks.",
        "<b>Real-Time Security & SLA Webhook Alerts:</b> Built an automated webhook notification engine that fires when the DLP Shield catches sensitive credential leaks or when model response times drift. Formatted alerts into clean Slack Block Kit cards and Discord embeds with color-coded severity headers.",
        "<b>Turnkey Enterprise Demo Workspace Seeder:</b> Created <code>scripts/seed_demo_tenant.py</code> to auto-provision an enterprise demo company (<code>Bytherix Global Corp</code>) with pre-indexed compliance documents, 12 pre-computed vector chunks, benchmark models, and ready-to-test API keys.",
        "<b>Testing, Builds & CI Verification:</b> Wrote regression test suites for concurrency, security webhooks, and demo seeding. All 80 automated backend tests are passing, frontend TypeScript compiles with zero errors, and all changes are pushed to GitHub <code>main</code>."
    ]

    for bullet in overview_bullets:
        story.append(Paragraph(f"• {bullet}", bullet_style))

    story.append(Spacer(1, 2))

    # 2. Completed Tasks Table
    story.append(Paragraph("2. Completed Tasks", h2_style))
    story.append(Spacer(1, 1))

    table_data = [
        [
            Paragraph("<b>Task</b>", cell_bold),
            Paragraph("<b>Status</b>", cell_bold),
            Paragraph("<b>What Was Done</b>", cell_bold)
        ],
        [
            Paragraph("Production Docker Stack", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Configured multi-container Docker Compose with Postgres pgvector, Redis, Celery, and Next.js standalone.", cell_body)
        ],
        [
            Paragraph("Nginx TLS & SSE Streaming", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Set up production SSL reverse proxy with HTTP-to-HTTPS redirect and unbuffered streaming for chat.", cell_body)
        ],
        [
            Paragraph("Unified Health Probes", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Added <code>/health</code>, <code>/health/live</code>, <code>/health/ready</code>, and Prometheus <code>/metrics</code> endpoints.", cell_body)
        ],
        [
            Paragraph("Concurrency Load Testing", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Simulated 50 concurrent virtual users; tuned SQLite WAL mode and 30-second busy timeout for high load.", cell_body)
        ],
        [
            Paragraph("DLP & SLA Webhook Alerts", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Added automated Slack Block Kit and Discord embed webhooks for DLP policy violations and model latency drift.", cell_body)
        ],
        [
            Paragraph("Turnkey Demo Seeder", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Built <code>scripts/seed_demo_tenant.py</code> to provision a ready demo workspace with PDFs, chunks, and API keys.", cell_body)
        ],
        [
            Paragraph("Local Test Optimization", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Updated embedding helper to run strictly local in test environments, eliminating external network latency.", cell_body)
        ],
        [
            Paragraph("Automated Test Suite", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Added tests for concurrency, alerts, and demo seeding; all 80 tests passing (100% pass rate).", cell_body)
        ],
    ]

    col_widths = [125, 65, 333]
    t = Table(table_data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ('TEXTCOLOR', (0, 0), (-1, 0), COLOR_DARK),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.6),
        ('TOPPADDING', (0, 0), (-1, -1), 1.6),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_BG_LIGHT]),
    ]))
    story.append(t)
    story.append(Spacer(1, 3))

    # 3. Issues I Ran Into & How I Fixed Them
    story.append(Paragraph("3. Issues I Ran Into & How I Fixed Them", h2_style))
    story.append(Spacer(1, 1))

    issues_bullets = [
        "<b>Database locked up under 50 simultaneous workers:</b> During high-traffic load tests, 50 simultaneous workers caused SQLite to throw lock errors. I resolved this by enabling Write-Ahead Logging (<code>PRAGMA journal_mode=WAL</code>), setting synchronous writes to normal, and increasing the busy timeout to 30,000ms.",
        "<b>Outgoing webhook mocks intercepted internal test client:</b> Patching <code>httpx.Client.post</code> globally hijacked Starlette's internal <code>TestClient</code>. I resolved this by scoping the mock strictly to <code>app.services.webhook_service.httpx.Client</code>, leaving API test client calls untouched.",
        "<b>Embedding helper attempted external calls during tests:</b> The embedding provider tried connecting to OpenAI using mock keys during test runs, causing slow timeouts. I added an environment check (<code>settings.APP_ENV != 'test'</code>) so tests always use the fast deterministic local generator.",
        "<b>Missing database table in isolated API key test:</b> The test client could not locate the <code>api_keys</code> table when running an isolated test. I updated the test to use the shared <code>client</code> fixture with database dependency overrides, which creates all tables in memory cleanly."
    ]

    for bullet in issues_bullets:
        story.append(Paragraph(f"• {bullet}", bullet_style))

    # PageBreak between Page 1 and Page 2
    story.append(PageBreak())

    # --- PAGE 2 ---
    # 4. Current Platform Status
    story.append(Paragraph("4. Current Platform Status", h2_style))
    story.append(Spacer(1, 1))

    status_items = [
        "Multi-tenant auth & RBAC: Single-use 7-day invite tokens, JWT verification, org-scoped sessions — <b>Working & Live</b>",
        "Hybrid RAG pipeline: PDF parsing, chunking, pgvector HNSW embeddings, DLP scan, and streaming citations — <b>Working & Live</b>",
        "Split citation viewer: Verbatim highlights, similarity confidence score, chunk details — <b>Working & Live</b>",
        "Model Arena: Dual-model parallel testing, latency/cost/hallucination metrics, presets — <b>Working & Live</b>",
        "Velocity meter & stop button: Live tokens/sec display and instant stream cancellation — <b>Working & Live</b>",
        "Knowledge graph: Interactive vector canvas, node clustering, similarity slider — <b>Working & Live</b>",
        "Multi-doc synthesis: Checkbox selection, floating launcher, auto-prompt to chat — <b>Working & Live</b>",
        "Developer API Portal: Interactive sandbox, cURL/Python/TS code snippets, live endpoint execution — <b>Working & Live</b>",
        "Stripe billing & invoices: Checkout sessions, webhook deduplication, PDF receipts — <b>Working & Tested</b>",
        "Concurrency & load resilience: WAL mode, 30s busy timeout, 50-worker test verified — <b>Working & Tested</b>",
        "Security & SLA webhooks: Slack Block Kit and Discord embed alerts for DLP and drift — <b>Working & Tested</b>",
        "Turnkey demo workspace: One-click seeder with 3 enterprise PDFs, vector chunks, and models — <b>Working & Tested</b>",
        "Backend tests: <b>80/80 pytest tests passing (100% pass rate)</b>",
        "Frontend build: <b>0 TypeScript errors, 10/10 static pages built</b>",
        "GitHub repo: <b>Clean working tree, up to date with origin/main</b>"
    ]

    for item in status_items:
        story.append(Paragraph(f"✓ {item}", bullet_style))

    story.append(Spacer(1, 3))

    # 5. What I'm Doing Next (November 25)
    story.append(Paragraph("5. What I'm Doing Next (November 25)", h2_style))
    story.append(Spacer(1, 1))

    tomorrow_items = [
        "<b>Interactive Client Demo Walkthrough:</b> Test the end-to-end user journey in the browser using the newly seeded <code>Bytherix Global Corp</code> workspace (uploading custom PDFs, running split-citation QA, testing live prompt interception in DLP Shield).",
        "<b>Cloud Staging Deployment:</b> Deploy the multi-container Docker Compose stack to a cloud staging VPS, configure DNS records (<code>app.bytherix.com</code> and <code>api.bytherix.com</code>), and verify Let's Encrypt SSL certificate provisioning.",
        "<b>Observability & Alert Verification:</b> Connect live Slack and Discord webhook URLs in staging to verify real-time alert delivery when DLP violations or latency spikes occur in production."
    ]

    for i, item in enumerate(tomorrow_items, 1):
        story.append(Paragraph(f"{i}. {item}", bullet_style))

    story.append(Spacer(1, 4))

    # 6. Summary Box
    story.append(Paragraph("6. Summary", h2_style))
    story.append(Spacer(1, 1))

    summary_text = (
        "Delivered all 4 enterprise deployment milestones today: production Docker Compose and Nginx TLS ingress, backend concurrency tuning with 50-worker load benchmarks, real-time Slack and Discord webhook alerting for DLP leaks and model drift, and a turnkey demo seeder for instant workspace setup. All 80 backend tests are green, the frontend compiles with zero errors, and all code is committed and pushed to main."
    )

    summary_table = Table([[Paragraph(summary_text, body_style)]], colWidths=[523])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(summary_table)

    # Build
    doc.build(story)

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
