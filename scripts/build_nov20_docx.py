import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=60, bottom=60, left=80, right=80):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="D1D5DB", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def build_docx():
    doc = docx.Document()

    # Set Margins: 0.5 inches all around (36 pt)
    for section in doc.sections:
        section.top_margin = Inches(0.4)
        section.bottom_margin = Inches(0.4)
        section.left_margin = Inches(0.5)
        section.right_margin = Inches(0.5)
        section.header_distance = Inches(0.2)
        section.footer_distance = Inches(0.2)

    # Base Colors
    COLOR_PRIMARY = RGBColor(0x1E, 0x1B, 0x4B)   # Deep Navy
    COLOR_DARK = RGBColor(0x11, 0x18, 0x27)      # Slate 900
    COLOR_TEXT = RGBColor(0x37, 0x41, 0x51)      # Slate 700
    COLOR_GREEN = RGBColor(0x15, 0x80, 0x3D)     # Emerald 700

    # Styles
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(9.5)
    normal_style.font.color.rgb = COLOR_TEXT

    # --- PAGE 1 ---
    # Title
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(2)
    r_title = p_title.add_run("Bytherix EAM — Daily Progress Report")
    r_title.bold = True
    r_title.font.size = Pt(17)
    r_title.font.color.rgb = COLOR_DARK

    # Meta
    p_meta = doc.add_paragraph()
    p_meta.paragraph_format.space_before = Pt(0)
    p_meta.paragraph_format.space_after = Pt(8)
    r_m1 = p_meta.add_run("Developer: ")
    r_m1.font.size = Pt(9)
    r_m2 = p_meta.add_run("Rustam Timalsina")
    r_m2.bold = True
    r_m2.font.size = Pt(9)
    r_m3 = p_meta.add_run("   |   Date: ")
    r_m3.font.size = Pt(9)
    r_m4 = p_meta.add_run("November 20, 2026")
    r_m4.bold = True
    r_m4.font.size = Pt(9)
    r_m5 = p_meta.add_run("   |   Project: ")
    r_m5.font.size = Pt(9)
    r_m6 = p_meta.add_run("Bytherix EAM (Enterprise AI Management Platform)")
    r_m6.bold = True
    r_m6.font.size = Pt(9)

    # 1. Overview
    p_h1 = doc.add_paragraph()
    p_h1.paragraph_format.space_before = Pt(2)
    p_h1.paragraph_format.space_after = Pt(3)
    r_h1 = p_h1.add_run("1. Overview of Today's Work")
    r_h1.bold = True
    r_h1.font.size = Pt(11)
    r_h1.font.color.rgb = COLOR_PRIMARY

    p_intro = doc.add_paragraph("Today I focused on four main tasks for the Bytherix platform: getting our staging setup running in Docker containers, adding a live usage meter for API keys on the dashboard, setting up GitHub Actions to automatically run tests on every push, and building a model response time monitor with a 1-click rollback button:")
    p_intro.paragraph_format.space_before = Pt(0)
    p_intro.paragraph_format.space_after = Pt(3)
    p_intro.paragraph_format.line_spacing = 1.1

    overview_bullets = [
        ("Docker Setup for Staging: ", "Wrote a docker-compose.yml file to run our entire app in Docker (PostgreSQL with pgvector, Redis, MinIO S3, FastAPI backend, Next.js frontend, and Nginx proxy). Optimized the Next.js Dockerfile with multi-stage builds so the final image size dropped from 1.5GB down to ~150MB, and set up Nginx to handle routing and streaming."),
        ("API Key Usage & Limits UI: ", "Built ApiKeyUsageCard.tsx on the API Keys page. It shows users a visual progress bar of how many tokens they have used this month against their quota, their rate limit SLA, and active key count. Also updated the keys table to show when each key was last used or if it has never been used."),
        ("Automated GitHub Actions CI/CD: ", "Added .github/workflows/ci.yml. Whenever code is pushed to GitHub, it automatically spins up a clean Linux runner, runs all 54 backend tests, builds the frontend, and checks our Docker config to make sure nothing is broken before merging."),
        ("Model Speed Monitoring & Rollback: ", "Added ModelDriftMonitorCard.tsx and a backend endpoint at /models/{id}/monitoring. It checks whether a deployed AI model's response time is slowing down compared to its baseline. If latency spikes, it shows an alert and provides a single button to roll back to the previous stable version without downtime."),
        ("Testing & Git Commits: ", "Verified everything locally and pushed 3 clean commits to GitHub main (664965a, 89777a0, and bc1da41).")
    ]

    for title, desc in overview_bullets:
        bp = doc.add_paragraph(style='List Bullet')
        bp.paragraph_format.space_before = Pt(1)
        bp.paragraph_format.space_after = Pt(2)
        bp.paragraph_format.line_spacing = 1.08
        rt = bp.add_run(title)
        rt.bold = True
        bp.add_run(desc)

    # 2. Key Accomplishments
    p_h2 = doc.add_paragraph()
    p_h2.paragraph_format.space_before = Pt(4)
    p_h2.paragraph_format.space_after = Pt(3)
    r_h2 = p_h2.add_run("2. Key Accomplishments")
    r_h2.bold = True
    r_h2.font.size = Pt(11)
    r_h2.font.color.rgb = COLOR_PRIMARY

    # Table
    table_rows = [
        ("Feature / Task", "Status", "Implementation Details"),
        ("Docker Compose Setup", "Completed", "Created docker-compose.yml running Postgres (pgvector), Redis 7, MinIO S3, FastAPI, Next.js, and Nginx together."),
        ("Next.js Dockerfile Optimization", "Completed", "Built a 3-stage frontend/Dockerfile using Next.js standalone output, cutting image size from 1.5GB down to ~150MB."),
        ("Nginx Reverse Proxy", "Completed", "Configured nginx/nginx.conf to direct port 80 to Next.js (port 3000) and /api/* to FastAPI (port 8000) with SSE streaming support."),
        ("API Key Usage Meter", "Completed", "Created ApiKeyUsageCard.tsx with a visual token bar, SLA rate limit badge, and warning alerts when usage passes 80%."),
        ("Key Activity Timestamps", "Completed", "Updated tenant_context.py to save last_used_at timestamps in the database whenever an API key is authenticated."),
        ("Automated GitHub CI/CD", "Completed", "Added .github/workflows/ci.yml that runs pytest, Next.js build, and Docker validation on every push and pull request."),
        ("Model Latency Monitoring", "Completed", "Added GET /api/v1/models/{id}/monitoring to compare live response times against baselines and flag slowdowns."),
        ("1-Click Model Rollback", "Completed", "Added ModelDriftMonitorCard.tsx with health status badges and an instant rollback button to restore stable releases.")
    ]

    table = doc.add_table(rows=len(table_rows), cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table)

    col_widths = [Inches(1.8), Inches(1.0), Inches(4.7)]
    for r_idx, row in enumerate(table_rows):
        tr = table.rows[r_idx]
        is_head = (r_idx == 0)
        bg = "F1F5F9" if is_head else ("FFFFFF" if r_idx % 2 == 1 else "F8FAFC")
        for c_idx, text in enumerate(row):
            cell = tr.cells[c_idx]
            cell.width = col_widths[c_idx]
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=40, bottom=40, left=60, right=60)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP
            cp = cell.paragraphs[0]
            cp.paragraph_format.space_before = Pt(1)
            cp.paragraph_format.space_after = Pt(1)
            cp.paragraph_format.line_spacing = 1.05
            cr = cp.add_run(text)
            cr.font.size = Pt(8.5)
            if is_head:
                cr.bold = True
                cr.font.color.rgb = COLOR_DARK
            elif c_idx == 0:
                cr.bold = True
                cr.font.color.rgb = COLOR_DARK
            elif c_idx == 1:
                cr.bold = True
                cr.font.color.rgb = COLOR_GREEN

    # PAGE BREAK TO PAGE 2
    doc.add_page_break()

    # --- PAGE 2 ---
    # 3. Issues Encountered & Fixes (in Normal Document Body, NOT in Header!)
    p_h3 = doc.add_paragraph()
    p_h3.paragraph_format.space_before = Pt(0)
    p_h3.paragraph_format.space_after = Pt(3)
    r_h3 = p_h3.add_run("3. Issues Encountered & How I Fixed Them")
    r_h3.bold = True
    r_h3.font.size = Pt(11)
    r_h3.font.color.rgb = COLOR_PRIMARY

    issues_bullets = [
        ("Timezone Comparison Error in Tests: ", "While running API key expiration tests, SQLite threw an error (TypeError: can't compare offset-naive and offset-aware datetimes) because SQLite dates had no timezone while Python was using UTC. ", "Fix: ", "Updated tenant_context.py to check whether timezone info exists before comparing, so it works seamlessly on both SQLite and Postgres."),
        ("Next.js Build Warnings & Loose Types: ", "The production frontend build failed due to unused Lucide icon imports in ModelPromotionModal.tsx and WebhookManagerCard.tsx, plus a loose type in api.ts. ", "Fix: ", "Removed the unused imports, added proper TypeScript typing for the webhook payload, and set up standalone output in next.config.mjs."),
        ("Stale Background Process on Port 8000: ", "After writing the new /models/{id}/monitoring route, test requests kept returning 404 because an older Uvicorn server was still running in the background holding the port. ", "Fix: ", "Terminated the old process with taskkill, restarted Uvicorn, and verified that requests return 200 OK."),
        ("TypeScript Name Mismatch: ", "The frontend build threw an error in ModelDriftMonitorCard.tsx because it imported RegisteredModel instead of RegisteredModelDetail. ", "Fix: ", "Corrected the import name to match api.ts, and all 10 pages compiled cleanly.")
    ]

    for title, desc, f_title, fix in issues_bullets:
        bp = doc.add_paragraph(style='List Bullet')
        bp.paragraph_format.space_before = Pt(1)
        bp.paragraph_format.space_after = Pt(2.5)
        bp.paragraph_format.line_spacing = 1.08
        rt = bp.add_run(title)
        rt.bold = True
        bp.add_run(desc)
        rf = bp.add_run(f_title)
        rf.italic = True
        rf.bold = True
        bp.add_run(fix)

    # 4. Current System Status
    p_h4 = doc.add_paragraph()
    p_h4.paragraph_format.space_before = Pt(5)
    p_h4.paragraph_format.space_after = Pt(3)
    r_h4 = p_h4.add_run("4. Current System Status")
    r_h4.bold = True
    r_h4.font.size = Pt(11)
    r_h4.font.color.rgb = COLOR_PRIMARY

    status_items = [
        ("Multi-tenant authentication, 8 user roles, single-use 7-day invite tokens — ", "Done"),
        ("Grounded Hybrid RAG with page citations & real-time streaming — ", "Done & Live"),
        ("Enterprise Billing Ledger with downloadable PDF tax receipts — ", "Done"),
        ("Multi-container Docker Compose staging environment & Nginx proxy — ", "Done & Verified"),
        ("Live API Key usage meters & active key tracking — ", "Done & Verified"),
        ("Automated GitHub Actions CI/CD testing pipeline — ", "Done & Verified"),
        ("Model speed monitoring & 1-click rollback engine — ", "Done & Verified"),
        ("Automated Test Suite — ", "100% Passing (54/54 backend tests, Next.js build clean)"),
        ("Git Repository — ", "Clean working tree pushed to origin/main (Commit: bc1da41)")
    ]

    for item, status in status_items:
        bp = doc.add_paragraph()
        bp.paragraph_format.left_indent = Inches(0.2)
        bp.paragraph_format.space_before = Pt(0.5)
        bp.paragraph_format.space_after = Pt(1.5)
        r_check = bp.add_run("✓  ")
        r_check.bold = True
        r_check.font.color.rgb = COLOR_GREEN
        bp.add_run(item)
        r_s = bp.add_run(status)
        r_s.bold = True

    # 5. Plan for Tomorrow
    p_h5 = doc.add_paragraph()
    p_h5.paragraph_format.space_before = Pt(5)
    p_h5.paragraph_format.space_after = Pt(3)
    r_h5 = p_h5.add_run("5. Plan for Tomorrow (November 21)")
    r_h5.bold = True
    r_h5.font.size = Pt(11)
    r_h5.font.color.rgb = COLOR_PRIMARY

    tomorrow_items = [
        ("1. Stripe Payment Webhook Integration: ", "Connect our HMAC webhook handler to live Stripe test keys to handle automatic subscription renewals."),
        ("2. Coordinate with Sujal: ", "Help Sujal connect his Developer API portal components to our live backend endpoints."),
        ("3. Docker Staging Smoke Testing: ", "Run full end-to-end tests across the containers in the Docker staging setup.")
    ]

    for title, desc in tomorrow_items:
        bp = doc.add_paragraph()
        bp.paragraph_format.left_indent = Inches(0.2)
        bp.paragraph_format.space_before = Pt(1)
        bp.paragraph_format.space_after = Pt(2)
        rt = bp.add_run(title)
        rt.bold = True
        bp.add_run(desc)

    # 6. Summary Box
    p_h6 = doc.add_paragraph()
    p_h6.paragraph_format.space_before = Pt(5)
    p_h6.paragraph_format.space_after = Pt(3)
    r_h6 = p_h6.add_run("6. Summary")
    r_h6.bold = True
    r_h6.font.size = Pt(11)
    r_h6.font.color.rgb = COLOR_PRIMARY

    # Single cell summary table
    s_table = doc.add_table(rows=1, cols=1)
    s_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(s_table, color="CBD5E1", sz="6")
    cell = s_table.rows[0].cells[0]
    cell.width = Inches(7.5)
    set_cell_background(cell, "F8FAFC")
    set_cell_margins(cell, top=60, bottom=60, left=80, right=80)
    sp = cell.paragraphs[0]
    sp.paragraph_format.space_before = Pt(2)
    sp.paragraph_format.space_after = Pt(2)
    sp.paragraph_format.line_spacing = 1.15
    sr = sp.add_run(
        "Today went very well. We set up our staging environment in Docker with Nginx, added live usage meters for API keys so users know when they are near their limits, configured GitHub Actions to test our code automatically on every push, and added a model latency monitor with a quick rollback button. All 54 tests are passing, the frontend builds cleanly, and all changes are pushed to GitHub main."
    )
    sr.font.size = Pt(9.2)

    # Save
    dest_local = r"C:\InternProject\bytherix-eam\Bytherix_EAM_Daily_Progress_Report_Nov20.docx"
    dest_desktop = r"C:\Users\asus\OneDrive\Desktop\Bytherix_EAM_Daily_Progress_Report_Nov20.docx"
    doc.save(dest_local)
    doc.save(dest_desktop)
    print(f"Saved docx to: {dest_local}")
    print(f"Saved docx to: {dest_desktop}")

if __name__ == "__main__":
    build_docx()
