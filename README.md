# Bytherix EAM — Enterprise AI Management Platform

[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-336791.svg)](https://github.com/pgvector/pgvector)
[![Celery](https://img.shields.io/badge/Celery-5.4+-37814A.svg)](https://docs.celeryq.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://www.docker.com/)

A modular, multi-tenant enterprise platform designed to let organizations securely manage AI-powered knowledge workflows, run controlled AI agents, deploy machine-learning models, monitor model behavior, and administer SaaS usage from one system.

---

## 🏛 Architecture & Product Modules

1. **Enterprise AI Intelligence (RAG & Knowledge)**:
   - Asynchronous PDF document upload, magic-byte validation, and SHA-256 integrity verification.
   - Semantic text chunking with stable page and section references.
   - Vector embeddings indexed into PostgreSQL via `pgvector`.
   - Source-grounded RAG question-answering with exact document and page citations.
2. **Multi-Tenant SaaS Foundation**:
   - Strict tenant isolation: Tenant context is derived on the server from authenticated sessions or API keys, never from untrusted client input alone.
   - Role-Based Access Control (RBAC): Owner, Administrator, Developer, AI/ML Engineer, Analyst, Billing Manager, Viewer.
   - Scoped API keys with SHA-256 storage hashing, expiration, and immediate revocation.
3. **MLOps & Model Governance**:
   - Model version registry with lifecycle states (`draft` → `staging` → `production` → `archived`).
   - Versioned prediction endpoints, drift monitoring, and 1-click rollback workflows.

---

## 🚀 Quick Start (Docker Compose)

The easiest way to spin up the entire ecosystem (PostgreSQL with `pgvector`, Redis, MinIO S3 object storage, FastAPI API, and Celery worker):

```bash
# 1. Clone & enter directory
git clone <repo-url>
cd bytherix-eam

# 2. Configure environment
cp .env.example .env

# 3. Spin up all services
docker compose up -d
```

Once running:
- **Interactive Swagger Docs**: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- **MinIO Storage Console**: [http://localhost:9001](http://localhost:9001) (`minioadmin` / `minioadmin`)

---

## 💻 Local Development Setup

If running without Docker:

```bash
# 1. Create and activate virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
source venv/bin/activate    # Linux / macOS

# 2. Install dependencies
pip install -e .

# 3. Run FastAPI backend
uvicorn app.main:app --reload --port 8000

# 4. In a separate terminal, run Celery worker (optional for background indexing)
celery -A app.workers.celery_app.celery_app worker --loglevel=info
```

---

## 🧪 Automated Testing

Run the full automated test suite (including cross-tenant isolation tests, health probes, file validation, and API key lifecycle):

```bash
pytest -v
```

---

## 📂 Project Structure

```
bytherix-eam/
|-- app/
|   |-- main.py                       # FastAPI application & middleware
|   |-- api/
|   |   |-- errors.py                 # Standard error handling (Section 10.3)
|   |   `-- v1/
|   |       |-- auth.py               # Authentication & signup routes
|   |       |-- organizations.py      # Tenants, members & invitation routes
|   |       |-- api_keys.py           # Scoped API key management
|   |       |-- documents.py          # PDF upload, ingestion & status
|   |       `-- chat.py               # Grounded RAG question-answering
|   |-- core/
|   |   |-- config.py                 # Pydantic environment settings
|   |   |-- security.py               # Native bcrypt hashing & JWT tokens
|   |   |-- permissions.py            # RBAC permissions & role matrices
|   |   `-- tenant_context.py         # Tenant isolation & security dependencies
|   |-- db/
|   |   |-- base.py                   # SQLAlchemy Base model
|   |   |-- session.py                # Database session generator
|   |   `-- models/                   # Core entities (User, Org, Doc, Chunk, etc.)
|   |-- schemas/                      # Pydantic v2 input/output validation contracts
|   |-- services/                     # Business logic (RAG, documents, organizations)
|   |-- integrations/
|   |   |-- object_storage/           # S3 & MinIO private storage adapter
|   |   |-- embeddings/               # Vector embeddings provider
|   |   `-- llm/                      # LLM generation adapter
|   `-- workers/                      # Celery app & background tasks
|-- tests/                            # Pytest vertical slice & authorization tests
|-- compose.yaml                      # Docker Compose orchestrator
|-- Dockerfile                        # Production container image definition
|-- pyproject.toml                    # Package metadata & dependencies
`-- README.md                         # Documentation
```
