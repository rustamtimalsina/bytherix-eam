# Bytherix EAM - Enterprise System Architecture & Data Model Guide
**Specification Reference:** Section 1 (*Architecture Overview*), Section 6 (*Data Model and Multi-Tenancy*), Section 19.1 (*Final Deliverables*)  
**Platform Version:** 1.0.0 Enterprise  
**Author:** Bytherix Technology Pvt. Ltd.

---

## 1. High-Level Platform Architecture

Bytherix EAM is architected as a modular, high-throughput service designed for predictable scaling, multi-tenant isolation, and operational reliability.

```
                           +------------------------------------------+
                           |           Frontend Layer                 |
                           |   Next.js 14 (App Router) + Tailwind     |
                           |   TypeScript + Lucide Icons + Radix UI   |
                           +--------------------+---------------------+
                                                |
                                        REST / JSON (TLS 1.3)
                                                |
                           +--------------------v---------------------+
                           |            API Gateway Layer             |
                           |   FastAPI (Python 3.12) + Pydantic v2    |
                           |   Rate Limiter (Token Bucket)            |
                           |   JWT / API Key Tenant Authenticator     |
                           +--------------------+---------------------+
                                                |
               +--------------------------------+--------------------------------+
               |                                |                                |
+--------------v---------------+ +--------------v---------------+ +--------------v---------------+
|  Document & RAG Subsystem    | |   MLOps Model Subsystem      | |  Billing & Webhook Subsystem |
|  - PDF Ingestion & Parsing   | |  - Registry & Versioning     | |  - Stripe Checkout Sessions  |
|  - SHA-256 Chunk Dedup       | |  - KS-Test Drift Monitoring  | |  - Idempotent Webhooks       |
|  - HNSW Vector Similarity    | |  - 1-Click Atomic Rollback   | |  - Dynamic PDF Tax Invoices  |
|  - Zero-Leak DLP Shield      | |  - Live Prediction API       | |  - Dead-Letter Delivery Queue|
+--------------+---------------+ +--------------+---------------+ +--------------+---------------+
               |                                |                                |
               +--------------------------------+--------------------------------+
                                                |
                           +--------------------v---------------------+
                           |            Data & State Layer            |
                           |   PostgreSQL 16 + pgvector (or SQLite)   |
                           |   SQLAlchemy 2.0 ORM + Alembic           |
                           |   Redis 7 (Celery Queue + Caching)       |
                           |   MinIO / AWS S3 (Object Storage)        |
                           +------------------------------------------+
```

---

## 2. Comprehensive Multi-Tenant Data Model (18 Tables)

All persistent entities inherit or reference `organization_id` to guarantee tenant isolation at the database layer.

```
+---------------------------------------------------------------------------------------------------+
|                                       ORGANIZATION (Tenant Root)                                  |
|   id, name, slug, plan_tier (starter/pro/enterprise), token_quota, created_at                     |
+---+-------------------+-------------------+-------------------+-------------------+---------------+
    |                   |                   |                   |                   |
    v                   v                   v                   v                   v
+------------+     +------------+      +------------+      +------------+      +------------+
|   USERS    |     | DOCUMENTS  |      | REGISTERED |      |  API KEYS  |      |  WEBHOOK   |
| id, email, |     | id, title, |      |   MODELS   |      | id, key_   |      | SUBSCRIPT. |
| password_  |     | file_hash, |      | id, name,  |      | hash, name,|      | id, url,   |
| hash, role |     | status,    |      | framework, |      | scopes,    |      | events,    |
+-----+------+     | total_pages|      | task_type  |      | rate_limit |      | secret     |
      |            +-----+------+      +-----+------+      +------------+      +-----+------+
      |                  |                   |                                       |
      v                  v                   v                                       v
+------------+     +------------+      +------------+                          +------------+
| MEMBERSHIPS|     | DOCUMENT_  |      |   MODEL_   |                          |  WEBHOOK_  |
| user_id,   |     |   CHUNKS   |      |  VERSIONS  |                          | DELIVERIES |
| org_id,    |     | doc_id,    |      | version,   |                          | id, status,|
| role       |     | chunk_idx, |      | is_active, |                          | attempts,  |
+------------+     | embedding, |      | metrics    |                          | payload    |
                   | token_count|      +-----+------+                          +------------+
                   +------------+            |
                                             v
                                       +------------+
                                       | PREDICTION |
                                       |   LOGS     |
                                       | input_data,|
                                       | output,    |
                                       | latency_ms |
                                       +------------+
```

### Complete Schema Catalog:
1. `organizations`: Multi-tenant boundary, plan tier, quota limits.
2. `users`: Global identity, credentials, active state.
3. `memberships`: Organization-user relational binding with RBAC (`owner`, `admin`, `member`).
4. `api_keys`: SHA-256 hashed program access tokens with granular scopes.
5. `documents`: Ingested file metadata, MIME type, SHA-256 integrity hash, processing state.
6. `document_chunks`: Extracted text slices, page indices, token counts, vector embeddings.
7. `usage_records`: High-resolution token and inference consumption metering for billing.
8. `conversation_sessions`: State tracking for multi-turn RAG chat sessions.
9. `conversation_messages`: Message history, role (`user`/`assistant`), citations.
10. `agent_executions`: Autonomous agent execution state, goal, status (`running`/`success`/`failed`).
11. `agent_step_traces`: Granular trace steps, tool calls, and outputs.
12. `registered_models`: Catalog of deployed machine learning models.
13. `model_versions`: Artifact paths, hyperparameters, deployment status (`staging`/`production`).
14. `prediction_logs`: Inference telemetry, input distributions, latency measurements.
15. `audit_logs`: Immutable security audit trail with actor IDs, actions, and timestamps.
16. `dead_letter_jobs`: Failed background queue jobs with stack traces and retry counts.
17. `webhook_subscriptions`: Outbound webhook endpoints, HMAC signing secrets, subscribed topics.
18. `webhook_deliveries`: Delivery attempt logs, HTTP response status codes, payload snapshots.

---

## 3. Core Data Workflows

### 3.1 Grounded RAG Ingestion & Query Lifecycle
1. **Upload & Parse:** User uploads PDF -> PyPDF extracts text -> Deduplication check via file SHA-256.
2. **Chunk & Embed:** Text chunked using sliding window -> High-dimensional embeddings computed (`text-embedding-3-small`, 1536 dims).
3. **Index:** Embeddings saved to database with HNSW vector index.
4. **Query:** User submits prompt -> Query vectorized -> Cosine similarity search scoped by `WHERE organization_id = :org_id`.
5. **DLP & Guardrails:** Zero-Leak DLP Shield scrubs PII and credentials from prompt context.
6. **Synthesize & Cite:** LLM generates grounded answer with verified source chunk citations.

### 3.2 MLOps Drift Detection & Rollback Flow
1. **Live Inference:** Client calls `/api/v1/models/{id}/predict` -> Prediction served, input features logged to `prediction_logs`.
2. **Drift Computation:** Background job computes two-sample Kolmogorov-Smirnov test against baseline training dataset.
3. **Alert Trigger:** If p-value < 0.05, system flags model version as drifted and notifies operators.
4. **1-Click Rollback:** Operator clicks "Emergency Rollback" -> Server promotes previous stable version to active production atomically with zero downtime.

### 3.3 Stripe Billing & Idempotent Webhook Flow
1. **Checkout:** Client requests upgrade -> Backend creates Stripe Checkout Session.
2. **Signed Webhook:** Stripe sends `checkout.session.completed` signed with HMAC-SHA256 secret.
3. **Deduplication:** `WebhookIdempotencyRegistry` checks event ID to prevent duplicate credit processing.
4. **Entitlement Upgrade:** Tenant plan tier updated to `pro` or `enterprise`, quotas refreshed.
5. **PDF Receipt Generation:** Dynamic tax receipt PDF generated with tenant verification and made available for secure download.
