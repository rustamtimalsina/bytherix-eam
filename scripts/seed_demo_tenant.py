#!/usr/bin/env python3
"""
Bytherix EAM — Turnkey Enterprise Demo Workspace Seeder
=======================================================
Provisions an authoritative enterprise demo organization ('Bytherix Global Corp')
with pre-indexed technical compliance documents, 1536-dimensional semantic
embeddings, MLOps model registry telemetry, scoped API keys, and pre-authenticated
admin credentials ready for stakeholder presentations, evaluator testing, and live demos.

Usage:
    python scripts/seed_demo_tenant.py [--reset] [--org-name "Bytherix Global Corp"]
"""

import argparse
import hashlib
import io
import json
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Tuple

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.organization import Organization
from app.db.models.user import User
from app.db.models.membership import Membership
from app.db.models.api_key import APIKey
from app.db.models.document import Document
from app.db.models.chunk import DocumentChunk
from app.db.models.model_registry import RegisteredModel, ModelVersion, PredictionLog
from app.db.models.usage import UsageRecord
from app.db.models.audit import AuditLog
from app.core.security import get_password_hash, create_access_token, hash_api_key
from app.integrations.embeddings.provider import embedding_provider
from app.integrations.object_storage.s3 import storage_service
from app.services.audit_service import AuditService


# --- Sample Enterprise Documents & Chunks ---

DOC_1_TITLE = "Bytherix EAM Enterprise Technical Specification & Platform Architecture"
DOC_1_FILENAME = "Bytherix_EAM_Enterprise_Specification.pdf"
DOC_1_CHUNKS: List[Tuple[int, str]] = [
    (
        1,
        "Bytherix EAM Enterprise Architecture - Section 3: Multi-Tenant Isolation & Role-Based Access Control (RBAC).\n"
        "The Bytherix Enterprise AI Management platform enforces strict tenant boundaries at the database, storage, and API gateway layers. "
        "Every request derives its organization context directly from validated cryptographic JWT signatures or SHA-256 hashed API keys.\n"
        "Supported organizational roles include:\n"
        "1. Organization Owner: Full system administration, billing, team invitations, and model promotions.\n"
        "2. Organization Admin: Document management, team member administration, and audit inspection.\n"
        "3. AI/ML Engineer: Model registry management, inference benchmarking, and candidate version creation.\n"
        "4. Data Analyst: RAG knowledge queries, analytical reporting, and non-destructive operations.\n"
        "5. Viewer: Read-only access to documents and audit summaries in restricted Auditor Mode.\n"
        "Cross-tenant access attempts are rejected with HTTP 403 Forbidden and recorded as security audit alerts."
    ),
    (
        2,
        "Bytherix EAM Enterprise Architecture - Section 7.4 & 8.2: Grounded Hybrid RAG Intelligence & Quota Metering.\n"
        "RAG intelligence in Bytherix EAM uses hybrid vector semantic retrieval combined with lexical keyword matching. "
        "Documents are chunked into 500-token semantic segments with stable page numbering.\n"
        "Under the Enterprise tier:\n"
        "- Document Storage Limit: Up to 1,000 active documents per organization.\n"
        "- Monthly RAG Token Budget: 10,000,000 tokens per billing cycle with automated overage notifications.\n"
        "- Pre-Execution Quota Validation: Token allowances and storage limits are validated before executing expensive LLM generations or embeddings.\n"
        "- Quota Boundary Handling: When an organization approaches 90% allowance, administrative webhooks fire to prevent unexpected service disruption.\n"
        "All AI answers are strictly grounded in retrieved chunks with exact document titles and page citations."
    ),
    (
        3,
        "Bytherix EAM Enterprise Architecture - Section 5 & 10: Governed Agent Workflows & Human-in-the-Loop Approval Gates.\n"
        "Autonomous AI agent workflows in Bytherix operate under strict governance constraints:\n"
        "1. Allowlisted Tool Execution: Agents can only invoke verified tools (DocumentSearchTool, QuotaCheckTool, KnowledgeAuditReportTool, SensitiveExportTool).\n"
        "2. Bounded Step Budgets: Workflows are strictly capped at 5 steps to eliminate runaway execution loops.\n"
        "3. Human-in-the-Loop Authorization Gate: Whenever a high-privilege consequential action is proposed (e.g. SensitiveExportTool for external data export), the execution state pauses immediately in status 'pending_approval'.\n"
        "4. Real-Time Notification: An approval_required event is broadcast across the Server-Sent Events (SSE) notification bus.\n"
        "5. Resumption: An Organization Owner or Admin must review the proposed parameters and explicitly approve or reject the action. Resumption triggers immutable audit logging."
    ),
    (
        4,
        "Bytherix EAM Enterprise Architecture - Section 6 & 11: MLOps Model Registry, Lifecycle Deployment & Rollback.\n"
        "The Bytherix MLOps Registry manages machine learning model lifecycles across four formal stages:\n"
        "- Draft: Initial model artifact registration and benchmark evaluation.\n"
        "- Staging: Pre-production verification and latency testing.\n"
        "- Production: Active routed inference endpoint with token metering.\n"
        "- Archived: Deprecated model versions preserved for audit compliance.\n"
        "When a release candidate version is promoted to Production, the previously active production model is automatically demoted to Staging to ensure continuous single-route stability. "
        "Operators can execute a 1-click rollback to immediately restore the prior stable release if drift or anomalies occur.\n"
        "Every prediction meters input and output tokens against the tenant's organizational quota."
    ),
    (
        5,
        "Bytherix EAM Enterprise Architecture - Section 10 & 13: Immutable Compliance Audit Trail & Prometheus Telemetry.\n"
        "Bytherix EAM complies with SOC 2 Type II and ISO 27001 audit standards through an append-only immutable event ledger:\n"
        "- Audit Coverage: All authentication events, role changes, API key operations, document indexing, agent approvals, and model promotions record actor_id, actor_email, IP address, severity, and full JSON parameter details.\n"
        "- Telemetry & Observability: The platform exposes standard Prometheus metrics (/metrics) tracking:\n"
        "  - Latency percentiles: p50, p95, and p99 response times.\n"
        "  - Throughput: Requests per minute and active concurrent in-flight requests.\n"
        "  - Error Rates: 4xx client errors and 5xx upstream gateway anomalies.\n"
        "  - LLM Circuit Breaker: State telemetry (closed, open, half-open) with fast-fail fallback monitoring.\n"
        "Audit ledgers can be exported to CSV or inspected via the interactive administrative console."
    ),
]

DOC_2_TITLE = "Bytherix Zero-Trust Information Security & DLP Governance Manual"
DOC_2_FILENAME = "Bytherix_Zero_Trust_DLP_Governance.pdf"
DOC_2_CHUNKS: List[Tuple[int, str]] = [
    (
        1,
        "Bytherix Information Security Policy - Section 1: Data Loss Prevention (DLP) Shield & Pre-LLM Interception.\n"
        "The Bytherix DLP Shield intercepts all prompt payloads and file uploads before transmission to downstream AI models. "
        "The inspection pipeline executes eight parallel pattern scanners covering:\n"
        "1. Cloud & SaaS API Keys: AWS Secret Keys (AKIA...), Stripe Live Keys (sk_live...), OpenAI secret keys (sk-...), and GitHub PATs.\n"
        "2. Financial Data: Credit card numbers validated with the Luhn checksum algorithm, bank routing numbers, and SWIFT codes.\n"
        "3. Personally Identifiable Information (PII): Social Security Numbers (SSN), government ID numbers, email addresses, and phone numbers.\n"
        "When a pattern matches, the sensitive content is redacted with tokenized placeholders like [REDACTED_API_KEY] and logged to the tenant's security ledger."
    ),
    (
        2,
        "Bytherix Information Security Policy - Section 2: Zero-Trust API Key Authentication & Scope Boundaries.\n"
        "All programmatic interactions with Bytherix EAM require cryptographic authentication using high-entropy API keys (bx_live_...).\n"
        "- One-Way Hash Storage: The database stores only the SHA-256 hash of the key. The raw secret is returned to the user exactly once at creation time.\n"
        "- Prefix Matching: The first 12 characters (e.g. bx_live_demo...) are indexed as a hint prefix for fast lookup without exposing the secret.\n"
        "- Granular Scopes: Keys can be scoped to specific subsystems (chat, models, documents, usage, security:dlp). Attempts to access unauthorized scopes return HTTP 403 Forbidden.\n"
        "- Automatic Revocation & Rotation: API keys support configurable expiration windows and immediate one-click revocation from the Developer Portal."
    ),
    (
        3,
        "Bytherix Information Security Policy - Section 3: Webhook Alerting & Real-Time Security Notifications.\n"
        "When critical security anomalies occur, Bytherix EAM dispatches instant webhook notifications to tenant endpoints:\n"
        "- DLP Violation Events: Emits security.dlp_violation payloads including violation count, redacted preview, actor IP, and timestamp.\n"
        "- Slack Block Kit & Discord Embeds: Outgoing alerts format rich visual warning cards with color-coded severity headers, entity summaries, and direct incident links.\n"
        "- SLA Drift Alerts: Emits model.sla_breach events when p95 inference latency exceeds established baselines by 20% or error rates exceed 5%.\n"
        "Webhook deliveries include HMAC SHA-256 signatures in the X-Bytherix-Signature header for receiver verification."
    ),
    (
        4,
        "Bytherix Information Security Policy - Section 4: Cryptographic Key Storage & Secrets Management.\n"
        "All database credentials, third-party provider tokens, and encryption keys are stored outside the codebase in hardened environment variables and cloud key management systems (AWS KMS / HashiCorp Vault).\n"
        "Database connections use TLS 1.3 encryption in transit with strict certificate validation. "
        "Sensitive tenant session data is isolated using cryptographic salt keys rotated every 90 days."
    ),
]

DOC_3_TITLE = "HIPAA & SOC 2 Type II Enterprise Compliance Framework"
DOC_3_FILENAME = "Bytherix_HIPAA_SOC2_Compliance_Framework.pdf"
DOC_3_CHUNKS: List[Tuple[int, str]] = [
    (
        1,
        "Bytherix Compliance Framework - Section 1: HIPAA Protected Health Information (PHI) Handling.\n"
        "Bytherix EAM facilitates compliance with HIPAA Security and Privacy Rules for healthcare enterprise deployments:\n"
        "- PHI De-identification: Natural language medical records uploaded to the knowledge base are automatically scrubbed of HIPAA 18 Safe Harbor identifiers.\n"
        "- Dedicated Encryption: At-rest storage for document chunks utilizes AES-256 GCM authenticated encryption.\n"
        "- Business Associate Agreements (BAA): Bytherix platform infrastructure operates within HIPAA-compliant VPC configurations with dedicated network segregation.\n"
        "- Zero Training Guarantee: Customer documents and query histories are never utilized for foundational model retraining or shared across tenant boundaries."
    ),
    (
        2,
        "Bytherix Compliance Framework - Section 2: SOC 2 Type II Security, Availability & Confidentiality Trust Principles.\n"
        "The Bytherix platform undergoes annual third-party SOC 2 Type II examinations assessing operational controls:\n"
        "- Principle 1 (Security): Strict role-based access control, automated dependency vulnerability patching, and Web Application Firewall (WAF) rate limiting.\n"
        "- Principle 2 (Availability): Multi-region automated PostgreSQL backups with verified 0.13-second restore fire drills and Redis replication.\n"
        "- Principle 3 (Confidentiality): Cryptographic tenant partitioning ensuring zero data bleed across multi-tenant vector indexes and cache layers."
    ),
    (
        3,
        "Bytherix Compliance Framework - Section 3: Data Retention, Right-to-be-Forgotten & Audit Log Immutability.\n"
        "In accordance with GDPR Article 17 and enterprise data governance mandates:\n"
        "- Atomic Document Deletion: When an administrator deletes a document, all associated vector embeddings, chunk text, and cached summaries are purged in a single atomic transaction.\n"
        "- Anti-Resurrection Guard: Document versions maintain sequential generation counters to prevent stale cache entries from repopulating search indexes.\n"
        "- Append-Only Audit Integrity: Audit records cannot be modified or deleted via API endpoints. Exported audit archives include SHA-256 cryptographic manifests for tamper verification."
    ),
]


def render_pdf_bytes(title: str, chunks_data: List[Tuple[int, str]]) -> bytes:
    """Render a clean enterprise PDF from chunk data using ReportLab."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=45,
            leftMargin=45,
            topMargin=45,
            bottomMargin=45
        )

        styles = getSampleStyleSheet()
        header_style = ParagraphStyle(
            'HStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=11,
            textColor=colors.HexColor('#4f46e5')
        )
        subhead_style = ParagraphStyle(
            'SubStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#64748b')
        )
        title_style = ParagraphStyle(
            'TStyle',
            parent=styles['Title'],
            fontName='Helvetica-Bold',
            fontSize=16,
            leading=20,
            textColor=colors.HexColor('#0f172a'),
            alignment=0,
            spaceAfter=6
        )
        section_style = ParagraphStyle(
            'SecStyle',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=14,
            textColor=colors.HexColor('#1e293b'),
            spaceBefore=4,
            spaceAfter=8
        )
        body_style = ParagraphStyle(
            'BStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=14,
            textColor=colors.HexColor('#334155'),
            spaceAfter=6
        )
        footer_style = ParagraphStyle(
            'FStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#94a3b8'),
            alignment=1
        )

        story = []
        for idx, (page_num, text) in enumerate(chunks_data):
            story.append(Paragraph("BYTHERIX TECHNOLOGY PVT. LTD. &bull; ENTERPRISE DEMO KNOWLEDGE BASE", header_style))
            story.append(Paragraph("Official Enterprise Policy &amp; Architecture Reference", subhead_style))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceBefore=6, spaceAfter=12))

            if idx == 0:
                story.append(Paragraph(title, title_style))
                story.append(Spacer(1, 4))

            lines = text.strip().split("\n")
            first_line = lines[0] if lines else ""
            story.append(Paragraph(first_line, section_style))
            story.append(Spacer(1, 4))

            for line in lines[1:]:
                if line.strip():
                    clean_line = line.strip().replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                    story.append(Paragraph(clean_line, body_style))
                    story.append(Spacer(1, 3))

            story.append(Spacer(1, 15))
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e2e8f0'), spaceBefore=8, spaceAfter=6))
            story.append(Paragraph(f"Confidential &bull; Bytherix Enterprise Demo &bull; Page {page_num} of {len(chunks_data)}", footer_style))

            if idx < len(chunks_data) - 1:
                story.append(PageBreak())

        doc.build(story)
        return buffer.getvalue()
    except Exception:
        # Fallback to simple PDF writer if ReportLab has issues
        import pypdf
        writer = pypdf.PdfWriter()
        for _ in range(len(chunks_data)):
            writer.add_blank_page(width=612, height=792)
        buf = io.BytesIO()
        writer.write(buf)
        return buf.getvalue()


def seed_document(
    db: Session,
    organization_id: str,
    user_id: str,
    title: str,
    filename: str,
    chunks_data: List[Tuple[int, str]]
) -> Document:
    """Idempotently seed a document with real ReportLab PDF bytes, storage, and 1536-dim embeddings."""
    pdf_bytes = render_pdf_bytes(title, chunks_data)
    checksum = hashlib.sha256(pdf_bytes).hexdigest()

    existing = db.query(Document).filter(
        Document.organization_id == organization_id,
        Document.title == title,
        Document.status != "deleting"
    ).first()

    if existing:
        # Update existing
        storage_service.upload_file(io.BytesIO(pdf_bytes), existing.object_key, "application/pdf")
        existing.file_size_bytes = len(pdf_bytes)
        existing.checksum = checksum
        existing.status = "ready"
        db.commit()
        db.refresh(existing)
        return existing

    doc_id = str(uuid.uuid4())
    object_key = f"tenants/{organization_id}/documents/{doc_id}.pdf"
    storage_service.upload_file(io.BytesIO(pdf_bytes), object_key, "application/pdf")

    doc = Document(
        id=doc_id,
        organization_id=organization_id,
        owner_id=user_id,
        title=title,
        filename=filename,
        object_key=object_key,
        file_size_bytes=len(pdf_bytes),
        mime_type="application/pdf",
        checksum=checksum,
        status="ready",
        page_count=len(chunks_data),
        version=1
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Insert vector chunks
    for idx, (page_num, chunk_text) in enumerate(chunks_data):
        vec = embedding_provider.get_embedding(chunk_text)
        chunk_obj = DocumentChunk(
            document_id=doc.id,
            organization_id=organization_id,
            chunk_index=idx,
            page_number=page_num,
            content=chunk_text,
            token_count=len(chunk_text.split()),
            metadata_json=json.dumps({"title": title, "page": page_num}),
            embedding=vec
        )
        db.add(chunk_obj)

    db.commit()
    db.refresh(doc)
    return doc


def seed_demo_tenant(
    db: Session,
    org_name: str = "Bytherix Global Corp",
    org_slug: str = "bytherix-global-demo",
    admin_email: str = "demo.admin@bytherix.com",
    admin_name: str = "Demo Admin",
    admin_password: str = "DemoPassword123!",
    rustam_email: str = "rustam@bytherix.com",
    reset: bool = False
) -> dict:
    """
    Main orchestration function to seed or reset the demo tenant.
    Returns a dictionary of provisioned resources and sample credentials.
    """
    print("=" * 70)
    print("  BYTHERIX EAM — ONE-CLICK ENTERPRISE DEMO WORKSPACE SEEDER")
    print("=" * 70)

    # 1. Handle Reset if requested
    if reset:
        existing_org = db.query(Organization).filter(Organization.slug == org_slug).first()
        if existing_org:
            print(f"[RESET] Purging existing demo organization: {existing_org.name} ({org_slug})...")
            db.delete(existing_org)
            db.commit()
            print("[RESET] Clean slate ready.")

    # 2. Provision or retrieve Organization
    org = db.query(Organization).filter(Organization.slug == org_slug).first()
    if not org:
        org = Organization(
            name=org_name,
            slug=org_slug,
            plan_tier="enterprise",
            is_active=True
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        print(f"[OK] Created Organization: {org.name} (ID: {org.id}, Tier: {org.plan_tier})")
    else:
        org.plan_tier = "enterprise"
        org.is_active = True
        db.commit()
        db.refresh(org)
        print(f"[EXISTS] Organization verified: {org.name} (ID: {org.id})")

    # 3. Provision Demo Admin User
    admin_user = db.query(User).filter(User.email == admin_email).first()
    if not admin_user:
        admin_user = User(
            email=admin_email,
            full_name=admin_name,
            hashed_password=get_password_hash(admin_password),
            is_active=True,
            is_platform_operator=False
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        print(f"[OK] Created Admin User: {admin_user.email} (ID: {admin_user.id})")
    else:
        admin_user.hashed_password = get_password_hash(admin_password)
        admin_user.is_active = True
        db.commit()
        print(f"[EXISTS] Admin User credentials refreshed: {admin_user.email}")

    # Ensure Admin Membership (role: organization_owner)
    admin_mem = db.query(Membership).filter(
        Membership.user_id == admin_user.id,
        Membership.organization_id == org.id
    ).first()
    if not admin_mem:
        admin_mem = Membership(
            user_id=admin_user.id,
            organization_id=org.id,
            role="organization_owner",
            status="active"
        )
        db.add(admin_mem)
        db.commit()
        print(f"[OK] Granted {admin_user.email} -> 'organization_owner' role in {org.name}")
    else:
        admin_mem.role = "organization_owner"
        db.commit()

    # 4. Ensure Rustam Timalsina has access to demo org as owner
    rustam_user = db.query(User).filter(User.email == rustam_email).first()
    if rustam_user:
        rustam_mem = db.query(Membership).filter(
            Membership.user_id == rustam_user.id,
            Membership.organization_id == org.id
        ).first()
        if not rustam_mem:
            rustam_mem = Membership(
                user_id=rustam_user.id,
                organization_id=org.id,
                role="organization_owner",
                status="active"
            )
            db.add(rustam_mem)
            db.commit()
            print(f"[OK] Granted {rustam_user.email} -> 'organization_owner' role in demo org")
        else:
            rustam_mem.role = "organization_owner"
            db.commit()

    # 5. Provision Predictable Demo API Key
    demo_raw_key = "bx_live_demo_enterprise_master_9941a"
    demo_key_hash = hash_api_key(demo_raw_key)

    api_key_rec = db.query(APIKey).filter(APIKey.key_hash == demo_key_hash).first()
    if not api_key_rec:
        api_key_rec = APIKey(
            organization_id=org.id,
            user_id=admin_user.id,
            name="Enterprise Master Demo Key",
            prefix=demo_raw_key[:12] + "...",
            key_hash=demo_key_hash,
            scopes="*",
            is_revoked=False,
            expires_at=datetime.now(timezone.utc) + timedelta(days=365)
        )
        db.add(api_key_rec)
        db.commit()
        print(f"[OK] Created Master API Key: {demo_raw_key[:16]}... (Scopes: *)")
    else:
        api_key_rec.is_revoked = False
        db.commit()
        print(f"[EXISTS] Master API Key verified: {demo_raw_key[:16]}...")

    # 6. Seed 3 High-Fidelity Enterprise Documents & Vector Embeddings
    print("\n[DOCUMENTS] Seeding authoritative enterprise knowledge documents...")
    docs_to_seed = [
        (DOC_1_TITLE, DOC_1_FILENAME, DOC_1_CHUNKS),
        (DOC_2_TITLE, DOC_2_FILENAME, DOC_2_CHUNKS),
        (DOC_3_TITLE, DOC_3_FILENAME, DOC_3_CHUNKS),
    ]

    seeded_docs = []
    total_chunks = 0
    for title, fname, chunks in docs_to_seed:
        doc = seed_document(
            db=db,
            organization_id=org.id,
            user_id=admin_user.id,
            title=title,
            filename=fname,
            chunks_data=chunks
        )
        seeded_docs.append(doc)
        total_chunks += len(chunks)
        print(f"  -> {doc.title} ({len(chunks)} chunks, {doc.file_size_bytes:,} bytes, Status: {doc.status})")

    # 7. Seed MLOps Model Registry & Prediction Logs
    print("\n[MLOPS] Seeding Model Registry baseline models & telemetry...")
    model_specs = [
        {
            "name": "gpt-4o-enterprise",
            "desc": "Primary enterprise reasoning & multi-doc synthesis model with strict citation grounding.",
            "version": "v2.1.0",
            "stage": "production",
            "accuracy": 0.98,
            "latency": 145.0,
            "params": json.dumps({"temperature": 0.5, "max_tokens": 4096, "top_p": 0.95})
        },
        {
            "name": "gpt-4o-mini-fast",
            "desc": "High-throughput, sub-second latency model for triage, DLP verification, and intent routing.",
            "version": "v1.4.0",
            "stage": "staging",
            "accuracy": 0.92,
            "latency": 62.0,
            "params": json.dumps({"temperature": 0.3, "max_tokens": 2048, "top_p": 0.9})
        },
        {
            "name": "claude-3-5-sonnet-enterprise",
            "desc": "Candidate challenger model for Model Arena comparisons and coding evaluation.",
            "version": "v1.0.0",
            "stage": "evaluation",
            "accuracy": 0.96,
            "latency": 190.0,
            "params": json.dumps({"temperature": 0.7, "max_tokens": 4096, "top_p": 0.9})
        }
    ]

    seeded_models = []
    for spec in model_specs:
        m = db.query(RegisteredModel).filter(
            RegisteredModel.organization_id == org.id,
            RegisteredModel.name == spec["name"]
        ).first()

        if not m:
            m = RegisteredModel(
                organization_id=org.id,
                name=spec["name"],
                description=spec["desc"],
                task_type="text-generation"
            )
            db.add(m)
            db.flush()

        v = db.query(ModelVersion).filter(
            ModelVersion.registered_model_id == m.id,
            ModelVersion.version == spec["version"]
        ).first()

        if not v:
            chk = hashlib.sha256(f"{spec['name']}:{spec['version']}:{spec['params']}".encode()).hexdigest()
            v = ModelVersion(
                registered_model_id=m.id,
                organization_id=org.id,
                version=spec["version"],
                lifecycle_stage=spec["stage"],
                artifact_checksum=chk,
                parameters=spec["params"],
                accuracy_score=spec["accuracy"],
                latency_p95_ms=spec["latency"],
                promoted_by="rustam@bytherix.com",
                promoted_at=datetime.now(timezone.utc)
            )
            db.add(v)
            db.flush()

        m.active_version_id = v.id
        seeded_models.append((m, v))
        print(f"  -> Model: {m.name} [{v.version}] — Stage: {v.lifecycle_stage} (p95: {v.latency_p95_ms}ms)")

    db.commit()

    # Seed 10 realistic Prediction Logs for production model to populate telemetry graphs
    prod_version = seeded_models[0][1]
    existing_logs = db.query(PredictionLog).filter(PredictionLog.model_version_id == prod_version.id).count()
    if existing_logs < 10:
        sample_latencies = [118.0, 134.5, 142.0, 129.0, 155.0, 121.0, 148.0, 138.0, 160.0, 125.0]
        sample_tokens = [420, 850, 610, 940, 1200, 380, 790, 640, 1100, 530]
        for idx in range(10):
            p_log = PredictionLog(
                organization_id=org.id,
                model_version_id=prod_version.id,
                input_payload=json.dumps({"prompt": f"Demo benchmark question {idx + 1}", "top_k": 3}),
                prediction_output=json.dumps({"answer": f"Simulated grounded response {idx + 1}"}),
                latency_ms=sample_latencies[idx],
                tokens_consumed=sample_tokens[idx],
                status="success"
            )
            db.add(p_log)
        db.commit()
        print(f"[OK] Seeded 10 prediction telemetry logs for {seeded_models[0][0].name}")

    # 8. Seed Metered Usage Records
    existing_usage = db.query(UsageRecord).filter(UsageRecord.organization_id == org.id).count()
    if existing_usage < 5:
        usage_events = [
            ("rag_chat", 2400, 1800, 600, "gpt-4o-enterprise"),
            ("rag_chat", 3100, 2200, 900, "gpt-4o-enterprise"),
            ("embedding", 1536, 1536, 0, "bytherix-embed-v1"),
            ("rag_chat", 4500, 3200, 1300, "gpt-4o-enterprise"),
            ("embedding", 2048, 2048, 0, "bytherix-embed-v1"),
        ]
        for event_type, qty, prompt_tok, comp_tok, model_name in usage_events:
            rec = UsageRecord(
                organization_id=org.id,
                user_id=admin_user.id,
                event_type=event_type,
                unit="tokens",
                quantity=qty,
                prompt_tokens=prompt_tok,
                completion_tokens=comp_tok,
                model=model_name,
                is_billable=True
            )
            db.add(rec)
        db.commit()
        print(f"[OK] Seeded metered token usage records for {org.name}")

    # 9. Seed Initial Audit Log
    AuditService.seed_initial_audit_if_empty(db, org.id, user_email=admin_user.email)
    print(f"[OK] Verified audit compliance event trail")

    # 10. Generate Fresh JWT Bearer Token (7-day duration)
    admin_jwt = create_access_token(
        subject=admin_user.id,
        organization_id=org.id,
        role="owner",
        expires_delta=timedelta(days=7)
    )

    # Summary Result Object
    summary = {
        "organization_id": org.id,
        "organization_name": org.name,
        "organization_slug": org.slug,
        "plan_tier": org.plan_tier,
        "admin_email": admin_user.email,
        "admin_password": admin_password,
        "api_key": demo_raw_key,
        "jwt_token": admin_jwt,
        "documents_count": len(seeded_docs),
        "chunks_count": total_chunks,
        "models_count": len(seeded_models),
    }

    print("\n" + "=" * 70)
    print("  DEMO TENANT WORKSPACE READY FOR PRESENTATION & EVALUATION")
    print("=" * 70)
    print(f" Organization:    {org.name} ({org.slug})")
    print(f" Plan Tier:       {org.plan_tier.upper()}")
    print(f" Admin Login:     {admin_user.email}")
    print(f" Password:        {admin_password}")
    print(f" Master API Key:  {demo_raw_key}")
    print(f" Documents:       {len(seeded_docs)} enterprise PDFs ({total_chunks} chunks indexed)")
    print(f" Models Active:   {len(seeded_models)} registered models in Registry / Arena")
    print("-" * 70)
    print(" Sample Curl Command (Ready to Run):")
    print(f'   curl -X POST "http://localhost:8000/api/v1/chat" \\')
    print(f'     -H "Content-Type: application/json" \\')
    print(f'     -H "X-API-Key: {demo_raw_key}" \\')
    print(f'     -d \'{{"question": "What roles are supported in Bytherix RBAC?", "top_k": 3}}\'')
    print("-" * 70)
    print(" 7-Day Admin JWT Token (for Postman / Swagger / localStorage):")
    print(f" {admin_jwt[:60]}...[TRUNCATED]")
    print("=" * 70 + "\n")

    return summary


def main():
    parser = argparse.ArgumentParser(description="Seed turnkey Bytherix EAM enterprise demo workspace.")
    parser.add_argument("--reset", action="store_true", help="Wipe and recreate the demo organization cleanly.")
    parser.add_argument("--org-name", default="Bytherix Global Corp", help="Display name of demo organization.")
    parser.add_argument("--org-slug", default="bytherix-global-demo", help="Unique slug for demo organization.")
    parser.add_argument("--admin-email", default="demo.admin@bytherix.com", help="Email for demo administrator.")
    parser.add_argument("--admin-name", default="Demo Admin", help="Full name for demo administrator.")
    parser.add_argument("--admin-password", default="DemoPassword123!", help="Password for demo administrator.")
    parser.add_argument("--rustam-email", default="rustam@bytherix.com", help="Email for org owner access.")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        seed_demo_tenant(
            db=db,
            org_name=args.org_name,
            org_slug=args.org_slug,
            admin_email=args.admin_email,
            admin_name=args.admin_name,
            admin_password=args.admin_password,
            rustam_email=args.rustam_email,
            reset=args.reset
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
