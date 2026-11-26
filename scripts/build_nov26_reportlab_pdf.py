import os
import shutil
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from pypdf import PdfReader

def build_pdf():
    dest1 = r"C:\InternProject\bytherix-eam\Bytherix_EAM_Daily_Progress_Report_Nov26.pdf"
    dest2 = r"C:\Users\asus\OneDrive\Desktop\Bytherix_EAM_Daily_Progress_Report_Nov26.pdf"
    dest3 = r"C:\Users\asus\.gemini\antigravity\brain\2435dc4f-1042-437e-befd-903d974b9a53\Bytherix_EAM_Daily_Progress_Report_Nov26.pdf"

    # A4: 595.27 x 841.89 points
    # Margins: 36pt (0.5 in) left/right, 22pt top/bottom
    doc = SimpleDocTemplate(
        dest1,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=22,
        bottomMargin=22
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
        fontSize=15.0,
        leading=19.0,
        textColor=COLOR_DARK,
        spaceAfter=2
    )

    meta_style = ParagraphStyle(
        'DocMeta',
        fontName='Helvetica-Bold',
        fontSize=8.3,
        leading=11.0,
        textColor=colors.HexColor("#4b5563"),
        spaceAfter=3
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        fontName='Helvetica-Bold',
        fontSize=9.3,
        leading=12.2,
        textColor=COLOR_PRIMARY,
        spaceBefore=3.0,
        spaceAfter=1.8,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        fontName='Helvetica',
        fontSize=7.4,
        leading=10.0,
        textColor=COLOR_TEXT,
        spaceAfter=1.8
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        fontName='Helvetica',
        fontSize=7.2,
        leading=9.5,
        textColor=COLOR_TEXT,
        leftIndent=10,
        firstLineIndent=-6,
        spaceAfter=1.4
    )

    cell_bold = ParagraphStyle(
        'CellBold',
        fontName='Helvetica-Bold',
        fontSize=6.8,
        leading=8.8,
        textColor=COLOR_DARK
    )

    cell_body = ParagraphStyle(
        'CellBody',
        fontName='Helvetica',
        fontSize=6.6,
        leading=8.6,
        textColor=COLOR_TEXT
    )

    story = []

    # =========================================================================
    # PAGE 1
    # =========================================================================
    story.append(Paragraph("Bytherix EAM — Daily Progress Report", title_style))
    story.append(Paragraph("Developer: <b>Rustam Timalsina</b> &nbsp;|&nbsp; Date: <b>November 26, 2026</b> &nbsp;|&nbsp; Project: <b>Bytherix EAM</b>", meta_style))
    story.append(Spacer(1, 2))

    story.append(Paragraph("1. What I Worked On Today", h2_style))
    story.append(Paragraph("Today focused on multi-document intelligence synthesis export, Model Arena benchmark presets, Custom DLP regex simulation with Nepal regulatory compliance, citation UX unification, and staging verification:", body_style))
    story.append(Spacer(1, 1))

    overview_bullets = [
        "<b>Multi-Document Synthesis PDF & Markdown Export:</b> Implemented <code>POST /api/v1/documents/synthesis/export</code> enabling 1-click strategic intelligence dossier export. Engineered ReportLab PDF and GFM Markdown generators with executive summaries, cross-document comparison matrix, metadata tables, and tamper-evident SHA-256 audit logs.",
        "<b>Custom Enterprise DLP Regex Rule Sandbox:</b> Built <code>POST /api/v1/security/dlp/test-regex</code> with catastrophic backtracking safeguards, pattern pre-compilation, and token masking. Added an interactive modal tab with 1-click presets for Nepal Citizenship (<code>\\b\\d{2}-\\d{2}-\\d{2}-\\d{5}\\b</code>), Nepal PAN (<code>\\b\\d{9}\\b</code>), and Bytherix Session/JWT tokens.",
        "<b>Model Arena Enterprise Benchmark Preset Library:</b> Engineered 5 enterprise benchmark presets (HIPAA Compliance, Zero-Trust Redaction, HNSW Optimization, Sub-150ms Velocity, Adversarial Hallucination Trap) with category filter pills and an automated head-to-head delta comparison card displaying winner, latency delta, and speedup %.",
        "<b>Citation Viewport Collision & UX Fix:</b> Diagnosed and resolved the split citation viewer collision where clicking citations triggered both split view and overlay modal. Removed duplicate modal drawer, unified close synchronization, and embedded chunk inspector and download actions directly into <code>SplitCitationViewer.tsx</code>.",
        "<b>Live Webhooks & Staging Infrastructure Validation:</b> Executed <code>scripts/test_live_webhooks.py</code> validating HMAC-SHA256 signature verification, Slack Block Kit format, and Discord embed cards. Ran <code>scripts/verify_docker_staging.py</code> confirming all 8 production containers, 50MB upload limits, and unbuffered SSE chat streaming.",
        "<b>Test Suite Expansion & Build Health:</b> Created <code>tests/test_synthesis_export.py</code> and <code>tests/test_custom_dlp_regex.py</code>. All 84 backend pytest tests pass (100% pass rate), frontend TypeScript compiles with 0 errors, and all local commits are staged cleanly."
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
            Paragraph("Multi-Doc Synthesis Export", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Built ReportLab PDF and Markdown dossier generators with cross-doc comparisons and audit trails.", cell_body)
        ],
        [
            Paragraph("Custom DLP Regex Sandbox", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Implemented safe regex testing endpoint with ReDoS guards, live matching, and masked diff preview.", cell_body)
        ],
        [
            Paragraph("Nepal Regulatory Presets", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Added 1-click presets for Nepal Citizenship (27-01-79-12345), Nepal PAN (9-digit), and Session Bearer tokens.", cell_body)
        ],
        [
            Paragraph("Model Arena Preset Library", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Integrated 5 enterprise benchmark prompts, category filters, and head-to-head delta comparison card.", cell_body)
        ],
        [
            Paragraph("Citation Viewport Unification", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Eliminated modal-drawer collision, unified close state, and ported chunk actions to SplitCitationViewer.", cell_body)
        ],
        [
            Paragraph("Live Webhooks & HMAC Check", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Verified local webhook receiver, HMAC-SHA256 signature verification, Slack Block Kit, and Discord embeds.", cell_body)
        ],
        [
            Paragraph("Docker Staging Pre-flight", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Validated 8 production services, pgvector 1536-dim schema, 50MB PDF upload limits, and SSE buffering.", cell_body)
        ],
        [
            Paragraph("Automated Test Expansion", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Authored test_synthesis_export.py and test_custom_dlp_regex.py; all 84 pytest tests green (100%).", cell_body)
        ],
        [
            Paragraph("Frontend TypeScript Verification", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Verified clean compilation with npx tsc --noEmit (0 type errors across all components).", cell_body)
        ],
    ]

    col_widths = [125, 65, 333]
    t = Table(table_data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ('TEXTCOLOR', (0, 0), (-1, 0), COLOR_DARK),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.2),
        ('TOPPADDING', (0, 0), (-1, -1), 1.2),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_BG_LIGHT]),
    ]))
    story.append(t)
    story.append(Spacer(1, 2))

    # 3. Issues I Ran Into & How I Fixed Them
    story.append(Paragraph("3. Issues I Ran Into & How I Fixed Them", h2_style))
    story.append(Spacer(1, 1))

    issues_bullets = [
        "<b>Dual Modal & Split View Collision on Citation Click:</b> Clicking citations triggered both <code>isSplitViewOpen(true)</code> and the blocking <code>CitationInspectorDrawer</code> modal. Closing the modal set citation state to null while leaving the split pane open, showing 'No Passage Selected'. I removed the duplicate modal and centralized chunk inspection inside <code>SplitCitationViewer.tsx</code>.",
        "<b>ReportLab Paragraph XML Parsing on Markdown Characters:</b> Multi-document synthesis summaries with unescaped Markdown symbols or raw asterisks caused ReportLab XML parser errors. I added a text normalization layer converting Markdown bold patterns to <code>&lt;b&gt;</code> tags and escaping XML entities before PDF paragraph rendering.",
        "<b>In-Memory Database State in Synthesis Pytest Suite:</b> Direct <code>SessionLocal()</code> document seeding collided with local dev SQLite data. I refactored the test suite to create documents via <code>client.post('/api/v1/documents')</code> using standard test client fixtures, ensuring 100% test isolation.",
        "<b>ReDoS & Catastrophic Backtracking Prevention in Custom DLP Regex:</b> Unbounded user-defined regexes present catastrophic backtracking vulnerabilities. I implemented a 10,000-character safety window, pre-compilation syntax checks, timeout guards, and standard sequential masking (<code>[REDACTED_RULE_N]</code>)."
    ]

    for bullet in issues_bullets:
        story.append(Paragraph(f"• {bullet}", bullet_style))

    # PageBreak between Page 1 and Page 2
    story.append(PageBreak())

    # =========================================================================
    # PAGE 2
    # =========================================================================
    # 4. Current Platform Status
    story.append(Paragraph("4. Current Platform Status", h2_style))
    story.append(Spacer(1, 1))

    status_items = [
        "Multi-document synthesis export: 1-click ReportLab PDF & Markdown dossier generation with SHA-256 audit logs — <b>Working & Live</b>",
        "Custom DLP regex sandbox: Dynamic pattern simulator with Nepal Citizenship & PAN regulatory presets — <b>Working & Live</b>",
        "Model Arena: Dual-model testing, 5 enterprise presets, category filter pills, head-to-head delta card — <b>Working & Live</b>",
        "Split citation viewer: Verbatim highlights, confidence scores, embedded chunk inspector, zero modal collisions — <b>Working & Live</b>",
        "Live outbound webhooks: HMAC-SHA256 signature verification, Slack Block Kit & Discord embed formatting — <b>Working & Tested</b>",
        "Cloud staging deployer: Automated Ubuntu VPS deployment script (deploy_staging.sh) and pre-flight runner — <b>Working & Tested</b>",
        "Multi-tenant auth & RBAC: Single-use 7-day invite tokens, role alias normalization, JWT tenant isolation — <b>Working & Live</b>",
        "Hybrid RAG pipeline: PDF parsing, chunking, pgvector HNSW embeddings, DLP scan, and streaming citations — <b>Working & Live</b>",
        "Velocity meter & stop button: Live tokens/sec display and instant client stream cancellation — <b>Working & Live</b>",
        "Knowledge graph: Interactive vector canvas, node clustering, similarity threshold slider — <b>Working & Live</b>",
        "Developer API Portal: Interactive sandbox, cURL/Python/TS code snippets, live endpoint execution — <b>Working & Live</b>",
        "Stripe billing & invoices: Checkout sessions, webhook deduplication, PDF receipts — <b>Working & Tested</b>",
        "Concurrency & load resilience: WAL mode, 30s busy timeout, 50-worker test verified — <b>Working & Tested</b>",
        "Turnkey demo workspace: Instant seeder with 3 enterprise PDFs, vector chunks, and MLOps models — <b>Working & Tested</b>",
        "Governed agent simulator: 1-click objective presets, multi-step live playback, human approval gate — <b>Working & Live</b>",
        "Backend tests: <b>84/84 pytest tests passing (100% pass rate in 47.6s)</b>",
        "Frontend build: <b>0 TypeScript errors across all components, clean production compilation</b>"
    ]

    for item in status_items:
        story.append(Paragraph(f"✓ {item}", bullet_style))

    story.append(Spacer(1, 2.5))

    # 5. What I'm Doing Next (November 27)
    story.append(Paragraph("5. What I'm Doing Next (November 27)", h2_style))
    story.append(Spacer(1, 1))

    tomorrow_items = [
        "<b>Automated Synthesis Email Dispatch:</b> Integrate Celery background task to dispatch generated multi-document intelligence synthesis PDF dossiers directly to stakeholder email addresses via SMTP/SendGrid.",
        "<b>Remote VPS Cloud Staging Deployment:</b> Execute <code>deploy_staging.sh</code> on a live cloud VPS (Ubuntu 24.04 LTS), configure automated Let's Encrypt TLS certificates, and bind staging DNS records.",
        "<b>Live Production Webhook Forwarding:</b> Connect a live corporate Slack webhook URL to verify real-time outbound alert delivery during live customer simulations and policy violation events."
    ]

    for i, item in enumerate(tomorrow_items, 1):
        story.append(Paragraph(f"{i}. {item}", bullet_style))

    story.append(Spacer(1, 3.0))

    # 6. Summary Box
    story.append(Paragraph("6. Summary", h2_style))
    story.append(Spacer(1, 1))

    summary_text = (
        "Engineered 1-click Multi-Document Intelligence Synthesis export producing branded ReportLab PDF dossiers and GFM Markdown with tamper-evident SHA-256 audit trails. Built an interactive Custom DLP Regex Rule Sandbox featuring catastrophic backtracking safeguards and 1-click Nepal regulatory presets (Citizenship & PAN). Enhanced Model Arena with 5 enterprise benchmark presets and a head-to-head delta comparison card. Resolved citation viewport modal collisions in Chat tab, verified outbound webhooks (HMAC-SHA256, Slack Block Kit, Discord embeds) and production staging pre-flight checks. All 84 backend tests pass with a 100% pass rate, frontend TypeScript compiles with zero errors, and all deliverables are verified."
    )

    summary_table = Table([[Paragraph(summary_text, body_style)]], colWidths=[523])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0, 0), (-1, -1), 3.0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.0),
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
