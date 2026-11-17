"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Receipt,
  UserPlus,
  Copy,
  Check,
} from "lucide-react";
import { ActiveTab } from "./FloatingRocketDock";

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Navigation" | "Quick Actions" | "Billing & Team" | "Documents";
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
  canAccessModels?: boolean;
  canAccessApiKeys?: boolean;
  canAccessAudit?: boolean;
  canUpgradePlan?: boolean;
  canSeedDemo?: boolean;
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
  canAccessModels = true,
  canAccessApiKeys = true,
  canAccessAudit = true,
  canUpgradePlan = true,
  canSeedDemo = true,
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedOrgId, setCopiedOrgId] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
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
      setCopiedOrgId(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build command catalogue
  const commands: CommandItem[] = useMemo(() => {
    return [
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
      ...(canAccessModels
        ? [
            {
              id: "nav-models",
              title: "MLOps Model Registry",
              subtitle: "Production version deployments and rollbacks",
              category: "Navigation" as const,
              shortcut: "G M",
              icon: <Cpu className="w-4 h-4 text-cyan-500" />,
              action: () => {
                onSelectTab("models");
                onClose();
              },
            },
          ]
        : []),
      ...(canAccessApiKeys
        ? [
            {
              id: "nav-apikeys",
              title: "API Keys & Developer Portal",
              subtitle: "Machine credentials and SDK quickstart",
              category: "Navigation" as const,
              shortcut: "G K",
              icon: <Key className="w-4 h-4 text-amber-500" />,
              action: () => {
                onSelectTab("apikeys");
                onClose();
              },
            },
          ]
        : []),
      ...(canAccessAudit
        ? [
            {
              id: "nav-audit",
              title: "Enterprise Audit & Observability",
              subtitle: "SOC 2 immutable log and Prometheus bus",
              category: "Navigation" as const,
              shortcut: "G L",
              icon: <ShieldCheck className="w-4 h-4 text-rose-500" />,
              action: () => {
                onSelectTab("audit");
                onClose();
              },
            },
          ]
        : []),

      // 2. Billing & Team Management
      {
        id: "act-billing-invoices",
        title: "Billing Invoices & Receipts",
        subtitle: "Review monthly transaction history and download A4 tax receipts",
        category: "Billing & Team",
        shortcut: "B I",
        icon: <Receipt className="w-4 h-4 text-emerald-400" />,
        action: () => {
          onSelectTab("team");
          onClose();
          setTimeout(() => {
            document
              .querySelector("text=Billing Invoices & Receipts")
              ?.scrollIntoView({ behavior: "smooth" });
          }, 150);
        },
      },
      {
        id: "act-invite-member",
        title: "Invite Organization Member",
        subtitle: "Dispatch single-use cryptographic invitation tokens with RBAC",
        category: "Billing & Team",
        shortcut: "I M",
        icon: <UserPlus className="w-4 h-4 text-blue-400" />,
        action: () => {
          onSelectTab("team");
          onClose();
        },
      },
      {
        id: "act-copy-org-id",
        title: "Copy Tenant Organization ID",
        subtitle: "Copy current active organization UUID to clipboard",
        category: "Billing & Team",
        shortcut: "⌘ C",
        icon: copiedOrgId ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <Copy className="w-4 h-4 text-slate-400" />
        ),
        action: () => {
          const org = localStorage.getItem("bytherix_org") || "";
          if (org) {
            navigator.clipboard.writeText(org);
            setCopiedOrgId(true);
            setTimeout(() => onClose(), 600);
          }
        },
      },

      // 3. Quick Actions
      ...(onOpenUpgradeModal && canUpgradePlan
        ? [
            {
              id: "act-upgrade-plan",
              title: "Upgrade Subscription Plan",
              subtitle: "Elevate monthly tokens, vector capacity, and MLOps limits",
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
      ...(onSeedDemo && canSeedDemo
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
              title: "Toggle Theme Mode",
              subtitle: "Switch between Dark Obsidian and Architectural Slate",
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

      // 4. Ingested Documents
      ...documents.map((doc) => ({
        id: `doc-${doc.id}`,
        title: doc.title || doc.filename,
        subtitle: `Inspect 1536-dim chunk vectors in ${doc.filename}`,
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
  }, [
    canAccessModels,
    canAccessApiKeys,
    canAccessAudit,
    canUpgradePlan,
    canSeedDemo,
    copiedOrgId,
    documents,
    onClose,
    onInspectDocument,
    onNewThread,
    onOpenDLPShield,
    onOpenUpgradeModal,
    onSeedDemo,
    onSelectTab,
    onToggleTheme,
  ]);

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const lowerQuery = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(lowerQuery) ||
        (cmd.subtitle && cmd.subtitle.toLowerCase().includes(lowerQuery)) ||
        cmd.category.toLowerCase().includes(lowerQuery)
    );
  }, [commands, query]);

  // Group commands by category while preserving global selectedIndex
  const groupedCategories = useMemo(() => {
    const groups: { [key: string]: { command: CommandItem; globalIndex: number }[] } = {};
    filteredCommands.forEach((cmd, idx) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push({ command: cmd, globalIndex: idx });
    });
    return groups;
  }, [filteredCommands]);

  // Smooth auto-scroll active item into view
  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  // Keyboard navigation
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/[0.1] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 select-none ring-1 ring-black/5 dark:ring-white/10"
        style={{
          boxShadow:
            "0 25px 60px -15px rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02]">
          <Search className="w-4 h-4 text-indigo-500 dark:text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, search documents, or jump to view..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none font-medium"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery("");
                setSelectedIndex(0);
              }}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Clear input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 border border-slate-200 dark:border-white/10">
              ESC
            </span>
          )}
        </div>

        {/* Results List Grouped by Raycast Category */}
        <div className="max-h-[390px] overflow-y-auto p-2 space-y-3">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-mono">
              No matching commands or assets found for &quot;{query}&quot;
            </div>
          ) : (
            Object.entries(groupedCategories).map(([category, items]) => (
              <div key={category} className="space-y-1">
                {/* Raycast-style category section pill */}
                <div className="px-2.5 py-1 text-[10px] font-mono font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center justify-between">
                  <span>{category}</span>
                  <span className="text-[9px] opacity-60">{items.length}</span>
                </div>

                {/* Items in this category */}
                <div className="space-y-0.5">
                  {items.map(({ command: cmd, globalIndex }) => {
                    const isSelected = globalIndex === selectedIndex;
                    return (
                      <div
                        key={cmd.id}
                        ref={(el) => {
                          itemRefs.current[globalIndex] = el;
                        }}
                        onClick={cmd.action}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`group flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition-all duration-150 ${
                          isSelected
                            ? "bg-indigo-50/95 dark:bg-indigo-500/15 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500/20 dark:ring-indigo-500/30 shadow-xs"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "bg-indigo-600/15 dark:bg-cyan-500/20 text-indigo-600 dark:text-cyan-300"
                                : "bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {cmd.icon}
                          </div>
                          <div className="truncate min-w-0 flex-1">
                            <span className="font-semibold truncate block">
                              {cmd.title}
                            </span>
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
                                  ? "bg-indigo-600 text-white border-indigo-600 dark:bg-cyan-500 dark:text-slate-950 dark:border-cyan-500 shadow-xs"
                                  : "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10"
                              }`}
                            >
                              {cmd.shortcut}
                            </span>
                          )}
                          {isSelected && (
                            <CornerDownLeft className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400 shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Shortcut Bar */}
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
              Execute
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
