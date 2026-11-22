# Bytherix EAM - REST API Reference & Developer Integration Guide
**Specification Reference:** Section 7 (*API Surface and Schemas*), Section 19.1 (*Final Deliverables*)  
**Base URL:** `http://localhost:8000/api/v1`  
**OpenAPI Specification:** Available interactively at `http://localhost:8000/docs` (Swagger) and `http://localhost:8000/redoc` (ReDoc)

---

## 1. Authentication
All API requests (except public health, login, and registration endpoints) must include either:
1. **User JWT Bearer Token:**
   ```http
   Authorization: Bearer <jwt_access_token>
   ```
2. **Enterprise API Key:**
   ```http
   X-API-Key: byth_live_...
   ```

---

## 2. Core Endpoint Index

### 2.1 Authentication & Multi-Tenant Management
* `POST /auth/register`: Create a new user account and root organization.
* `POST /auth/login`: Authenticate with email/password and obtain JWT token.
* `GET /auth/me`: Get current authenticated user profile and active organization.
* `POST /organizations/invite`: Invite team members with role (`admin`, `member`).
* `GET /organizations/members`: List active workspace members.

### 2.2 Documents & Grounded RAG
* `POST /documents/upload`: Upload and automatically ingest a PDF document (multi-part form).
* `GET /documents`: List all ingested documents for the authenticated tenant.
* `GET /documents/{document_id}`: Retrieve document metadata and processing status.
* `DELETE /documents/{document_id}`: Delete a document and purge all associated vector chunks.
* `POST /chat`: Query the grounded RAG assistant with vector retrieval, citations, and DLP scrubbing.

### 2.3 MLOps Model Registry & Prediction
* `GET /models`: List all registered ML models for the organization.
* `POST /models`: Register a new model catalog entry.
* `POST /models/{model_id}/versions`: Upload/register a new model version (`staging`/`production`).
* `POST /models/{model_id}/versions/{version_id}/promote`: Promote candidate version to active production.
* `POST /models/{model_id}/versions/{version_id}/rollback`: Trigger instant emergency 1-click rollback.
* `GET /models/{model_id}/drift-summary`: Retrieve statistical Kolmogorov-Smirnov drift analytics.
* `POST /models/{model_id}/predict`: Execute low-latency model inference.

### 2.4 Autonomous Agent Workflows
* `POST /agents/execute`: Launch a sandboxed agent workflow with allowlisted tools.
* `GET /agents/executions`: List previous execution traces and status.
* `POST /agents/executions/{id}/approve`: Approve an agent human approval gate.
* `POST /agents/executions/{id}/reject`: Reject an agent human approval gate.

### 2.5 Security, DLP & Audit Logging
* `POST /security/dlp/scan`: Scan arbitrary text against the 8-engine Zero-Leak DLP Shield.
* `GET /audit-logs`: Query immutable security audit trail with pagination and filtering.
* `GET /audit-logs/export`: Download compliance CSV export with digital SHA-256 signature.

### 2.6 Billing, Subscriptions & Webhooks
* `POST /billing/checkout`: Create a Stripe Checkout session to upgrade plan tier.
* `GET /billing/status`: Retrieve current subscription status, plan tier, and token quota usage.
* `GET /billing/invoices`: List tax invoices with payment dates and amounts.
* `GET /billing/invoices/{invoice_id}/pdf`: Download verified PDF tax receipt.
* `POST /billing/webhook`: Ingest signed Stripe webhook events with idempotent deduplication.

---

## 3. Standard HTTP Error Codes

| Status Code | Meaning | Description |
| :--- | :--- | :--- |
| `200 OK` | Success | Request succeeded normally. |
| `201 Created` | Created | Resource (document, user, model) successfully created. |
| `400 Bad Request` | Validation Failure | Invalid request payload schema or unparseable input. |
| `401 Unauthorized` | Unauthenticated | Missing or expired JWT token / invalid API key. |
| `403 Forbidden` | Access Denied | Insufficient role permissions or quota limit exceeded. |
| `404 Not Found` | Not Found | Resource does not exist OR belongs to another tenant (isolation defense). |
| `429 Too Many Requests` | Rate Limited | Exceeded per-minute token-bucket rate limit. |
| `500 Internal Error` | Server Error | Unhandled server exception (logged with trace ID). |
