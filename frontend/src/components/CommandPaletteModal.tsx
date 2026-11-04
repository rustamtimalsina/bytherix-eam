"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  LayoutDashboard,
  FileText,
  MessageSquare,
  Bot,
  Cpu,
  Key,
  ShieldCheck,
  Sparkles,
  Plus,
  SunMoon,
  CornerDownLeft,
  X,
  Zap,
} from "lucide-react";
import { ActiveTab } from "./FloatingRocketDock";

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Navigation" | "Quick Actions" | "Documents";
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: ActiveTab) => void;
  onNewThread?: () => void;
  onSeedDemo?: () => void;
  onToggleTheme?: () => void;
  onOpenDLPShield?: () => void;
  onOpenUpgradeModal?: () => void;
  documents?: Array<{ id: string; title?: string; filename: string }>;
  onInspectDocument?: (docId: string) => void;
}

export function CommandPaletteModal({
  isOpen,
  onClose,
  onSelectTab,
  onNewThread,
  onSeedDemo,
  onToggleTheme,
  onOpenDLPShield,
  onOpenUpgradeModal,
  documents = [],
  onInspectDocument,
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global Ctrl+K / Cmd+K key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open palette
          const event = new CustomEvent("open-command-palette");
          window.dispatchEvent(event);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build command list
  const commands: CommandItem[] = [
    // 1. Navigation Commands
    {
      id: "nav-workspace",
      title: "Workspace & Quotas",
      subtitle: "Multi-tenant telemetry and subscription boundaries",
      category: "Navigation",
      shortcut: "G W",
      icon: <LayoutDashboard className="w-4 h-4 text-blue-500" />,
      action: () => {
        onSelectTab("team");
        onClose();
      },
    },
    {
      id: "nav-documents",
      title: "Knowledge Library",
      subtitle: "Ingested PDF assets and pgvector index",
      category: "Navigation",
      shortcut: "G D",
      icon: <FileText className="w-4 h-4 text-indigo-500" />,
      action: () => {
        onSelectTab("documents");
        onClose();
      },
    },
    {
      id: "nav-chat",
      title: "Grounded RAG QA",
      subtitle: "Hybrid retrieval chat with verbatim citations",
      category: "Navigation",
      shortcut: "G C",
      icon: <MessageSquare className="w-4 h-4 text-emerald-500" />,
      action: () => {
        onSelectTab("chat");
        onClose();
      },
    },
    {
      id: "nav-agents",
      title: "Governed Agent Workflows",
      subtitle: "Allowlisted tools and human-in-the-loop gates",
      category: "Navigation",
      shortcut: "G A",
      icon: <Bot className="w-4 h-4 text-purple-500" />,
      action: () => {
        onSelectTab("agents");
        onClose();
      },
    },
    {
      id: "nav-models",
      title: "MLOps Model Registry",
      subtitle: "Production version deployments and rollbacks",
      category: "Navigation",
      shortcut: "G M",
      icon: <Cpu className="w-4 h-4 text-cyan-500" />,
      action: () => {
        onSelectTab("models");
        onClose();
      },
    },
    {
      id: "nav-apikeys",
      title: "API Keys & Developer Portal",
      subtitle: "Machine credentials and SDK quickstart",
      category: "Navigation",
      shortcut: "G K",
      icon: <Key className="w-4 h-4 text-amber-500" />,
      action: () => {
        onSelectTab("apikeys");
        onClose();
      },
    },
    {
      id: "nav-audit",
      title: "Enterprise Audit & Observability",
      subtitle: "SOC 2 immutable log and Prometheus bus",
      category: "Navigation",
      shortcut: "G L",
      icon: <ShieldCheck className="w-4 h-4 text-rose-500" />,
      action: () => {
        onSelectTab("audit");
        onClose();
      },
    },

    // 2. Quick Actions
    ...(onOpenUpgradeModal
      ? [
          {
            id: "act-upgrade-plan",
            title: "Upgrade Subscription Plan",
            subtitle: "Elevate monthly tokens, vector capacity, and MLOps limits (§ 7.3)",
            category: "Quick Actions" as const,
            shortcut: "U P",
            icon: <Zap className="w-4 h-4 text-amber-500" />,
            action: () => {
              onOpenUpgradeModal();
              onClose();
            },
          },
        ]
      : []),
    ...(onSeedDemo
      ? [
          {
            id: "act-seed-demo",
            title: "Seed Demo Technical Specification",
            subtitle: "Load authoritative Bytherix EAM architecture PDF",
            category: "Quick Actions" as const,
            shortcut: "⚡",
            icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
            action: () => {
              onSelectTab("documents");
              onSeedDemo();
              onClose();
            },
          },
        ]
      : []),
    ...(onNewThread
      ? [
          {
            id: "act-new-thread",
            title: "Start Fresh Chat Thread",
            subtitle: "Create a new conversation session in RAG QA",
            category: "Quick Actions" as const,
            shortcut: "N",
            icon: <Plus className="w-4 h-4 text-emerald-400" />,
            action: () => {
              onSelectTab("chat");
              onNewThread();
              onClose();
            },
          },
        ]
      : []),
    ...(onOpenDLPShield
      ? [
          {
            id: "act-dlp-shield",
            title: "Inspect DLP Shield Redaction Rules",
            subtitle: "Zero-leak PII masking and API key guard",
            category: "Quick Actions" as const,
            shortcut: "DLP",
            icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
            action: () => {
              onOpenDLPShield();
              onClose();
            },
          },
        ]
      : []),
    ...(onToggleTheme
      ? [
          {
            id: "act-toggle-theme",
            title: "Toggle Cosmic Theme",
            subtitle: "Switch between Dark Obsidian and Clean Light mode",
            category: "Quick Actions" as const,
            shortcut: "T",
            icon: <SunMoon className="w-4 h-4 text-amber-400" />,
            action: () => {
              onToggleTheme();
              onClose();
            },
          },
        ]
      : []),

    // 3. Document Items
    ...documents.map((doc) => ({
      id: `doc-${doc.id}`,
      title: doc.title || doc.filename,
      subtitle: `Open and inspect 1536-dim chunk vectors in ${doc.filename}`,
      category: "Documents" as const,
      shortcut: "PDF",
      icon: <FileText className="w-4 h-4 text-blue-400" />,
      action: () => {
        onSelectTab("documents");
        if (onInspectDocument) {
          onInspectDocument(doc.id);
        }
        onClose();
      },
    })),
  ];

  // Filter commands by search query
  const filteredCommands = commands.filter((cmd) => {
    if (!query.trim()) return true;
    const lowerQuery = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(lowerQuery) ||
      (cmd.subtitle && cmd.subtitle.toLowerCase().includes(lowerQuery)) ||
      cmd.category.toLowerCase().includes(lowerQuery)
    );
  });

  // Handle keyboard navigation inside the palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredCommands.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredCommands.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 p-4 bg-black/60 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/[0.1] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 select-none"
        style={{
          boxShadow:
            "0 25px 60px -15px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, search documents, or jump to view..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 border border-slate-200 dark:border-white/10">
              ESC
            </span>
          )}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[380px] overflow-y-auto p-2 space-y-1 divide-y divide-slate-100 dark:divide-white/[0.04]"
        >
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-mono">
              No matching commands or assets found for &quot;{query}&quot;
            </div>
          ) : (
            filteredCommands.map((cmd, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all duration-150 ${
                    isSelected
                      ? "bg-indigo-50/90 dark:bg-indigo-500/15 text-indigo-900 dark:text-indigo-200"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-indigo-600/15 dark:bg-indigo-500/25 text-indigo-600 dark:text-indigo-300"
                          : "bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {cmd.icon}
                    </div>
                    <div className="truncate min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{cmd.title}</span>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {cmd.category}
                        </span>
                      </div>
                      {cmd.subtitle && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {cmd.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {cmd.shortcut && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10"
                        }`}
                      >
                        {cmd.shortcut}
                      </span>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hint Bar */}
        <div className="px-4 py-2.5 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-[10px] font-bold">
                &uarr;&darr;
              </kbd>{" "}
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-[10px] font-bold">
                &crarr;
              </kbd>{" "}
              Select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-[10px] font-bold">
              ESC
            </kbd>{" "}
            Close
          </span>
        </div>
      </div>
    </div>
  );
}
