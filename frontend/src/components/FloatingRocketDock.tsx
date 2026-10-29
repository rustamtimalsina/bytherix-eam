"use client";

import React from "react";
import { FileText, MessageSquare, Key, Users, Rocket } from "lucide-react";

export type ActiveTab = "documents" | "chat" | "apikeys" | "team";

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
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-2 rounded-full bg-[#0b101e]/80 border border-white/15 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(59,130,246,0.15)] transition-all duration-300 hover:border-white/25 hover:shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(99,102,241,0.25)]"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all duration-300 ${
              isActive
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-white/20"
                : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
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
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive ? "bg-white/20 text-white" : "bg-white/10 text-slate-300"
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
