# Bytherix EAM — 3-Phase Development Workflow

This rule governs the development and coding lifecycle in **Bytherix EAM** using the **Plan → Build → Review** methodology.

---

## Phase 1: Plan (GSD Methodology)
Before modifying or creating any code:
1. **Clarify Scope:** Identify which product module is affected (`Enterprise AI/RAG`, `Multi-Tenant SaaS/RBAC`, `MLOps & Governance`, or `Frontend`).
2. **Architecture Check:**
   - Verify multi-tenant isolation: Does every database query and business logic operation scope to the authenticated `tenant_id`?
   - Check database migrations: Do not edit existing Alembic migrations; prepare a new migration if schema changes are required.
3. **Task Breakdown:** Break work into small, verifiable tasks with explicit acceptance criteria.

---

## Phase 2: Build & Iterate (Ralph Task Loop)
When executing planned tasks:
1. Work through one small task at a time.
2. Keep edits focused only on the current task's files.
3. Avoid speculative refactoring of unrelated modules.
4. If a task fails or tests break, diagnose the error and fix it before moving to the next task.

---

## Phase 3: Verify & Test
After implementing changes:
1. Run relevant automated tests:
   ```bash
   pytest tests/
   ```
2. Check for syntax and runtime errors across API routes and Celery workers.
3. Validate that no unhandled exceptions leak sensitive database details or stack traces to clients.

---

## Phase 4: Review (CodeRabbit)
Before creating commits or daily progress reports:
1. Run local CodeRabbit audit on uncommitted changes:
   ```bash
   coderabbit review --agent --uncommitted
   ```
2. Resolve any reported security issues, tenant context leaks, or quality bugs.
3. Ensure `.env` and sensitive credentials remain uncommitted.
