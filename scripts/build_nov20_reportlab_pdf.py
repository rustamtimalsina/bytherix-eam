import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from pypdf import PdfReader

def build_pdf():
    dest1 = r"C:\InternProject\bytherix-eam\Bytherix_EAM_Daily_Progress_Report_Nov20.pdf"
    dest2 = r"C:\Users\asus\OneDrive\Desktop\Bytherix_EAM_Daily_Progress_Report_Nov20.pdf"
    dest3 = r"C:\Users\asus\.gemini\antigravity\brain\2435dc4f-1042-437e-befd-903d974b9a53\Bytherix_EAM_Daily_Progress_Report_Nov20.pdf"

    # 1. Page Geometry (A4: 595.27 x 841.89 points)
    # Margins: 36pt (0.5 in) left/right, 32pt top/bottom
    doc = SimpleDocTemplate(
        dest1,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=32,
        bottomMargin=32
    )

    styles = getSampleStyleSheet()

    # Custom Clean Palette
    COLOR_PRIMARY = colors.HexColor("#1e1b4b")  # Deep Bytherix Navy
    COLOR_TEXT = colors.HexColor("#374151")     # Slate 700
    COLOR_DARK = colors.HexColor("#111827")     # Slate 900
    COLOR_BORDER = colors.HexColor("#e5e7eb")   # Slate 200
    COLOR_BG_LIGHT = colors.HexColor("#f9fafb") # Slate 50
    COLOR_GREEN_BG = colors.HexColor("#dcfce7") # Emerald 100
    COLOR_GREEN_TXT = colors.HexColor("#15803d")# Emerald 700

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=COLOR_DARK,
        spaceAfter=2
    )

    meta_style = ParagraphStyle(
        'DocMeta',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#4b5563"),
        spaceAfter=8
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=COLOR_PRIMARY,
        spaceBefore=6,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        fontName='Helvetica',
        fontSize=8.3,
        leading=11.3,
        textColor=COLOR_TEXT,
        spaceAfter=3
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        fontName='Helvetica',
        fontSize=8.2,
        leading=11.2,
        textColor=COLOR_TEXT,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=2.5
    )

    cell_bold = ParagraphStyle(
        'CellBold',
        fontName='Helvetica-Bold',
        fontSize=7.8,
        leading=10,
        textColor=COLOR_DARK
    )

    cell_body = ParagraphStyle(
        'CellBody',
        fontName='Helvetica',
        fontSize=7.6,
        leading=9.8,
        textColor=COLOR_TEXT
    )

    story = []

    # --- PAGE 1 ---
    # Header
    story.append(Paragraph("Bytherix EAM — Daily Progress Report", title_style))
    story.append(Paragraph("Developer: <b>Rustam Timalsina</b> &nbsp;|&nbsp; Date: <b>November 20, 2026</b> &nbsp;|&nbsp; Project: <b>Bytherix EAM</b>", meta_style))
    story.append(Spacer(1, 2))

    # 1. Overview
    story.append(Paragraph("1. Overview of Today's Work", h2_style))
    story.append(Paragraph("Today I focused on four main tasks for the Bytherix platform: getting our staging setup running in Docker containers, adding a live usage meter for API keys on the dashboard, setting up GitHub Actions to automatically run tests on every push, and building a model response time monitor with a 1-click rollback button:", body_style))
    story.append(Spacer(1, 2))

    overview_bullets = [
        "<b>Docker Setup for Staging:</b> Wrote a <code>docker-compose.yml</code> file to run our entire app in Docker (PostgreSQL with pgvector, Redis, MinIO S3, FastAPI backend, Next.js frontend, and Nginx proxy). Optimized the Next.js Dockerfile with multi-stage builds so the final image size dropped from 1.5GB down to ~150MB, and set up Nginx to handle routing and streaming.",
        "<b>API Key Usage & Limits UI:</b> Built <code>ApiKeyUsageCard.tsx</code> on the API Keys page. It shows users a visual progress bar of how many tokens they have used this month against their quota, their rate limit SLA, and active key count. Also updated the keys table to show when each key was last used or if it has never been used.",
        "<b>Automated GitHub Actions CI/CD:</b> Added <code>.github/workflows/ci.yml</code>. Whenever code is pushed to GitHub, it automatically spins up a clean Linux runner, runs all 54 backend tests, builds the frontend, and checks our Docker config to make sure nothing is broken before merging.",
        "<b>Model Speed Monitoring & Rollback:</b> Added <code>ModelDriftMonitorCard.tsx</code> and a backend endpoint at <code>/models/{id}/monitoring</code>. It checks whether a deployed AI model's response time is slowing down compared to its baseline. If latency spikes, it shows an alert and provides a single button to roll back to the previous stable version without downtime.",
        "<b>Testing & Git Commits:</b> Verified everything locally and pushed 3 clean commits to GitHub main (<code>664965a</code>, <code>89777a0</code>, and <code>bc1da41</code>)."
    ]

    for bullet in overview_bullets:
        story.append(Paragraph(f"• {bullet}", bullet_style))

    story.append(Spacer(1, 4))

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
            Paragraph("Docker Compose Setup", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Created <code>docker-compose.yml</code> running Postgres (pgvector), Redis 7, MinIO S3, FastAPI, Next.js, and Nginx together.", cell_body)
        ],
        [
            Paragraph("Next.js Dockerfile Optimization", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Built a 3-stage <code>frontend/Dockerfile</code> using Next.js standalone output, cutting image size from 1.5GB down to ~150MB.", cell_body)
        ],
        [
            Paragraph("Nginx Reverse Proxy", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Configured <code>nginx/nginx.conf</code> to direct port 80 to Next.js (port 3000) and <code>/api/*</code> to FastAPI (port 8000) with SSE streaming support.", cell_body)
        ],
        [
            Paragraph("API Key Usage Meter", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Created <code>ApiKeyUsageCard.tsx</code> with a visual token bar, SLA rate limit badge, and warning alerts when usage passes 80%.", cell_body)
        ],
        [
            Paragraph("Key Activity Timestamps", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Updated <code>tenant_context.py</code> to save <code>last_used_at</code> timestamps in the database whenever an API key is authenticated.", cell_body)
        ],
        [
            Paragraph("Automated GitHub CI/CD", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Added <code>.github/workflows/ci.yml</code> that runs pytest, Next.js build, and Docker validation on every push and pull request.", cell_body)
        ],
        [
            Paragraph("Model Latency Monitoring", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Added <code>GET /api/v1/models/{id}/monitoring</code> to compare live response times against baselines and flag slowdowns.", cell_body)
        ],
        [
            Paragraph("1-Click Model Rollback", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Added <code>ModelDriftMonitorCard.tsx</code> with health status badges and an instant rollback button to restore stable releases.", cell_body)
        ],
    ]

    # Available width = 595.27 - 72 = 523.27 pt
    col_widths = [135, 68, 320]
    t = Table(table_data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ('TEXTCOLOR', (0, 0), (-1, 0), COLOR_DARK),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
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
        "<b>Timezone Comparison Error in Tests:</b> While running API key expiration tests, SQLite threw an error (<code>TypeError: can't compare offset-naive and offset-aware datetimes</code>) because SQLite dates had no timezone while Python was using UTC. <i>Fix:</i> Updated <code>tenant_context.py</code> to check whether timezone info exists before comparing, so it works seamlessly on both SQLite and Postgres.",
        "<b>Next.js Build Warnings & Loose Types:</b> The production frontend build failed due to unused Lucide icon imports in <code>ModelPromotionModal.tsx</code> and <code>WebhookManagerCard.tsx</code>, plus a loose type in <code>api.ts</code>. <i>Fix:</i> Removed the unused imports, added proper TypeScript typing for the webhook payload, and set up standalone output in <code>next.config.mjs</code>.",
        "<b>Stale Background Process on Port 8000:</b> After writing the new <code>/models/{id}/monitoring</code> route, test requests kept returning 404 because an older Uvicorn server was still running in the background holding the port. <i>Fix:</i> Terminated the old process with <code>taskkill</code>, restarted Uvicorn, and verified that requests return 200 OK.",
        "<b>TypeScript Name Mismatch:</b> The frontend build threw an error in <code>ModelDriftMonitorCard.tsx</code> because it imported <code>RegisteredModel</code> instead of <code>RegisteredModelDetail</code>. <i>Fix:</i> Corrected the import name to match <code>api.ts</code>, and all 10 pages compiled cleanly."
    ]

    for bullet in issues_bullets:
        story.append(Paragraph(f"• {bullet}", bullet_style))

    story.append(Spacer(1, 5))

    # 4. Current System Status
    story.append(Paragraph("4. Current System Status", h2_style))
    story.append(Spacer(1, 2))

    status_items = [
        "Multi-tenant authentication, 8 user roles, single-use 7-day invite tokens — <b>Done</b>",
        "Grounded Hybrid RAG with page citations & real-time streaming — <b>Done & Live</b>",
        "Enterprise Billing Ledger with downloadable PDF tax receipts — <b>Done</b>",
        "Multi-container Docker Compose staging environment & Nginx proxy — <b>Done & Verified</b>",
        "Live API Key usage meters & active key tracking — <b>Done & Verified</b>",
        "Automated GitHub Actions CI/CD testing pipeline — <b>Done & Verified</b>",
        "Model speed monitoring & 1-click rollback engine — <b>Done & Verified</b>",
        "Automated Test Suite — <b>100% Passing (54/54 backend tests, Next.js build clean)</b>",
        "Git Repository — <b>Clean working tree pushed to origin/main (Commit: <code>bc1da41</code>)</b>"
    ]

    for item in status_items:
        story.append(Paragraph(f"✓ {item}", bullet_style))

    story.append(Spacer(1, 5))

    # 5. Plan for Tomorrow
    story.append(Paragraph("5. Plan for Tomorrow (November 21)", h2_style))
    story.append(Spacer(1, 2))

    tomorrow_items = [
        "<b>Stripe Payment Webhook Integration:</b> Connect our HMAC webhook handler to live Stripe test keys to handle automatic subscription renewals.",
        "<b>Coordinate with Sujal:</b> Help Sujal connect his Developer API portal components to our live backend endpoints.",
        "<b>Docker Staging Smoke Testing:</b> Run full end-to-end tests across the containers in the Docker staging setup."
    ]

    for item in tomorrow_items:
        story.append(Paragraph(f"1. {item}" if item.startswith("<b>Stripe") else f"2. {item}" if item.startswith("<b>Coord") else f"3. {item}", bullet_style))

    story.append(Spacer(1, 6))

    # 6. Summary Box
    story.append(Paragraph("6. Summary", h2_style))
    story.append(Spacer(1, 2))

    summary_text = (
        "Today went very well. We set up our staging environment in Docker with Nginx, added live usage meters for API keys so users know when they are near their limits, configured GitHub Actions to test our code automatically on every push, and added a model latency monitor with a quick rollback button. All 54 tests are passing, the frontend builds cleanly, and all changes are pushed to GitHub main."
    )

    summary_table = Table([[Paragraph(summary_text, body_style)]], colWidths=[523])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(summary_table)

    # Build
    doc.build(story)

    # Copy to Desktop and Brain
    import shutil
    shutil.copyfile(dest1, dest2)
    shutil.copyfile(dest1, dest3)

    print(f"Generated: {dest1}")
    print(f"Copied to: {dest2}")
    print(f"Copied to: {dest3}")

    reader = PdfReader(dest1)
    page_count = len(reader.pages)
    print(f"=== VERIFIED PDF PAGE COUNT: {page_count} PAGES ===")
    assert page_count == 2, f"Expected 2 pages, got {page_count}"

if __name__ == "__main__":
    build_pdf()
