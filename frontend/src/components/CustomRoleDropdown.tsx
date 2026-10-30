"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface RoleOption {
  value: string;
  label: string;
  desc?: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  { value: "organization_owner", label: "Owner", desc: "Full organization access & billing" },
  { value: "organization_administrator", label: "Admin", desc: "Full organization configuration" },
  { value: "developer", label: "Developer", desc: "API keys, docs & RAG ingestion" },
  { value: "ai_ml_engineer", label: "AI/ML Engineer", desc: "Model registry & RAG pipelines" },
  { value: "analyst", label: "Analyst", desc: "RAG queries & quota telemetry" },
  { value: "viewer", label: "Viewer", desc: "Read-only access across platform" },
];

export const INVITE_ROLE_OPTIONS: RoleOption[] = [
  { value: "organization_administrator", label: "Organization Administrator", desc: "Full organization & team configuration" },
  { value: "developer", label: "Developer", desc: "API keys, document ingestion, and RAG search" },
  { value: "ai_ml_engineer", label: "AI/ML Engineer", desc: "Model registry, training artifacts, and RAG" },
  { value: "analyst", label: "Analyst", desc: "RAG queries, analytics & quota telemetry" },
  { value: "viewer", label: "Viewer", desc: "Read-only access to documents and audit logs" },
];

interface CustomRoleDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options?: RoleOption[];
  disabled?: boolean;
  compact?: boolean;
  placeholder?: string;
}

export function CustomRoleDropdown({
  value,
  onChange,
  options = ROLE_OPTIONS,
  disabled = false,
  compact = false,
  placeholder = "Select role",
}: CustomRoleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer active:scale-[0.99]"
        } ${
          compact
            ? "px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-white/[0.12]"
            : "px-3.5 py-2.5 text-xs bg-slate-100 hover:bg-slate-200/80 dark:bg-black/50 dark:hover:bg-black/60 text-slate-900 dark:text-white border border-slate-300 dark:border-white/[0.1] shadow-inner"
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 ml-2 shrink-0 transition-transform duration-200 text-slate-500 dark:text-slate-400 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Floating Popout Menu with high-craft styling and guaranteed visibility */}
      {isOpen && !disabled && (
        <div
          className={`absolute z-50 mt-1.5 w-full min-w-[220px] rounded-2xl p-1.5 shadow-2xl transition-all border animate-in fade-in zoom-in-95 duration-150 ${
            compact ? "right-0 w-56" : "left-0"
          } bg-white dark:bg-[#0c1222] border-slate-200 dark:border-white/[0.12] text-slate-900 dark:text-white backdrop-blur-xl`}
        >
          <div className="space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                    isSelected
                      ? "bg-teal-50 dark:bg-teal-500/15 text-teal-800 dark:text-teal-200 font-bold"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08]"
                  }`}
                >
                  <div className="flex-1 pr-2">
                    <p className="text-xs leading-snug">{opt.label}</p>
                    {opt.desc && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5 leading-tight">
                        {opt.desc}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
