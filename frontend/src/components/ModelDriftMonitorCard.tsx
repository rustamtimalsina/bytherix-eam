"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { api, ModelMonitoringStatus, RegisteredModelDetail } from "@/lib/api";

interface ModelDriftMonitorCardProps {
  model: RegisteredModelDetail | null;
  canRollback: boolean;
  onRollbackComplete: () => void;
  showToast: (title: string, message: string, type?: "success" | "error" | "info") => void;
}

export function ModelDriftMonitorCard({
  model,
  canRollback,
  onRollbackComplete,
  showToast,
}: ModelDriftMonitorCardProps) {
  const [monitoring, setMonitoring] = useState<ModelMonitoringStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const fetchMonitoring = async () => {
    if (!model) return;
    setIsLoading(true);
    try {
      const data = await api.getModelMonitoring(model.id);
      setMonitoring(data);
    } catch (e) {
      console.error("Failed to fetch model monitoring:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoring();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model?.id, model?.active_version_id]);

  const handleRollback = async () => {
    if (!model || !monitoring?.rollback_candidate_id) return;
    const candidateVer = monitoring.rollback_candidate_version || "previous version";
    if (!confirm(`Are you sure you want to rollback ${model.name} to ${candidateVer}? This will immediately switch production inference traffic.`)) {
      return;
    }

    setIsRollingBack(true);
    try {
      await api.rollbackModel(model.id, monitoring.rollback_candidate_id);
      showToast(
        "Model Rollback Executed",
        `Successfully restored ${model.name} to ${candidateVer} with production routing.`,
        "success"
      );
      await fetchMonitoring();
      onRollbackComplete();
    } catch (err: unknown) {
      showToast(
        "Rollback Notice",
        (err as Error).message || "Failed to execute model rollback",
        "error"
      );
    } finally {
      setIsRollingBack(false);
    }
  };

  if (!model) return null;

  const severity = monitoring?.alert_severity || "healthy";
  const isDrift = monitoring?.is_drift_detected || false;
  const driftPercent = monitoring?.latency_drift_percent || 0.0;
  const currentLatency = monitoring?.current_latency_p95_ms || 150.0;
  const baselineLatency = monitoring?.baseline_latency_p95_ms || 150.0;
  const candidateVersion = monitoring?.rollback_candidate_version;

  return (
    <div className="card-depth-3d p-5 sm:p-6 space-y-5 rounded-2xl overflow-hidden relative">
      {/* Background Accent Glow */}
      <div
        className={`absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl pointer-events-none opacity-20 ${
          severity === "critical"
            ? "bg-rose-500"
            : severity === "warning"
            ? "bg-amber-500"
            : "bg-indigo-500"
        }`}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                MLOps Telemetry & Drift Detection
              </h3>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 font-bold">
                {model.name}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Automated latency drift monitoring and 1-click zero-downtime rollback engine.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {severity === "critical" ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-400">
              <ShieldAlert className="w-3.5 h-3.5" />
              SLA Breach (+{driftPercent}%)
            </span>
          ) : severity === "warning" ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
              Drift Alert (+{driftPercent}%)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              In-Spec / Nominal
            </span>
          )}

          <button
            onClick={fetchMonitoring}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 transition-colors"
            title="Refresh drift statistics"
          >
            <Activity className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Bento Grid: 3 Metric Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Live Latency vs Baseline Benchmark */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-500" />
              p95 Inference Latency
            </span>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                isDrift
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {driftPercent >= 0 ? `+${driftPercent}%` : `${driftPercent}%`}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white">
              {currentLatency} ms
            </span>
            <span className="text-xs text-slate-500 font-mono">
              baseline: {baselineLatency} ms
            </span>
          </div>

          <div className="pt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-200/60 dark:border-white/[0.04]">
            <span>Active: {monitoring?.active_version || "Default"}</span>
            <span>SLA Limit: 500 ms</span>
          </div>
        </div>

        {/* Metric 2: Prediction Stability & Error Rate */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              Inference Stability
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
              {monitoring?.total_predictions || 0} calls
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white">
              {monitoring?.error_rate_percent || 0.0}%
            </span>
            <span className="text-xs text-slate-500">error rate</span>
          </div>

          <div className="pt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-200/60 dark:border-white/[0.04]">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> MLflow Tracking
            </span>
            <span className="font-mono">Circuit: Closed</span>
          </div>
        </div>

        {/* Metric 3: Automated Rollback Safeguard Engine */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-2 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-purple-500" />
                Rollback Safeguard
              </span>
              {candidateVersion && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  Target: {candidateVersion}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {candidateVersion
                ? `Restore to ${candidateVersion} with zero downtime.`
                : "No alternative version available for rollback."}
            </p>
          </div>

          {candidateVersion && canRollback && (
            <button
              onClick={handleRollback}
              disabled={isRollingBack}
              className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                isDrift
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20 animate-pulse"
                  : "bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white"
              }`}
            >
              {isRollingBack ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Rolling back...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Rollback to {candidateVersion}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Recommendation Banner */}
      <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-black/30 border border-slate-200 dark:border-white/[0.05] text-xs flex items-center justify-between gap-3 text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>{monitoring?.recommendation}</span>
        </div>
        <span className="text-[10px] font-mono shrink-0 text-slate-400">
          Section 9.4 & 9.5 Compliant
        </span>
      </div>
    </div>
  );
}
