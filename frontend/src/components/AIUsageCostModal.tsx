"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Zap,
  TrendingUp,
  DollarSign,
  Download,
  ShieldCheck,
  AlertTriangle,
  Server,
  Layers,
  ArrowUpRight,
  Clock,
  RefreshCw,
  FileSpreadsheet
} from "lucide-react";
import { api, UsageAnalyticsResponse } from "@/lib/api";

interface AIUsageCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpgradeModal?: () => void;
}

export function AIUsageCostModal({
  isOpen,
  onClose,
  onOpenUpgradeModal,
}: AIUsageCostModalProps) {
  const [data, setData] = useState<UsageAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getUsageAnalytics();
      setData(res);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load usage intelligence data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const exportCsv = () => {
    if (!data) return;
    const headers = [
      "Record ID",
      "Timestamp",
      "Event Type",
      "Model",
      "Prompt Tokens",
      "Completion Tokens",
      "Total Tokens",
      "Estimated Cost (USD)",
    ];

    const rows = (data.recent_activity || []).map((item) => [
      item.id,
      item.created_at,
      item.event_type,
      item.model,
      item.prompt_tokens,
      item.completion_tokens,
      item.total_tokens,
      `$${item.estimated_cost_usd.toFixed(4)}`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `bytherix_ai_cost_ledger_${data.organization_id.slice(0, 8)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isWarning = (data?.percentage_used ?? 0) >= 80;
  const isExceeded = (data?.percentage_used ?? 0) >= 100 || data?.quota_status === "exceeded";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900/95 dark:bg-[#090d16]/98 border border-slate-700/60 dark:border-white/[0.12] text-slate-100 shadow-2xl shadow-indigo-500/10 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-800 dark:border-white/[0.08] bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  AI Cost & Token Intelligence
                </h2>
                <span
                  className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full border ${
                    isExceeded
                      ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                      : isWarning
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  }`}
                >
                  {isExceeded ? "Exceeded" : isWarning ? "80% Warning" : "Healthy"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time token telemetry, model pricing breakdown, and burn rate runway.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAnalytics}
              disabled={isLoading}
              title="Refresh Analytics"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading && !data ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono">Aggregating token ledger and spend telemetry...</p>
            </div>
          ) : data ? (
            <>
              {/* 4 Metric KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Monthly Token Burn */}
                <div className="p-4 rounded-2xl bg-slate-800/50 dark:bg-white/[0.03] border border-slate-700/60 dark:border-white/[0.08] relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>Monthly Tokens</span>
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                      {(data.tokens_used).toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      / {(data.token_allowance).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-3 w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isExceeded
                          ? "bg-rose-500"
                          : isWarning
                          ? "bg-amber-500"
                          : "bg-gradient-to-r from-indigo-500 to-cyan-400"
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(3, data.percentage_used))}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400 font-mono">
                    {data.percentage_used}% quota utilized ({data.plan_tier.toUpperCase()})
                  </p>
                </div>

                {/* 2. Estimated AI Spend */}
                <div className="p-4 rounded-2xl bg-slate-800/50 dark:bg-white/[0.03] border border-slate-700/60 dark:border-white/[0.08]">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>Estimated Spend</span>
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
                      ${data.estimated_cost_usd.toFixed(4)}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">USD</span>
                  </div>
                  <p className="mt-4 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Avg / Query:</span>
                    <span className="text-slate-200 font-bold">${data.cost_per_query_usd.toFixed(4)}</span>
                  </p>
                </div>

                {/* 3. Daily Burn & Runway */}
                <div className="p-4 rounded-2xl bg-slate-800/50 dark:bg-white/[0.03] border border-slate-700/60 dark:border-white/[0.08]">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>Burn Rate & Runway</span>
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                      ~{data.daily_burn_rate.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">tokens/day</span>
                  </div>
                  <p className="mt-4 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Estimated Runway:</span>
                    <span className="text-cyan-400 font-bold">~{data.projected_days_remaining} days left</span>
                  </p>
                </div>

                {/* 4. Knowledge Base Volume */}
                <div className="p-4 rounded-2xl bg-slate-800/50 dark:bg-white/[0.03] border border-slate-700/60 dark:border-white/[0.08]">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>Vector Knowledge</span>
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                      {data.documents_count}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      / {data.documents_limit} docs
                    </span>
                  </div>
                  <p className="mt-4 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>RAG Queries Handled:</span>
                    <span className="text-purple-400 font-bold">{data.queries_count}</span>
                  </p>
                </div>
              </div>

              {/* Prompt vs Completion Token Split */}
              <div className="p-4.5 rounded-2xl bg-slate-800/40 dark:bg-white/[0.02] border border-slate-700/60 dark:border-white/[0.08]">
                <div className="flex items-center justify-between text-xs font-semibold mb-2 text-slate-300">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    Prompt Tokens: {data.prompt_tokens.toLocaleString()} (
                    {data.tokens_used > 0
                      ? Math.round((data.prompt_tokens / data.tokens_used) * 100)
                      : 0}
                    %)
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    Completion Tokens: {data.completion_tokens.toLocaleString()} (
                    {data.tokens_used > 0
                      ? Math.round((data.completion_tokens / data.tokens_used) * 100)
                      : 0}
                    %)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-700/60 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{
                      width: `${
                        data.tokens_used > 0
                          ? (data.prompt_tokens / data.tokens_used) * 100
                          : 50
                      }%`,
                    }}
                  />
                  <div
                    className="h-full bg-cyan-400 transition-all duration-300"
                    style={{
                      width: `${
                        data.tokens_used > 0
                          ? (data.completion_tokens / data.tokens_used) * 100
                          : 50
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Model Breakdown Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-indigo-400" />
                  Model Consumption & Cost Matrix
                </h3>

                <div className="overflow-x-auto rounded-2xl border border-slate-700/60 dark:border-white/[0.08]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 dark:bg-white/[0.04] text-slate-400 font-mono text-[11px] uppercase border-b border-slate-700/60 dark:border-white/[0.08]">
                      <tr>
                        <th className="px-4 py-3">Model</th>
                        <th className="px-4 py-3">Total Tokens</th>
                        <th className="px-4 py-3">Prompt</th>
                        <th className="px-4 py-3">Completion</th>
                        <th className="px-4 py-3">Share</th>
                        <th className="px-4 py-3 text-right">Estimated Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 dark:divide-white/[0.04] font-mono">
                      {data.models_breakdown.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                            No billable model invocations recorded for this billing cycle yet.
                          </td>
                        </tr>
                      ) : (
                        data.models_breakdown.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-2.5 font-bold text-slate-200 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-indigo-400" />
                              {m.model}
                            </td>
                            <td className="px-4 py-2.5 text-slate-300">{m.tokens.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-slate-400">{m.prompt_tokens.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-slate-400">{m.completion_tokens.toLocaleString()}</td>
                            <td className="px-4 py-2.5">
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-indigo-300 border border-indigo-500/30">
                                {m.percentage_of_total}%
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-emerald-400">
                              ${m.estimated_cost_usd.toFixed(4)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Ledger Activity */}
              {data.recent_activity.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      Recent Activity Ledger (Last 10 Events)
                    </h3>
                    <button
                      onClick={exportCsv}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      Export CSV Ledger
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-700/60 dark:border-white/[0.08]">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-800/80 dark:bg-white/[0.04] text-slate-400 text-[10.5px] uppercase border-b border-slate-700/60 dark:border-white/[0.08]">
                        <tr>
                          <th className="px-4 py-2.5">Event</th>
                          <th className="px-4 py-2.5">Model</th>
                          <th className="px-4 py-2.5">Prompt</th>
                          <th className="px-4 py-2.5">Completion</th>
                          <th className="px-4 py-2.5">Total</th>
                          <th className="px-4 py-2.5 text-right">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 dark:divide-white/[0.04]">
                        {data.recent_activity.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-2 text-slate-300 font-sans font-medium">{r.event_type}</td>
                            <td className="px-4 py-2 text-slate-400">{r.model}</td>
                            <td className="px-4 py-2 text-slate-400">{r.prompt_tokens}</td>
                            <td className="px-4 py-2 text-slate-400">{r.completion_tokens}</td>
                            <td className="px-4 py-2 font-bold text-white">{r.total_tokens}</td>
                            <td className="px-4 py-2 text-right text-emerald-400 font-bold">
                              ${r.estimated_cost_usd.toFixed(4)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 dark:border-white/[0.08] bg-slate-900/80">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Strict tenant boundary: Data isolated to your organization.</span>
          </div>

          <div className="flex items-center gap-2.5">
            {onOpenUpgradeModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUpgradeModal();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Upgrade Plan Tier</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
