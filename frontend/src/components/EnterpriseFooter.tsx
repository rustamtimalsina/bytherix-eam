"use client";

import React from "react";
import { ShieldCheck, Activity, Terminal, Layers } from "lucide-react";

interface EnterpriseFooterProps {
  onOpenDLPShield?: () => void;
  onOpenCommandPalette?: () => void;
}

export function EnterpriseFooter({
  onOpenDLPShield,
  onOpenCommandPalette,
}: EnterpriseFooterProps) {
  return (
    <footer className="mt-16 sm:mt-20 pt-8 pb-12 border-t border-slate-200/80 dark:border-white/[0.08] text-xs font-mono select-none">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Brand & Architecture Identity */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 text-center sm:text-left">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="font-bold text-slate-900 dark:text-white tracking-tight">
                BYTHERIX <span className="text-indigo-600 dark:text-indigo-400">EAM</span>
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 font-bold">
                v1.0.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
              Enterprise AI Management & Grounded LLM Observability
            </p>
          </div>
        </div>

        {/* Center: Real-Time Operational Posture */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onOpenDLPShield}
            title="Inspect SOC 2 DLP Shield Enforcements"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-[10px] cursor-pointer transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">SOC 2 & ISO 27001</span>
          </button>

          <button
            type="button"
            onClick={onOpenDLPShield}
            title="Inspect Data Loss Prevention & Zero Retention"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08] text-[10px] cursor-pointer transition-colors"
          >
            <ShieldCheck className="w-3 h-3 text-indigo-500" />
            <span>AES-256 GCM</span>
          </button>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08] text-[10px]">
            <Activity className="w-3 h-3 text-emerald-500" />
            <span>API Gateway: Operational</span>
          </div>
        </div>

        {/* Right: Copyright & Command Palette Shortcut */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-right">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            <p>&copy; 2026 Bytherix Technology Pvt. Ltd.</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Multi-tenant isolation verified</p>
          </div>

          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              title="Open Command Palette (⌘K)"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-slate-200/80 dark:border-white/[0.08] text-[10px] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
            >
              <Terminal className="w-3 h-3 text-indigo-500" />
              <span>⌘K</span>
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
