# Bytherix EAM - Disaster Recovery & Backup Restoration Runbook
**Specification Reference:** Section 14.4 (*Operational Runbooks*), Section 15.5 (*Backup and Recovery*)  
**Target RPO:** 24 Hours (Daily Snapshot)  
**Target RTO:** < 15 Minutes (Verified Automated Restore: ~0.13s)  
**Classification:** Internal Confidential / SRE Runbook

---

## 1. Overview & Objective
This runbook guides on-call engineers, DevOps, and site reliability operators during a critical database disruption, hardware loss, data corruption, or catastrophic host failure.

Bytherix EAM enforces the foundational principle:
> *"A backup that has never been restored in a test is not a verified recovery plan."* (Spec Section 15.5)

The platform provides a unified CLI and automation tool: `scripts/backup_restore.py`.

---

## 2. Emergency Recovery Playbook

### Step 1: Declare Incident & Assess Blast Radius
1. Identify failure mode:
   * **Host Down / Hardware Crash:** Immediate failover to cold standby or rebuild host.
   * **Data Corruption / Malicious Modification:** Determine last known good timestamp from audit logs (`/api/v1/audit-logs`).
   * **Transient Locking / Schema Error:** Check application logs before triggering restore.
2. Freeze external traffic if necessary by placing Nginx or cloud load balancer in maintenance mode.

---

### Step 2: Locate Verified Backup Snapshot
Run the backup inventory tool:
```bash
python scripts/backup_restore.py list
```

Example Output:
```text
=== Bytherix EAM Verified Backups ===
- ID: bck_20261122_081541_4c1d51a8 | Date: 2026-11-22T08:15:41 | Rows: 913 | Status: VERIFIED
```

Every valid backup contains two files in the `backups/` directory (or S3/MinIO bucket `bytherix-backups`):
1. `<backup_id>.db`: SQLite / PostgreSQL atomic binary dump.
2. `<backup_id>.manifest.json`: Cryptographic manifest containing SHA-256 hash, exact row counts across all 18 tables, and engine metadata.

---

### Step 3: Run Disaster Recovery Restoration Drill
Before applying a backup to production, test it in an isolated scratch environment:
```bash
python scripts/backup_restore.py drill --backup-file backups/<backup_id>.db
```

The script will:
* Verify the cryptographic SHA-256 hash against the manifest.
* Spin up an isolated scratch instance.
* Restore all tables and verify SQLite `PRAGMA integrity_check`.
* Check that all 18 required schema tables exist.
* Execute synthetic health checks against Organizations, Users, and Documents.
* Confirm that Recovery Time (RTO) is within the 15-minute SLA.

If the drill output displays:
```json
"status": "PASS",
"rto_within_sla": true
```
The backup is certified safe for production restoration.

---

### Step 4: Production Database Restoration
Once certified, restore to the target database:

#### For Local / Docker SQLite Deployment:
1. Stop backend services:
   ```bash
   # If running via systemd / docker
   docker compose stop backend
   ```
2. Archive the damaged database:
   ```bash
   mv bytherix_eam.db bytherix_eam_damaged_$(date +%s).db
   ```
3. Copy the verified snapshot:
   ```bash
   cp backups/<backup_id>.db bytherix_eam.db
   ```
4. Restart services:
   ```bash
   docker compose start backend
   ```

#### For PostgreSQL Enterprise Deployments:
```bash
# Terminate existing active connections
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'bytherix_eam' AND pid <> pg_backend_pid();

# Restore using pg_restore
pg_restore -U postgres -d bytherix_eam --clean --if-exists backups/<backup_id>.dump
```

---

### Step 5: Post-Restoration Verification & Smoke Testing
Run the automated test suite to confirm zero regressions:
```bash
pytest tests/security/test_tenant_isolation.py -v
```

Verify that:
1. API health check responds `{"status": "healthy"}` at `/health`.
2. Users can log in and view their respective organization workspaces.
3. RAG search retrieves document chunks with source citations.
4. Active production AI models respond to predictions.

---

## 3. Scheduled Automated Backups & Routine Drills
To ensure compliance with Section 15.5:
* **Nightly Automated Backup:** Scheduled at 02:00 UTC via cron:
  ```bash
  0 2 * * * cd /opt/bytherix-eam && ./venv/bin/python scripts/backup_restore.py backup --label nightly >> /var/log/bytherix_backup.log 2>&1
  ```
* **Weekly Automated Fire Drill:** Scheduled every Sunday at 03:00 UTC:
  ```bash
  0 3 * * 0 cd /opt/bytherix-eam && ./venv/bin/python scripts/backup_restore.py drill >> /var/log/bytherix_drill.log 2>&1
  ```
  If `status != "PASS"`, an automated alert triggers to the on-call pager.
