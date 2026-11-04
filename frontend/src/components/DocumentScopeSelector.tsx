"use client";

import React, { useState, useRef, useEffect } from "react";
import { Filter, ChevronDown, CheckSquare, Square, Layers, Check } from "lucide-react";

export interface DocumentItem {
  id: string;
  title: string;
  file_type?: string;
  file_size?: number;
  status: string;
  total_pages?: number;
  total_chunks?: number;
  created_at: string;
}

interface DocumentScopeSelectorProps {
  documents: DocumentItem[];
  selectedDocIds: string[];
  onToggleDoc: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export function DocumentScopeSelector({
  documents,
  selectedDocIds,
  onToggleDoc,
  onSelectAll,
  onClearAll,
}: DocumentScopeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const readyDocs = documents.filter((d) => d.status.toLowerCase() === "ready");
  const selectedCount = selectedDocIds.length;
  const isFiltered = selectedCount > 0 && selectedCount < readyDocs.length;

  const getLabel = () => {
    if (readyDocs.length === 0) return "No Docs";
    if (selectedCount === 0) return `All (${readyDocs.length})`;
    if (selectedCount === 1) {
      const doc = documents.find((d) => d.id === selectedDocIds[0]);
      return doc?.title ? (doc.title.length > 14 ? doc.title.slice(0, 12) + "..." : doc.title) : "1 Doc";
    }
    return `${selectedCount}/${readyDocs.length} Docs`;
  };

  return (
    <div className="relative inline-block text-left shrink-0 z-30" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-mono font-medium transition-all duration-150 border cursor-pointer select-none active:scale-95 shrink-0 ${
          isFiltered
            ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40 shadow-xs"
            : "bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-200/70 dark:hover:bg-white/[0.08]"
        }`}
        title="Constrain RAG query scope to specific documents (Section 8.2)"
      >
        <Filter className={`w-3 h-3 shrink-0 ${isFiltered ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`} />
        <span className="hidden sm:inline text-slate-500 dark:text-slate-400">Scope:</span>
        <span className="font-semibold">{getLabel()}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Panel - Elevated z-50 and explicitly isolated stacking context */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.1] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/10"
          style={{
            boxShadow: "0 25px 40px -10px rgba(0, 0, 0, 0.35), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
          }}
        >
          {/* Header */}
          <div className="p-3 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Retrieval Scope</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                {readyDocs.length} indexed
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Select documents to constrain RAG query answers.
            </p>
          </div>

          {/* Quick Action Bar */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-white/[0.05] bg-slate-50/40 dark:bg-transparent flex items-center justify-between text-[11px] font-mono">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
            >
              Select All
            </button>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <button
              type="button"
              onClick={onClearAll}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:underline cursor-pointer"
            >
              Clear Filter ({selectedCount})
            </button>
          </div>

          {/* Document List */}
          <div className="max-h-60 overflow-y-auto p-2 space-y-1">
            {readyDocs.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                No indexed documents ready. Upload a PDF in the Documents tab.
              </div>
            ) : (
              readyDocs.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => onToggleDoc(doc.id)}
                    className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer text-xs select-none transition-colors duration-150 ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-500/30"
                        : "hover:bg-slate-100 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300 border border-transparent"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-xs">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                        {doc.total_pages ? <span>{doc.total_pages} pages</span> : null}
                        {doc.total_chunks ? <span>&bull; {doc.total_chunks} chunks</span> : null}
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">&bull; 1536-dim</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with Done Button */}
          <div className="p-2.5 border-t border-slate-100 dark:border-white/[0.05] bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between text-[11px]">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              pgvector isolated
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              <span>Done</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
