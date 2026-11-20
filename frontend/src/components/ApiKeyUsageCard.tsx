"use client";

import React from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Cpu,
  Key,
  Layers,
  Lock,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { ApiKeyItem, UsageSummary } from "@/lib/api";

interface ApiKeyUsageCardProps {
  usage: UsageSummary | null;
  apiKeys: ApiKeyItem[];
  isOwnerOrAdmin: boolean;
  onOpenUpgradeModal: () => void;
}

export function ApiKeyUsageCard({
  usage,
  apiKeys,
  isOwnerOrAdmin,
  onOpenUpgradeModal,
}: ApiKeyUsageCardProps) {
  const planTier = (usage?.plan_tier || "starter").toLowerCase();
  const tokenAllowance = usage?.token_allowance || 100_000;
  const tokensUsed = usage?.tokens_used || 0;
  const promptTokens = usage?.prompt_tokens || 0;
  const completionTokens = usage?.completion_tokens || 0;
  const queriesCount = usage?.queries_count || 0;

  // Percentage calculation capped at 100% for progress bar
  const percentUsed = tokenAllowance > 0 ? (tokensUsed / tokenAllowance) * 100 : 0;
  const clampedPercent = Math.min(100, Math.max(0, percentUsed));

  // Determine Quota Status
  const isExceeded = usage?.is_quota_exceeded || percentUsed >= 100;
  const isWarning = !isExceeded && (usage?.is_quota_warning || percentUsed >= 80);

  // Rate limit tier lookup (Section 7.4)
  const rateLimitMap: Record<string, string> = {
    starter: "60 req/min",
    growth: "300 req/min",
    enterprise: "1,200 req/min",
  };
  const currentRateLimit = rateLimitMap[planTier] || "60 req/min";

  // Active vs Revoked Keys count
  const activeKeysCount = apiKeys.filter((k) => !k.is_revoked).length;
  const revokedKeysCount = apiKeys.filter((k) => k.is_revoked).length;

  return (
    <div className="card-depth-3d p-5 sm:p-6 space-y-6 overflow-hidden relative">
      {/* Background Accent Glow */}
      <div
        className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20 ${
          isExceeded
            ? "bg-rose-500"
            : isWarning
            ? "bg-amber-500"
            : "bg-purple-500"
        }`}
      />

      {/* Header: Tier & Quota Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                API Telemetry & Quota Gauges
              </h3>
              <span className="capitalize px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/25">
                {planTier} Tier
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live consumption telemetry across machine API keys, pipelines, and inference calls.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Health Status Indicator */}
          {isExceeded ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400">
              <ShieldAlert className="w-3.5 h-3.5" />
              Quota Exhausted (100%)
            </span>
          ) : isWarning ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
              Approaching Quota ({Math.round(percentUsed)}%)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Quota Healthy ({Math.round(percentUsed)}%)
            </span>
          )}

          {isOwnerOrAdmin && (
            <button
              onClick={onOpenUpgradeModal}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xs transition-all hover:scale-[1.02]"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              Manage Plan
              <ArrowUpRight className="w-3 h-3 opacity-80" />
            </button>
          )}
        </div>
      </div>

      {/* Quota Warning / Exceeded Banner (Section 7.4) */}
      {(isWarning || isExceeded) && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            isExceeded
              ? "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
              : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-current" />
            <div>
              <p className="font-bold">
                {isExceeded
                  ? "Monthly AI Token Allowance Exhausted"
                  : "Approaching Monthly AI Token Budget Limit"}
              </p>
              <p className="opacity-90 mt-0.5 text-[11px]">
                {isExceeded
                  ? "API inference calls are currently blocked. Upgrade to a higher tier immediately to restore continuous pipeline operation."
                  : `You have consumed ${Math.round(percentUsed)}% of your monthly allocation. Upgrade your plan to prevent pipeline interruption.`}
              </p>
            </div>
          </div>
          {isOwnerOrAdmin && (
            <button
              onClick={onOpenUpgradeModal}
              className={`px-3 py-1.5 rounded-lg font-bold shrink-0 shadow-xs transition-all ${
                isExceeded
                  ? "bg-rose-600 hover:bg-rose-500 text-white"
                  : "bg-amber-600 hover:bg-amber-500 text-white"
              }`}
            >
              Upgrade Allowance
            </button>
          )}
        </div>
      )}

      {/* Bento Grid: 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Monthly Token Allowance & Meter */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Token Allowance
            </span>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                isExceeded
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                  : isWarning
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  : "bg-purple-500/15 text-purple-600 dark:text-purple-400"
              }`}
            >
              {Math.round(percentUsed)}% Used
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between text-slate-900 dark:text-white">
              <span className="text-xl font-extrabold font-mono tracking-tight">
                {tokensUsed.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                / {tokenAllowance.toLocaleString()} tokens
              </span>
            </div>

            {/* Visual Gauge Bar */}
            <div className="mt-2.5 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isExceeded
                    ? "bg-rose-500"
                    : isWarning
                    ? "bg-gradient-to-r from-amber-500 to-rose-500"
                    : "bg-gradient-to-r from-purple-500 to-indigo-500"
                }`}
                style={{ width: `${clampedPercent}%` }}
              />
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono border-t border-slate-200/60 dark:border-white/[0.04]">
            <span>Prompt: {promptTokens.toLocaleString()}</span>
            <span>Completion: {completionTokens.toLocaleString()}</span>
          </div>
        </div>

        {/* Metric 2: API Requests & Rate Limit SLA */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              API Requests & SLA
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
              {currentRateLimit}
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between text-slate-900 dark:text-white">
              <span className="text-xl font-extrabold font-mono tracking-tight">
                {queriesCount.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                calls this billing cycle
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Redis sliding-window rate limiting enforced per tenant.
            </p>
          </div>

          <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-white/[0.04]">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> SLA: 99.9% Uptime
            </span>
            <span className="font-mono">Redis v7.0</span>
          </div>
        </div>

        {/* Metric 3: Active Cryptographic Machine Keys */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Key Security Hygiene
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              {activeKeysCount} Active
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between text-slate-900 dark:text-white">
              <span className="text-xl font-extrabold font-mono tracking-tight">
                {activeKeysCount}
                <span className="text-sm font-normal text-slate-500"> / {apiKeys.length}</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {revokedKeysCount > 0 ? `${revokedKeysCount} revoked` : "0 revoked"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Keys hashed via SHA-256 with scoped RBAC permissions.
            </p>
          </div>

          <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-white/[0.04]">
            <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
              <Lock className="w-3 h-3" /> Prefix: bx_live_...
            </span>
            <span className="font-mono">Entropy: 256-bit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
