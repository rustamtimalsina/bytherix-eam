"use client";

import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Zap,
  Check,
  ArrowRight,
} from "lucide-react";
import { ModelVersionDetail } from "@/lib/api";

interface ModelPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelName: string;
  candidateVersion: ModelVersionDetail | null;
  activeProductionVersion: ModelVersionDetail | null;
  targetStage: "production" | "staging";
  onConfirmPromotion: (versionId: string, stage: string, reason: string) => Promise<void>;
  isPromoting: boolean;
}

export function ModelPromotionModal({
  isOpen,
  onClose,
  modelName,
  candidateVersion,
  activeProductionVersion,
  targetStage,
  onConfirmPromotion,
  isPromoting,
}: ModelPromotionModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !candidateVersion) return null;

  const isProduction = targetStage === "production";

  // Metric comparisons
  const candidateAcc = candidateVersion.accuracy_score !== undefined && candidateVersion.accuracy_score !== null
    ? (candidateVersion.accuracy_score * 100).toFixed(1)
    : null;
  const activeAcc = activeProductionVersion?.accuracy_score !== undefined && activeProductionVersion?.accuracy_score !== null
    ? (activeProductionVersion.accuracy_score * 100).toFixed(1)
    : null;

  const candidateLatency = candidateVersion.latency_p95_ms ?? null;
  const activeLatency = activeProductionVersion?.latency_p95_ms ?? null;

  const accDelta = candidateAcc && activeAcc ? (parseFloat(candidateAcc) - parseFloat(activeAcc)).toFixed(1) : null;
  const latencyDelta = candidateLatency && activeLatency ? activeLatency - candidateLatency : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a compliance release reason or justification for audit logs.");
      return;
    }
    setError(null);
    try {
      await onConfirmPromotion(candidateVersion.id, targetStage, reason.trim());
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to promote model version");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="card-depth-3d w-full max-w-lg p-6 sm:p-7 space-y-5 relative my-auto select-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-md ${
              isProduction
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Model Lifecycle Promotion Gate
                </h3>
                <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full ${
                  isProduction
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                }`}>
                  {targetStage}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Target Model: <strong className="text-slate-800 dark:text-slate-200 font-mono">{modelName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPromoting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transition Preview Banner */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Candidate Version</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-white">
                {candidateVersion.version}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                {candidateVersion.lifecycle_stage}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 px-2">
            <ArrowRight className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Target Stage</span>
            <div>
              <span className={`font-mono text-sm font-extrabold uppercase ${
                isProduction ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
              }`}>
                {targetStage}
              </span>
            </div>
          </div>
        </div>

        {/* Benchmark Metric Comparison Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Benchmark Metrics vs. Current Production</span>
            </span>
            {activeProductionVersion && (
              <span className="text-[11px] font-mono text-slate-400">
                Active: {activeProductionVersion.version}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Accuracy Score */}
            <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-black/30 border border-slate-200 dark:border-white/[0.06] space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Benchmark Accuracy</span>
              <div className="flex items-baseline justify-between">
                <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                  {candidateAcc ? `${candidateAcc}%` : "Not evaluated"}
                </span>
                {accDelta && (
                  <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                    parseFloat(accDelta) >= 0
                      ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
                      : "text-rose-700 dark:text-rose-300 bg-rose-500/10"
                  }`}>
                    {parseFloat(accDelta) >= 0 ? `+${accDelta}%` : `${accDelta}%`}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block">
                {activeAcc ? `Current Prod: ${activeAcc}%` : "No prior production benchmark"}
              </span>
            </div>

            {/* p95 Latency */}
            <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-black/30 border border-slate-200 dark:border-white/[0.06] space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>p95 Latency SLA</span>
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                  {candidateLatency ? `${candidateLatency}ms` : "N/A"}
                </span>
                {latencyDelta !== null && (
                  <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                    latencyDelta >= 0
                      ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
                      : "text-rose-700 dark:text-rose-300 bg-rose-500/10"
                  }`}>
                    {latencyDelta >= 0 ? `-${latencyDelta}ms (Faster)` : `+${Math.abs(latencyDelta)}ms`}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block">
                {activeLatency ? `Current Prod: ${activeLatency}ms` : "No prior production latency"}
              </span>
            </div>
          </div>
        </div>

        {/* Safety Warning Notice for Production */}
        {isProduction && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold">Live Traffic Re-Routing Warning</p>
              <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/90">
                Authorizing promotion will instantly route all incoming inference calls to{" "}
                <span className="font-mono font-bold">{candidateVersion.version}</span>. The currently active version{" "}
                (<span className="font-mono">{activeProductionVersion?.version || "initial release"}</span>) will be demoted to Staging.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Release Reason &amp; Compliance Justification</span>
              <span className="text-[10px] font-mono text-slate-400">SOC 2 Required</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Fine-tuned with Q4 customer domain data. Accuracy improved by +2.2% with verified latency stability."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-black/40 border border-slate-300 dark:border-white/[0.08] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none font-sans"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200/50 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              disabled={isPromoting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPromoting || !reason.trim()}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 ${
                isProduction
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20"
                  : "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-500/20"
              }`}
            >
              {isPromoting ? (
                <span>Authorizing Stage Promotion...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Authorize Promotion to {targetStage}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
