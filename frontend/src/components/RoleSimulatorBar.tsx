"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  UserCheck,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Lock,
  Eye,
  Key,
  Cpu,
  Crown,
} from "lucide-react";

export type SimulatedRoleType =
  | "organization_owner"
  | "ai_ml_engineer"
  | "developer"
  | "compliance_auditor"
  | "viewer";

interface RoleOption {
  id: SimulatedRoleType;
  label: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: "organization_owner",
    label: "Organization Owner",
    badge: "Full Admin",
    description: "Unrestricted master access: billing, API keys, models, audit trail, member invites.",
    icon: Crown,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "ai_ml_engineer",
    label: "AI / MLOps Engineer",
    badge: "MLOps Access",
    description: "Can register, evaluate, and promote AI models; upload knowledge PDFs; run RAG queries.",
    icon: Cpu,
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  },
  {
    id: "developer",
    label: "Platform Developer",
    badge: "API Access",
    description: "Can generate high-entropy machine API keys, ingest PDFs, and integrate webhooks.",
    icon: Key,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "compliance_auditor",
    label: "Compliance Auditor",
    badge: "Audit Only",
    description: "Can inspect tamper-evident audit logs and read documents; cannot upload or delete.",
    icon: Eye,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "viewer",
    label: "Read-Only Viewer",
    badge: "Restricted",
    description: "Least-privilege member: can query knowledge base; cannot view audit trails or API keys.",
    icon: Lock,
    color: "text-slate-500 bg-slate-500/10 border-slate-500/20",
  },
];

interface RoleSimulatorBarProps {
  realRole: string;
  simulatedRole: SimulatedRoleType | null;
  onSelectRole: (role: SimulatedRoleType | null) => void;
}

export function RoleSimulatorBar({
  realRole,
  simulatedRole,
  onSelectRole,
}: RoleSimulatorBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentRoleKey = simulatedRole || (realRole as SimulatedRoleType) || "organization_owner";
  const activeOption = ROLE_OPTIONS.find((r) => r.id === currentRoleKey) || ROLE_OPTIONS[0];
  const Icon = activeOption.icon;
  const isSimulated = Boolean(simulatedRole && simulatedRole !== realRole);

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-md shadow-xs">
        {/* Simulator Pill Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none ${
            isSimulated
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
              : "text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/[0.06]"
          }`}
          title="Click to simulate different enterprise permission roles"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-600 dark:text-slate-300">
              Role:
            </span>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-bold border ${activeOption.color}`}>
              <Icon className="w-3 h-3" />
              <span>{activeOption.badge}</span>
            </span>
          </div>
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Reset button if simulating */}
        {isSimulated && (
          <button
            type="button"
            onClick={() => onSelectRole(null)}
            className="p-1 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
            title="Reset to your authenticated role"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-72 rounded-2xl bg-white/95 dark:bg-[#0f172a]/95 border border-slate-200 dark:border-white/10 shadow-2xl backdrop-blur-xl z-50 p-2 space-y-1 animate-fadeIn">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-white/[0.06]">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                Enterprise Role Simulator
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Test how Bytherix RBAC enforces strict least-privilege per role in real time.
              </p>
            </div>

            <div className="py-1 space-y-1">
              {ROLE_OPTIONS.map((opt) => {
                const isSelected = currentRoleKey === opt.id;
                const OptIcon = opt.icon;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onSelectRole(opt.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40"
                        : "hover:bg-slate-50 dark:hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${opt.color}`}>
                      <OptIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {opt.label}
                        </p>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-500">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-tight">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {isSimulated && (
              <div className="pt-1.5 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    onSelectRole(null);
                    setIsOpen(false);
                  }}
                  className="w-full text-center py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  Reset to Actual Role ({realRole?.replace(/_/g, " ") || "Owner"})
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
