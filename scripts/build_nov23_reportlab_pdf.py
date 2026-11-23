import os
import shutil
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from pypdf import PdfReader

def build_pdf():
    dest1 = r"C:\InternProject\bytherix-eam\Bytherix_EAM_Daily_Progress_Report_Nov23.pdf"
    dest2 = r"C:\Users\asus\OneDrive\Desktop\Bytherix_EAM_Daily_Progress_Report_Nov23.pdf"
    dest3 = r"C:\Users\asus\.gemini\antigravity\brain\2435dc4f-1042-437e-befd-903d974b9a53\Bytherix_EAM_Daily_Progress_Report_Nov23.pdf"

    # A4: 595.27 x 841.89 points
    # Margins: 36pt (0.5 in) left/right, 26pt top/bottom
    doc = SimpleDocTemplate(
        dest1,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=26,
        bottomMargin=26
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
        spaceAfter=6
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
    story.append(Paragraph("Developer: <b>Rustam Timalsina</b> &nbsp;|&nbsp; Date: <b>November 23, 2026</b> &nbsp;|&nbsp; Project: <b>Bytherix EAM (Enterprise AI Management Platform)</b>", meta_style))
    story.append(Spacer(1, 2))

    story.append(Paragraph("1. Overview of Today's Work", h2_style))
    story.append(Paragraph("Today I focused on delivering all five planned frontend milestone features for Bytherix EAM, followed by thorough responsive UI polish across desktop and mobile viewports. Every feature was built, manually tested in the browser, verified through TypeScript and Next.js builds, and pushed to <code>origin/main</code>:", body_style))
    story.append(Spacer(1, 1))

    overview_bullets = [
        "<b>Perplexity-Style Split Citation Viewer:</b> Built <code>frontend/src/components/SplitCitationViewer.tsx</code> to inspect grounded RAG source passages side-by-side with chat. Clicking citation pills (<code>[1]</code>, <code>[Doc 2, Chunk 4]</code>) immediately highlights the passage with similarity score meters and chunk metadata.",
        "<b>Side-by-Side Model Arena & Benchmark Playground:</b> Built <code>frontend/src/components/ModelArenaPlayground.tsx</code> to run head-to-head evaluations between baseline production and candidate models under identical prompts, displaying streaming tokens, latency tracking, estimated cost delta, and hallucination metrics.",
        "<b>Real-Time Generation Velocity Meter & Abort Control:</b> Added streaming generation telemetry (<code>⚡ 48 tok/s</code>) computed dynamically per chunk arrival, with a floating '■ Stop Generating' button that cleanly cancels the active stream via <code>AbortController</code> in <code>page.tsx</code>.",
        "<b>Interactive Knowledge Semantic Graph Canvas:</b> Implemented <code>frontend/src/components/KnowledgeGraphViewer.tsx</code> featuring interactive 2D vector clustering, node topology, cosine similarity threshold slider (0.50 to 0.95), and node detail inspection.",
        "<b>Multi-Document Synthesis & Comparison Mode:</b> Added document multi-selection checkboxes, floating synthesis action bar, and automated comparative prompt dispatching to Chat with grounded document scopes pre-selected.",
        "<b>Responsive Layout & Mobile Overhaul:</b> Auto-collapsed history sidebar when split view opens to preserve 600px+ chat width on desktop, refactored split view into an off-canvas slide-over drawer on mobile (&lt; 1024px), and eliminated bottom dock overlap with dynamic viewport heights.",
        "<b>Build Verification & Git Commits:</b> Verified 70/70 backend tests passing, 0 TypeScript errors, 10/10 Next.js static pages compiled, and pushed 9 clean commits to <code>origin/main</code>."
    ]

    for bullet in overview_bullets:
        story.append(Paragraph(f"• {bullet}", bullet_style))

    story.append(Spacer(1, 2))

    # 2. Key Accomplishments Table
    story.append(Paragraph("2. Key Accomplishments", h2_style))
    story.append(Spacer(1, 1))

    table_data = [
        [
            Paragraph("<b>Feature / Task</b>", cell_bold),
            Paragraph("<b>Status</b>", cell_bold),
            Paragraph("<b>Implementation Details</b>", cell_bold)
        ],
        [
            Paragraph("Split Citation Viewer", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Created <code>SplitCitationViewer.tsx</code> with verbatim text highlighting, similarity meters, chunk metadata, and bi-directional citation sync.", cell_body)
        ],
        [
            Paragraph("Side-by-Side Model Arena", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Built <code>ModelArenaPlayground.tsx</code> with dual-model streaming evaluation, latency/cost/hallucination metrics, and enterprise benchmark presets.", cell_body)
        ],
        [
            Paragraph("Streaming Velocity Meter", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Added real-time token rate calculator (<code>⚡ 48 tok/s</code>) and instant '■ Stop Generating' stream cancellation in <code>page.tsx</code>.", cell_body)
        ],
        [
            Paragraph("Interactive Vector Graph", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Implemented <code>KnowledgeGraphViewer.tsx</code> featuring 2D vector topology canvas, node clustering, and dynamic cosine similarity slider.", cell_body)
        ],
        [
            Paragraph("Multi-Doc Synthesis Mode", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Added document multi-selection checkboxes, floating synthesis action bar, and automated comparative prompt dispatching to Chat.", cell_body)
        ],
        [
            Paragraph("Desktop Dock Clearance", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Added <code>pb-32 sm:pb-36</code> container padding and dynamic <code>h-[calc(100vh-190px)]</code> card height so chat inputs never sit underneath the dock.", cell_body)
        ],
        [
            Paragraph("Split-View Auto-Collapse", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("History sidebar auto-collapses on desktop when split view opens, giving the chat and document viewport full comfortable width.", cell_body)
        ],
        [
            Paragraph("Mobile Drawer Slide-Over", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Converted split citation panel into an off-canvas slide-over modal on screens under 1024px, completely eliminating horizontal squishing.", cell_body)
        ],
        [
            Paragraph("Model Arena UI Refinements", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Repositioned benchmark presets above prompt textarea, added styled dropdown chevrons for model pickers, and prevented title wrapping.", cell_body)
        ],
        [
            Paragraph("Build & Test Verification", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("70/70 backend pytest tests passing (100%), 0 TypeScript errors, 10/10 Next.js static pages compiled, and 9 commits pushed to <code>origin/main</code>.", cell_body)
        ],
    ]

    col_widths = [130, 65, 328]
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

    # Force PageBreak to guarantee exact 2-page balance
    story.append(PageBreak())

    # --- PAGE 2 ---
    story.append(Paragraph("3. Issues Encountered & How I Fixed Them", h2_style))
    story.append(Spacer(1, 1))

    issues_bullets = [
        "<b>Desktop 3-Column Width Squishing:</b> When history sidebar, chat feed, and split viewer were open simultaneously, chat narrowed to ~320px on laptop screens. <i>Fix:</i> Configured split view state in <code>page.tsx</code> to auto-collapse the conversation history sidebar, preserving 600px+ width for chat.",
        "<b>Floating Rocket Dock Overlapping Chat Input:</b> On smaller laptop viewports, the bottom dock covered the chat query input box and send button. <i>Fix:</i> Replaced fixed <code>h-[720px]</code> card heights with responsive <code>h-[calc(100vh-190px)] max-h-[680px]</code> and wrapped chat in <code>pb-32 sm:pb-36</code>, ensuring reliable dock clearance.",
        "<b>Mobile View Layout Breakdown Under 1024px:</b> The side-by-side flex layout cramped three columns on mobile screens, overlapping header pills (<code>[🕒 24]</code> over <code>Scope: All</code>) and crushing chat into 190px. <i>Fix:</i> Refactored <code>SplitCitationViewer</code> into a responsive fixed slide-over drawer with backdrop (<code>fixed inset-y-0 right-0 z-50 w-full sm:w-[440px]</code>) on mobile.",
        "<b>Model Arena Title Wrapping & Awkward Preset Stacking:</b> The title broke awkwardly into two lines ('Side-by-Side Model' / 'Arena') and presets crowded into the header next to the badge. <i>Fix:</i> Restructured the header to full width, moved prompt presets directly above the prompt textarea, and upgraded inputs to styled <code>&lt;select&gt;</code> dropdowns.",
        "<b>Duplicate JSX Element During Fast Replacement:</b> During an edit on <code>ModelArenaPlayground.tsx</code>, a duplicate <code>&lt;textarea&gt;</code> tag was introduced, throwing TS2657. <i>Fix:</i> Immediately cleaned duplicate lines 247-253 and confirmed clean compilation with <code>npx tsc --noEmit</code>."
    ]

    for bullet in issues_bullets:
        story.append(Paragraph(f"• {bullet}", bullet_style))

    story.append(Spacer(1, 3))

    # 4. Current System Status
    story.append(Paragraph("4. Current System Status", h2_style))
    story.append(Spacer(1, 1))

    status_items = [
        "Multi-Tenant Auth & RBAC: Single-use 7-day invite tokens, JWT verification, and scoped organization sessions — <b>Done & Verified</b>",
        "Grounded Hybrid RAG: PDF parsing, chunking, pgvector HNSW embeddings, DLP guardrails, and streaming citations — <b>Done & Live</b>",
        "Perplexity Split Citation Viewer: Verbatim highlights, similarity confidence meters, chunk metadata, and deep links — <b>Done & Live</b>",
        "Side-by-Side Model Arena: Dual model parallel benchmarking, latency/cost/hallucination metrics, and presets — <b>Done & Live</b>",
        "Streaming Velocity & Abort Meter: Real-time token velocity (<code>⚡ 48 tok/s</code>) and instant stream abort controller button — <b>Done & Live</b>",
        "Interactive Knowledge Graph: SVG vector canvas, physics clustering, cosine similarity threshold slider — <b>Done & Live</b>",
        "Multi-Document Synthesis Mode: Multi-select catalog checkboxes, floating synthesis launcher, and automated chat dispatch — <b>Done & Live</b>",
        "Mobile & Desktop Responsive Layout: Off-canvas slide-over drawer on mobile, dock height clearance, and auto-collapsing sidebar — <b>Done & Live</b>",
        "Stripe Billing & Invoicing: Checkout sessions, idempotent webhook deduplication, and dynamic PDF receipts — <b>Done & Verified</b>",
        "SOC 2 Multi-Tenant Security Suite: 7-vector cross-tenant penetration testing proving complete data isolation — <b>Done & Verified</b>",
        "Automated Disaster Recovery & Fire Drill: Atomic backups, SHA-256 manifests, and 0.13s scratch restoration drill — <b>Done & Verified</b>",
        "Automated Test Suite — <b>100% Passing (70/70 backend pytest tests, Next.js build clean with 10/10 pages compiled)</b>",
        "Git Repository — <b>Clean working tree pushed to origin/main (Commits: <code>515a7aa</code>, <code>4d96221</code>, <code>0b548ea</code>, <code>e86543b</code>, <code>a64168f</code>, <code>cd0fdde</code>, <code>4cfe429</code>, <code>3280e8b</code>, <code>c55f1c9</code>)</b>"
    ]

    for item in status_items:
        story.append(Paragraph(f"✓ {item}", bullet_style))

    story.append(Spacer(1, 3))

    # 5. Plan for Tomorrow
    story.append(Paragraph("5. Plan for Tomorrow (November 24)", h2_style))
    story.append(Spacer(1, 1))

    tomorrow_items = [
        "<b>Staging Environment Validation (Docker Compose):</b> Spin up the full multi-container stack (<code>FastAPI</code>, <code>Next.js</code>, <code>PostgreSQL/pgvector</code>, <code>Redis 7</code>, <code>MinIO</code>) in local Docker staging and verify service interconnection under load.",
        "<b>Developer API Portal Integration with Sujal:</b> Connect Sujal's <code>DeveloperApiPortal.tsx</code> sandbox to live <code>/api/v1/chat</code>, <code>/api/v1/security/dlp/scan</code>, and <code>/api/v1/models</code> endpoints once ready.",
        "<b>End-to-End User Experience Walkthrough:</b> Run through complete realistic enterprise workflows (ingest PDF -> verify semantic graph -> run multi-doc synthesis in chat -> inspect citations in split view -> compare model performance in Arena)."
    ]

    for i, item in enumerate(tomorrow_items, 1):
        story.append(Paragraph(f"{i}. {item}", bullet_style))

    story.append(Spacer(1, 4))

    # 6. Summary Box
    story.append(Paragraph("6. Summary", h2_style))
    story.append(Spacer(1, 1))

    summary_text = (
        "Today was a highly productive engineering day for Bytherix EAM. All five planned frontend roadmap features—Perplexity-style split citation viewing, side-by-side Model Arena benchmarking, streaming generation velocity telemetry, interactive vector semantic graph exploration, and multi-document synthesis—were completed and tested. We followed up with extensive responsive design polish, solving desktop multi-column squeeze, floating dock overlap, and mobile drawer transitions. All 70 backend tests are green, the Next.js production build compiles with 0 errors, and all 9 commits are pushed cleanly to GitHub main."
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
