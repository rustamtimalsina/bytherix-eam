# Bytherix EAM - ML Model Incident & Emergency Rollback Runbook
**Specification Reference:** Section 9 (*Monitoring and Rollback*), Section 14.4 (*Operational Runbooks*)  
**Component:** MLOps Model Registry & Prediction Service  
**Classification:** Internal SRE & ML Engineering Runbook

---

## 1. Trigger Conditions & Incident Scenarios
This runbook covers operational alerts triggered by the Bytherix EAM Model Governance subsystem:

1. **Statistical Drift Alert (`ks_test` p-value < 0.05):**
   * Input feature distribution or prediction confidence has drifted significantly from baseline training distributions.
2. **Elevated Prediction Error Rate (> 2.0% over 5-minute window):**
   * Inference endpoint returns unhandled exceptions, schema validation errors, or malformed JSON outputs.
3. **P99 Latency Breach (> 1,500ms):**
   * Serving worker backlog, cold start penalties, or GPU memory exhaustion.
4. **Hallucination or Unsafe Output Incident:**
   * Downstream DLP shield detects policy violations or customer complaints flag degraded model accuracy.

---

## 2. Emergency 1-Click Rollback Procedure

When an active production model version causes regressions, on-call engineers can trigger an instant rollback to the previous certified version.

### Option A: Via Web Dashboard (Recommended)
1. Navigate to **Models** tab in the Bytherix EAM dashboard.
2. Select the impacted registered model (e.g., `fraud-detection-ensemble` or `sentiment-analyzer-v2`).
3. Click on the **Model Versions** history list.
4. Click the **"Emergency Rollback"** button next to the last known stable version (e.g., `v1.2.0`).
5. Confirm the action. The platform atomically:
   * Sets the previous version state to `active_production = True`.
   * Demotes the degraded version to `deprecated = True`.
   * Writes a tamper-evident event to the immutable Audit Log (`/api/v1/audit-logs`).
   * Reroutes live prediction traffic immediately with zero downtime.

### Option B: Via REST API
```bash
curl -X POST "https://api.bytherix.com/api/v1/models/{model_id}/versions/{target_version_id}/rollback" \
  -H "Authorization: Bearer $ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Automated KS drift breach (p=0.012) and elevated latency"}'
```

Response:
```json
{
  "status": "success",
  "active_version": "v1.2.0",
  "rollback_from": "v1.3.0",
  "switched_at": "2026-11-22T14:15:00Z"
}
```

---

## 3. Investigating Model Drift

Bytherix EAM tracks statistical distributions on numerical and categorical features using two-sample Kolmogorov-Smirnov (KS) tests and Population Stability Index (PSI).

### Diagnosing Drift in Logs
1. Inspect prediction logs:
   ```bash
   GET /api/v1/models/{model_id}/drift-summary
   ```
2. Check drift metrics:
   * **`ks_statistic`:** Higher value indicates larger distance between distributions.
   * **`p_value`:** If `< 0.05`, drift is statistically significant.
   * **`drift_detected`:** Boolean flag that automatically switches to `true`.

### Remediation Steps:
1. **Analyze Incoming Payload Shift:**
   * Review sample payloads from `prediction_logs` table for unexpected seasonal trends or schema drift.
2. **Re-evaluate on Baseline Benchmark Set:**
   * Run benchmark evaluation to confirm if model accuracy actually dropped or if the shift is harmless covariate shift.
3. **Trigger Model Retraining:**
   * Schedule automated retraining pipeline with the newly ingested ground-truth dataset.
   * Promote the new candidate model through `staging` validation before deploying to `production`.

---

## 4. Verification & Sign-off
After rolling back or deploying a patched model:
1. Confirm traffic routing to target version:
   ```bash
   GET /api/v1/models/{model_id}/versions
   ```
2. Run live inference smoke test:
   ```bash
   POST /api/v1/models/{model_id}/predict
   ```
3. Monitor error rate and latency in the dashboard telemetry panel for 15 minutes.
4. Close the incident ticket and link the corresponding audit log entry.
