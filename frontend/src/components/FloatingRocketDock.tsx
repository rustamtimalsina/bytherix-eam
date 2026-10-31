"use client";

import React from "react";
import { FileText, MessageSquare, Bot, Cpu, Key, Users, Rocket, ShieldCheck } from "lucide-react";

export type ActiveTab = "documents" | "chat" | "agents" | "models" | "apikeys" | "audit" | "team";

interface FloatingRocketDockProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  documentCount: number;
  apiKeyCount: number;
}

export function FloatingRocketDock({
  activeTab,
  setActiveTab,
  documentCount,
  apiKeyCount,
}: FloatingRocketDockProps) {
  const tabs = [
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

  return (
    <nav
      aria-label="Platform navigation dock"
      className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-full bg-white/95 dark:bg-[#0b101e]/95 border border-slate-200 dark:border-white/15 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-all duration-200 max-w-[calc(100vw-16px)] sm:max-w-max overflow-x-auto scrollbar-none"
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
            className={`relative flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 md:px-4 py-1.5 sm:py-2.5 rounded-full text-xs font-semibold whitespace-nowrap outline-none focus:outline-none focus:ring-0 select-none transition-all duration-150 shrink-0 border ${
              isActive
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] border-white/20"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]"
            }`}
          >
            {/* Active Rocket Thruster */}
            {isActive && (
              <span className="relative flex items-center justify-center shrink-0">
                <Rocket className="w-3.5 h-3.5 text-amber-300 -rotate-45" />
                <span className="absolute -bottom-1 -left-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              </span>
            )}

            {!isActive && <Icon className="w-3.5 h-3.5 shrink-0" />}

            {/* On mobile (<md), active tab shows full label, inactive tabs hide text to fit all 6 tabs without clipping */}
            <span className={isActive ? "inline" : "hidden md:inline"}>
              {tab.label}
            </span>

            {tab.badge !== null && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono leading-none shrink-0 ${
                  isActive ? "bg-white/25 text-white" : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300"
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
