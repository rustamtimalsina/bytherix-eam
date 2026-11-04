"use client";

import React from "react";
import { FileText, MessageSquare, Bot, Cpu, Key, Users, Rocket, ShieldCheck } from "lucide-react";

export type ActiveTab = "documents" | "chat" | "agents" | "models" | "apikeys" | "audit" | "team";

interface FloatingRocketDockProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  documentCount: number;
  apiKeyCount: number;
  canAccessApiKeys?: boolean;
  canAccessAudit?: boolean;
  canAccessModels?: boolean;
}

export function FloatingRocketDock({
  activeTab,
  setActiveTab,
  documentCount,
  apiKeyCount,
  canAccessApiKeys = true,
  canAccessAudit = true,
  canAccessModels = true,
}: FloatingRocketDockProps) {
  const allTabs = [
    {
      id: "documents" as ActiveTab,
      label: "Documents",
      icon: FileText,
      badge: documentCount,
    },
    {
      id: "chat" as ActiveTab,
      label: "RAG AI",
      icon: MessageSquare,
      badge: null,
    },
    {
      id: "agents" as ActiveTab,
      label: "Agents",
      icon: Bot,
      badge: null,
    },
    {
      id: "models" as ActiveTab,
      label: "Models",
      icon: Cpu,
      badge: null,
    },
    {
      id: "apikeys" as ActiveTab,
      label: "API Keys",
      icon: Key,
      badge: apiKeyCount,
    },
    {
      id: "audit" as ActiveTab,
      label: "Audit",
      icon: ShieldCheck,
      badge: null,
    },
    {
      id: "team" as ActiveTab,
      label: "Workspace",
      icon: Users,
      badge: null,
    },
  ];

  const tabs = allTabs.filter((tab) => {
    if (tab.id === "apikeys" && !canAccessApiKeys) return false;
    if (tab.id === "audit" && !canAccessAudit) return false;
    if (tab.id === "models" && !canAccessModels) return false;
    return true;
  });

  return (
    <nav
      aria-label="Platform navigation dock"
      className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-full bg-white/95 dark:bg-[#0b101e]/95 border border-slate-200 dark:border-white/15 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_25px_60px_rgba(99,102,241,0.2)] transition-all duration-300 max-w-[calc(100vw-16px)] sm:max-w-max overflow-x-auto scrollbar-none"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
            aria-label={tab.label}
            className={`group relative flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 md:px-4 py-1.5 sm:py-2.5 rounded-full text-xs font-semibold whitespace-nowrap outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 select-none shrink-0 border cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              isActive
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-[0_6px_25px_rgba(99,102,241,0.55),0_0_12px_rgba(99,102,241,0.35)] border-white/20 -translate-y-0.5 sm:-translate-y-1 scale-[1.02] hover:-translate-y-1.5 sm:hover:-translate-y-2 hover:scale-[1.06] active:scale-95 active:translate-y-0"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:-translate-y-1 sm:hover:-translate-y-1.5 hover:scale-[1.05] active:scale-95 active:translate-y-0"
            }`}
          >
            {/* Active Rocket Thruster */}
            {isActive && (
              <span className="relative flex items-center justify-center shrink-0">
                <Rocket className="w-3.5 h-3.5 text-amber-300 -rotate-45 transition-transform duration-300 group-hover:scale-125 group-hover:-translate-y-0.5" />
                <span className="absolute -bottom-1 -left-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              </span>
            )}

            {!isActive && (
              <Icon className="w-3.5 h-3.5 shrink-0 transition-transform duration-300 ease-out group-hover:scale-125 text-slate-500 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400" />
            )}

            {/* On mobile (<md), active tab shows full label, inactive tabs hide text to fit all 6-7 tabs without clipping */}
            <span className={`tracking-wide ${isActive ? "inline" : "hidden md:inline"}`}>
              {tab.label}
            </span>

            {/* Dynamic Badge Counter with hover micro-pop */}
            {tab.badge !== null && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono leading-none shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                  isActive
                    ? "bg-white/25 text-white"
                    : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-700 dark:group-hover:text-indigo-300"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
