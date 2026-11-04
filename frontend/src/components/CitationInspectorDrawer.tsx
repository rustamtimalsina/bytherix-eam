"use client";

import React from "react";
import {
  X,
  FileText,
  Layers,
  Download,
  CheckCircle2,
  ExternalLink,
  Database,
} from "lucide-react";
import { SourceCitation } from "@/lib/api";

interface CitationInspectorDrawerProps {
  citation: SourceCitation | null;
  onClose: () => void;
  onInspectDocumentChunks?: (docId: string) => void;
  onDownloadDocument?: (docId: string) => void;
}

export function CitationInspectorDrawer({
  citation,
  onClose,
  onInspectDocumentChunks,
  onDownloadDocument,
}: CitationInspectorDrawerProps) {
  if (!citation) return null;

  const matchPercent = Math.min(100, Math.round(citation.similarity_score * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg h-full bg-white dark:bg-[#0c1220] border-l border-slate-200 dark:border-white/[0.1] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden"
        style={{
          boxShadow:
            "-15px 0 40px -10px rgba(0, 0, 0, 0.4), inset 1px 0 0 0 rgba(255, 255, 255, 0.08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5 min-w-0 pr-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {citation.document_title || "Verified Grounded Source"}
              </h3>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Provenance &bull; Page {citation.page_number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Similarity & Vector Match Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-500" />
                <span>Cosine Similarity</span>
              </span>
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {matchPercent}% Match
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${matchPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
              <div className="p-2 rounded-lg bg-white dark:bg-black/30 border border-slate-200/60 dark:border-white/[0.04]">
                <span className="text-[10px] text-slate-400 block">Vector Space</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">1536-dim HNSW</span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-black/30 border border-slate-200/60 dark:border-white/[0.04]">
                <span className="text-[10px] text-slate-400 block">Verification</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Grounded
                </span>
              </div>
            </div>
          </div>

          {/* Verbatim Matched Snippet */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Verbatim Extracted Context
            </span>
            <div className="p-4 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-500/20 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-serif italic selection:bg-indigo-500/30">
              &ldquo;{citation.snippet}&rdquo;
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Direct text segment extracted from the original PDF at ingestion time.
            </p>
          </div>

          {/* Action Links */}
          <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
            {onInspectDocumentChunks && (
              <button
                onClick={() => {
                  onInspectDocumentChunks(citation.document_id);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.06] text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span>Inspect All Document Chunks</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}

            {onDownloadDocument && (
              <button
                onClick={() => {
                  onDownloadDocument(citation.document_id);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.06] text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-500" />
                  <span>Download Original PDF File</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-3.5 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-white/[0.08] text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-white/[0.12] transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
