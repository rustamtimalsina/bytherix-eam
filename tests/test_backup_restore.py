"""
Unit & Integration Tests for Disaster Recovery & Automated Backup Engine
Specification Reference: Section 15.5 ("Backup and Recovery")
"""

import os
import json
import tempfile
import pytest
from pathlib import Path

from scripts.backup_restore import (
    DisasterRecoveryManager,
    compute_file_sha256,
    get_sqlite_table_counts
)


@pytest.fixture
def temp_backup_dir():
    temp_dir = Path(tempfile.mkdtemp(prefix="bytherix_test_backups_"))
    yield temp_dir
    # Cleanup
    import shutil
    shutil.rmtree(temp_dir, ignore_errors=True)


def test_backup_creation_and_manifest_integrity(temp_backup_dir):
    """Verify that creating a backup generates a valid .db snapshot and .manifest.json."""
    mgr = DisasterRecoveryManager(backup_dir=temp_backup_dir)
    bfile, mfile = mgr.create_backup(label="unit_test")

    assert bfile.exists(), "Backup DB file must exist"
    assert mfile.exists(), "Manifest file must exist"
    assert bfile.stat().st_size > 0, "Backup DB must not be empty"

    # Validate manifest format
    with open(mfile, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    assert "backup_id" in manifest
    assert "timestamp" in manifest
    assert manifest["database_engine"] == "sqlite"
    assert manifest["status"] == "VERIFIED"
    assert manifest["file_sha256"] == compute_file_sha256(bfile)
    assert manifest["file_size_bytes"] == bfile.stat().st_size
    assert isinstance(manifest["table_counts"], dict)
    assert manifest["total_rows"] >= 0


def test_restoration_drill_clean_pass(temp_backup_dir):
    """Verify that an automated restoration drill passes all health checks."""
    mgr = DisasterRecoveryManager(backup_dir=temp_backup_dir)
    bfile, mfile = mgr.create_backup(label="drill_test")

    report = mgr.run_restoration_drill(backup_file=bfile, manifest_file=mfile)

    assert report["status"] == "PASS"
    assert report["rto_within_sla"] is True
    assert report["rto_seconds"] < 900.0  # < 15 minutes

    checks = report["checks"]
    assert checks["restore_operation"]["status"] == "PASS"
    assert checks["db_integrity_pragma"]["status"] == "PASS"
    assert checks["schema_completeness"]["status"] == "PASS"
    assert len(checks["schema_completeness"]["missing_tables"]) == 0
    assert checks["row_count_fidelity"]["status"] == "PASS"
    assert len(checks["row_count_fidelity"]["mismatches"]) == 0
    assert checks["synthetic_queries"]["status"] == "PASS"


def test_corrupted_backup_detection(temp_backup_dir):
    """Verify that tampering with a backup file fails the restoration drill immediately."""
    mgr = DisasterRecoveryManager(backup_dir=temp_backup_dir)
    bfile, mfile = mgr.create_backup(label="tamper_test")

    # Corrupt the file by appending junk bytes
    with open(bfile, "ab") as f:
        f.write(b"CORRUPTED_BYTES_INJECTED_FOR_DISASTER_TEST")

    report = mgr.run_restoration_drill(backup_file=bfile, manifest_file=mfile)

    assert report["status"] == "FAIL"
    assert "checksum mismatch" in report["error"].lower()


def test_list_backups(temp_backup_dir):
    """Verify that listing backups displays registered manifests."""
    mgr = DisasterRecoveryManager(backup_dir=temp_backup_dir)
    mgr.create_backup(label="snap_1")
    import time
    time.sleep(0.05)
    mgr.create_backup(label="snap_2")

    backups = mgr.list_backups()
    assert len(backups) == 2
    backup_ids = [b["backup_id"] for b in backups]
    assert any("snap_1" in bid for bid in backup_ids)
    assert any("snap_2" in bid for bid in backup_ids)
    assert "snap_2" in backups[0]["backup_id"]
