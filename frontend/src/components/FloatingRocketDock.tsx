"use client";

import React from "react";
import { FileText, MessageSquare, Bot, Key, Users, Rocket } from "lucide-react";

export type ActiveTab = "documents" | "chat" | "agents" | "apikeys" | "team";

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
      id: "apikeys" as ActiveTab,
      label: "API Keys",
      icon: Key,
      badge: apiKeyCount,
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
      className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1.5 sm:p-2 rounded-full bg-white/95 dark:bg-[#0b101e]/90 border border-slate-200 dark:border-white/15 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-all duration-300 max-w-[calc(100vw-24px)]"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-semibold transition-all duration-300 whitespace-nowrap ${
              isActive
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-white/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]"
            }`}
          >
            {/* Active Rocket Thruster */}
            {isActive && (
              <span className="relative flex items-center justify-center">
                <Rocket className="w-3.5 h-3.5 text-amber-300 -rotate-45" />
                <span className="absolute -bottom-1 -left-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              </span>
            )}

            {!isActive && <Icon className="w-3.5 h-3.5" />}

            <span>{tab.label}</span>

            {tab.badge !== null && (
              <span
                className={`ml-0.5 sm:ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
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
