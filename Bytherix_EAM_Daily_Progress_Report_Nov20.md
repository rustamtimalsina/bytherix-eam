# Bytherix EAM — Daily Progress Report

**Developer:** Rustam Timalsina  
**Date:** November 20, 2026  
**Project:** Bytherix EAM (Enterprise AI Management Platform)  

---

## 1. Overview of Today's Work

Today I focused on four main tasks for the Bytherix platform: getting our staging setup running in Docker containers, adding a live usage meter for API keys on the dashboard, setting up GitHub Actions to automatically run tests on every push, and building a model response time monitor with a 1-click rollback button:

* **Docker Setup for Staging:** Wrote a `docker-compose.yml` file to run our entire app in Docker (PostgreSQL with pgvector, Redis, MinIO S3, FastAPI backend, Next.js frontend, and Nginx proxy). Optimized the Next.js Dockerfile with multi-stage builds so the final image size dropped from 1.5GB down to ~150MB, and set up Nginx to handle routing and streaming.
* **API Key Usage & Limits UI:** Built `ApiKeyUsageCard.tsx` on the API Keys page. It shows users a visual progress bar of how many tokens they have used this month against their quota, their rate limit SLA, and active key count. Also updated the keys table to show when each key was last used or if it has never been used.
* **Automated GitHub Actions CI/CD:** Added `.github/workflows/ci.yml`. Whenever code is pushed to GitHub, it automatically spins up a clean Linux runner, runs all 54 backend tests, builds the frontend, and checks our Docker config to make sure nothing is broken before merging.
* **Model Speed Monitoring & Rollback:** Added `ModelDriftMonitorCard.tsx` and a backend endpoint at `/models/{id}/monitoring`. It checks whether a deployed AI model's response time is slowing down compared to its baseline. If latency spikes, it shows an alert and provides a single button to roll back to the previous stable version without downtime.
* **Testing & Git Commits:** Verified everything locally and pushed 3 clean commits to GitHub main (`664965a`, `89777a0`, and `bc1da41`).

---

## 2. Key Accomplishments

| Feature / Task | Status | Implementation Details |
|---|---|---|
| **Docker Compose Setup** | **Completed** | Created `docker-compose.yml` running Postgres (pgvector), Redis 7, MinIO S3, FastAPI, Next.js, and Nginx together. |
| **Next.js Dockerfile Optimization** | **Completed** | Built a 3-stage `frontend/Dockerfile` using Next.js standalone output, cutting image size from 1.5GB down to ~150MB. |
| **Nginx Reverse Proxy** | **Completed** | Configured `nginx/nginx.conf` to direct port 80 to Next.js (port 3000) and `/api/*` to FastAPI (port 8000) with SSE streaming support. |
| **API Key Usage Meter** | **Completed** | Created `ApiKeyUsageCard.tsx` with a visual token bar, SLA rate limit badge, and warning alerts when usage passes 80%. |
| **Key Activity Timestamps** | **Completed** | Updated `tenant_context.py` to save `last_used_at` timestamps in the database whenever an API key is authenticated. |
| **Automated GitHub CI/CD** | **Completed** | Added `.github/workflows/ci.yml` that runs pytest, Next.js build, and Docker validation on every push and pull request. |
| **Model Latency Monitoring** | **Completed** | Added `GET /api/v1/models/{id}/monitoring` to compare live response times against baselines and flag slowdowns. |
| **1-Click Model Rollback** | **Completed** | Added `ModelDriftMonitorCard.tsx` with health status badges and an instant rollback button to restore stable releases. |

---

## 3. Issues Encountered & How I Fixed Them

* **Timezone Comparison Error in Tests:** While running API key expiration tests, SQLite threw an error (`TypeError: can't compare offset-naive and offset-aware datetimes`) because SQLite dates had no timezone while Python was using UTC. *Fix:* Updated `tenant_context.py` to check whether timezone info exists before comparing, so it works seamlessly on both SQLite and Postgres.
* **Next.js Build Warnings & Loose Types:** The production frontend build failed due to unused Lucide icon imports in `ModelPromotionModal.tsx` and `WebhookManagerCard.tsx`, plus a loose type in `api.ts`. *Fix:* Removed the unused imports, added proper TypeScript typing for the webhook payload, and set up standalone output in `next.config.mjs`.
* **Stale Background Process on Port 8000:** After writing the new `/models/{id}/monitoring` route, test requests kept returning 404 because an older Uvicorn server was still running in the background holding the port. *Fix:* Terminated the old process with `taskkill`, restarted Uvicorn, and verified that requests return 200 OK.
* **TypeScript Name Mismatch:** The frontend build threw an error in `ModelDriftMonitorCard.tsx` because it imported `RegisteredModel` instead of `RegisteredModelDetail`. *Fix:* Corrected the import name to match `api.ts`, and all 10 pages compiled cleanly.

---

## 4. Current System Status

* Multi-tenant authentication, 8 user roles, single-use 7-day invite tokens — **Done**
* Grounded Hybrid RAG with page citations & real-time streaming — **Done & Live**
* Enterprise Billing Ledger with downloadable PDF tax receipts — **Done**
* Multi-container Docker Compose staging environment & Nginx proxy — **Done & Verified**
* Live API Key usage meters & active key tracking — **Done & Verified**
* Automated GitHub Actions CI/CD testing pipeline — **Done & Verified**
* Model speed monitoring & 1-click rollback engine — **Done & Verified**
* Automated Test Suite — **100% Passing (54/54 backend tests, Next.js build clean)**
* Git Repository — **Clean working tree pushed to origin/main (Commit: `bc1da41`)**

---

## 5. Plan for Tomorrow (November 21)

1. **Stripe Payment Webhook Integration:** Connect our HMAC webhook handler to live Stripe test keys to handle automatic subscription renewals.
2. **Coordinate with Sujal:** Help Sujal connect his Developer API portal components to our live backend endpoints.
3. **Docker Staging Smoke Testing:** Run full end-to-end tests across the containers in the Docker staging setup.

---

## 6. Summary

Today went very well. We set up our staging environment in Docker with Nginx, added live usage meters for API keys so users know when they are near their limits, configured GitHub Actions to test our code automatically on every push, and added a model latency monitor with a quick rollback button. All 54 tests are passing, the frontend builds cleanly, and all changes are pushed to GitHub main.