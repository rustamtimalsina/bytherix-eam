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
    story.append(Paragraph("Developer: <b>Rustam Timalsina</b> &nbsp;|&nbsp; Date: <b>November 23, 2026</b> &nbsp;|&nbsp; Project: <b>Bytherix EAM</b>", meta_style))
    story.append(Spacer(1, 2))

    story.append(Paragraph("1. What I Worked On Today", h2_style))
    story.append(Paragraph("Today was all about finishing up the remaining frontend features on our roadmap and sorting out the UI layout issues on both desktop and mobile:", body_style))
    story.append(Spacer(1, 1))

    overview_bullets = [
        "<b>Split-screen citation viewer:</b> Built <code>SplitCitationViewer.tsx</code>. Clicking citation numbers like <code>[1]</code> in the chat now opens the exact source document on the right with the cited text highlighted, similarity percentage, and chunk details.",
        "<b>Side-by-side Model Arena:</b> Added <code>ModelArenaPlayground.tsx</code> inside the Models page. You can pick Model A and Model B, type a prompt (or click one of the quick presets), and run them together to compare outputs, response times, token counts, and cost differences.",
        "<b>Generation speed meter & stop button:</b> In <code>page.tsx</code>, added a live speed indicator (<code>48 tok/s</code>) while the model is answering, plus a red 'Stop Generating' button that immediately kills the stream using an AbortController.",
        "<b>Knowledge semantic graph:</b> Added <code>KnowledgeGraphViewer.tsx</code> to visualize document embeddings on an SVG canvas. You can drag and zoom, adjust the similarity threshold slider (0.50 to 0.95) to see document clusters, and click nodes to view chunk text.",
        "<b>Multi-document compare & synthesis:</b> Added checkboxes next to documents in the library. When you select multiple documents, a floating bar pops up with a 'Synthesize' button that automatically creates a comparison prompt and opens it in chat.",
        "<b>Responsive UI & Mobile Fixes:</b> Tested the app in the browser and found several layout issues on laptop and mobile screens. Auto-collapsed the chat history sidebar when split view opens so chat doesn't get squeezed, turned the split viewer into a slide-out drawer on mobile screens (&lt;1024px), gave the bottom dock proper clearance so it doesn't cover the chat input, and cleaned up the Model Arena header.",
        "<b>Tests and Builds:</b> All 70 backend tests are passing, TypeScript compiles with 0 errors, and the Next.js production build succeeded. Everything is committed and pushed to <code>main</code>."
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
            Paragraph("Split Citation Viewer", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Created <code>SplitCitationViewer.tsx</code> with passage highlights, similarity score, and chunk metadata.", cell_body)
        ],
        [
            Paragraph("Side-by-Side Model Arena", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Created <code>ModelArenaPlayground.tsx</code> with dual streaming, latency/cost/hallucination metrics, and presets.", cell_body)
        ],
        [
            Paragraph("Speed Meter & Stop Button", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Added live token velocity counter (<code>48 tok/s</code>) and stream abort button in <code>page.tsx</code>.", cell_body)
        ],
        [
            Paragraph("Knowledge Graph Visualizer", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Built <code>KnowledgeGraphViewer.tsx</code> with 2D vector clustering and similarity threshold slider.", cell_body)
        ],
        [
            Paragraph("Multi-Doc Compare Mode", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Added document selection checkboxes, floating action bar, and one-click comparative prompt dispatch to chat.", cell_body)
        ],
        [
            Paragraph("Bottom Dock Clearance", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Added container padding (<code>pb-32 sm:pb-36</code>) and adjusted card heights so inputs don't get hidden behind the dock.", cell_body)
        ],
        [
            Paragraph("Auto-Collapsing History", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("History sidebar now closes automatically when opening split view on desktop so chat keeps good width.", cell_body)
        ],
        [
            Paragraph("Mobile Drawer View", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Converted split view into an off-canvas slide-out drawer on phones/tablets so it doesn't crush the chat.", cell_body)
        ],
        [
            Paragraph("Model Arena UI Polish", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Fixed title line break, moved presets above the prompt textarea, and replaced inputs with styled dropdowns.", cell_body)
        ],
        [
            Paragraph("Testing & Verification", cell_bold),
            Paragraph("<font color='#15803d'><b>Completed</b></font>", cell_body),
            Paragraph("Ran pytest (70/70 passing), checked Next.js build (10/10 pages), and pushed all 9 commits to GitHub main.", cell_body)
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
        "<b>Chat column was way too narrow on laptop screens:</b> When history, chat, and the new split viewer were all open side by side, the chat box shrank to ~320px and words wrapped weirdly. I fixed this by having the chat history sidebar auto-collapse as soon as split view opens. That keeps the chat at 600px+ width.",
        "<b>Bottom floating dock covered the send button:</b> On smaller laptop screens, the floating navigation dock sat right over the chat input textarea and send button. I removed fixed card heights in favor of <code>h-[calc(100vh-190px)]</code> and added <code>pb-32</code> bottom padding so the input always stays visible above the dock.",
        "<b>Mobile layout broke completely under 1024px:</b> Trying to fit 3 panels side by side on a phone screen squeezed the chat down to 190px, and the history count pill overlapped the scope dropdown. I changed the mobile layout so <code>SplitCitationViewer</code> becomes a slide-out drawer with a dark backdrop instead of sharing horizontal space.",
        "<b>Model Arena title wrapped and presets were messy:</b> The title 'Side-by-Side Model Arena' broke across two lines, and the benchmark preset buttons were shoved into the top right header. I gave the title full width, moved the presets directly above the prompt box where they are easier to click, and switched to clean <code>&lt;select&gt;</code> dropdowns for picking models.",
        "<b>Duplicate tag during quick code edit:</b> In <code>ModelArenaPlayground.tsx</code>, an accidental duplicate <code>&lt;textarea&gt;</code> tag caused a TypeScript error (<code>TS2657</code>). I caught it right away with <code>tsc</code>, deleted lines 247-253, and the build went green."
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
        "Multi-tenant auth & RBAC: Single-use 7-day invite tokens, JWT verification, org-scoped sessions — <b>Working</b>",
        "Hybrid RAG pipeline: PDF parsing, chunking, pgvector HNSW embeddings, DLP scan, and streaming citations — <b>Working & Live</b>",
        "Split citation viewer: Verbatim highlights, similarity confidence score, chunk details — <b>Working & Live</b>",
        "Model Arena: Dual-model parallel testing, latency/cost/hallucination metrics, presets — <b>Working & Live</b>",
        "Velocity meter & stop button: Live tokens/sec display and instant stream cancellation — <b>Working & Live</b>",
        "Knowledge graph: Interactive vector canvas, node clustering, similarity slider — <b>Working & Live</b>",
        "Multi-doc synthesis: Checkbox selection, floating launcher, auto-prompt to chat — <b>Working & Live</b>",
        "Desktop & mobile responsive layout: Mobile slide-out drawer, bottom dock clearance, auto-collapsing sidebar — <b>Working & Live</b>",
        "Stripe billing & invoices: Checkout sessions, webhook deduplication, PDF receipts — <b>Working & Tested</b>",
        "Multi-tenant security tests: 7-vector cross-tenant penetration test suite — <b>Passing (100%)</b>",
        "Disaster recovery: Atomic backups, SHA-256 manifests, 0.13s restore fire drill — <b>Working & Tested</b>",
        "Backend tests: <b>70/70 pytest tests passing</b>",
        "Frontend build: <b>0 TypeScript errors, 10/10 static pages built</b>",
        "GitHub repo: <b>Clean working tree, up to date with origin/main</b>"
    ]

    for item in status_items:
        story.append(Paragraph(f"✓ {item}", bullet_style))

    story.append(Spacer(1, 3))

    # 5. What I'm Doing Tomorrow
    story.append(Paragraph("5. What I'm Doing Tomorrow (November 24)", h2_style))
    story.append(Spacer(1, 1))

    tomorrow_items = [
        "<b>Production Deployment & Cloud Prep:</b> Set up production environment configs, SSL/TLS reverse proxy settings, and domain routing (<code>app.bytherix.com</code>).",
        "<b>Backend Concurrency & Load Testing:</b> Run load tests on the FastAPI backend (simulating 50+ concurrent streaming RAG queries) to check pgvector query speeds and Redis rate-limiting under pressure.",
        "<b>Automated Security & DLP Webhook Alerts:</b> Wire up real-time webhook/email notifications when DLP guardrails catch sensitive data leaks or when a model exceeds latency thresholds.",
        "<b>Clean Demo Workspace Setup:</b> Pre-load a fresh demo tenant with sample enterprise policies, calibrated model benchmarks, and active API keys ready for stakeholder presentations."
    ]

    for i, item in enumerate(tomorrow_items, 1):
        story.append(Paragraph(f"{i}. {item}", bullet_style))

    story.append(Spacer(1, 4))

    # 6. Summary Box
    story.append(Paragraph("6. Summary", h2_style))
    story.append(Spacer(1, 1))

    summary_text = (
        "Wrapped up all 5 roadmap frontend features today: split-screen citation viewer, side-by-side Model Arena, streaming speed meter with stop button, interactive vector knowledge graph, and multi-document synthesis. Tested everything in the browser and fixed several responsive UI issues on desktop and mobile (dock overlap, narrow chat columns, and mobile layout breaking). All 70 backend tests are passing, the frontend builds cleanly with zero errors, and all commits are pushed to main."
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
