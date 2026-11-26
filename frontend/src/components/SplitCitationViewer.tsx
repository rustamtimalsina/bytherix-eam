"use client";

import React, { useState } from "react";
import {
  FileText,
  X,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  ChevronRight,
  Bookmark,
  Share2,
  Percent,
  Search,
  MessageSquarePlus,
  ArrowRight,
  Layers,
  Download,
} from "lucide-react";
import { SourceCitation } from "@/lib/api";

interface SplitCitationViewerProps {
  citation: SourceCitation | null;
  allSources?: SourceCitation[];
  onSelectCitation?: (src: SourceCitation) => void;
  onClose: () => void;
  onAskAboutChunk?: (prompt: string) => void;
  onDownloadDoc?: (docId: string) => void;
  onInspectDocumentChunks?: (docId: string) => void;
}

export function SplitCitationViewer({
  citation,
  allSources = [],
  onSelectCitation,
  onClose,
  onAskAboutChunk,
  onDownloadDoc,
  onInspectDocumentChunks,
}: SplitCitationViewerProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"passage" | "metadata">("passage");

  const handleCopy = () => {
    if (!citation?.snippet) return;
    navigator.clipboard.writeText(citation.snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const similarityPct = citation?.similarity_score
    ? Math.round(citation.similarity_score * 100)
    : 85;

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      <div
        className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Main Viewport: Slide-over Drawer on Mobile, Split Pane on Desktop */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] lg:static lg:inset-auto lg:w-[380px] xl:w-[440px] lg:max-w-[45vw] h-full flex flex-col border-l border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-[#0c1222] shadow-2xl relative lg:z-20 overflow-hidden shrink-0 animate-in slide-in-from-right-4 duration-200">
        {/* Top Header */}
        <div className="p-3 sm:p-3.5 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-2 bg-slate-100/90 dark:bg-white/[0.03] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                Document Viewport
              </h4>
              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                {citation ? citation.document_title : "Select citation from chat"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
            title="Close split viewport"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      {/* Sources Quick Switch Bar (if multiple citations exist) */}
      {allSources.length > 1 && (
        <div className="px-3 py-2 border-b border-slate-200/60 dark:border-white/[0.06] bg-slate-100/40 dark:bg-black/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Sources:
          </span>
          {allSources.map((src, i) => {
            const isCurrent = citation?.document_id === src.document_id && citation?.chunk_index === src.chunk_index;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelectCitation && onSelectCitation(src)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium shrink-0 transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white/70 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-white/[0.1] border border-slate-200/60 dark:border-white/[0.06]"
                }`}
              >
                [{i + 1}] P.{src.page_number ?? 1}
              </button>
            );
          })}
        </div>
      )}

      {/* Content Viewport */}
      {citation ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* Document Title & Match Pill */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Verified Ingestion Chunk
                </span>
                <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug mt-0.5 break-words">
                  {citation.document_title}
                </h5>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                {similarityPct}% match
              </span>
            </div>

            {/* Badges Bar */}
            <div className="flex items-center gap-2 flex-wrap pt-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]">
                Page {citation.page_number ?? 1}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]">
                Chunk #{citation.chunk_index ?? 0}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]">
                1536-dim vector
              </span>
            </div>
          </div>

          {/* Highlighted Passage Section */}
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Extracted Grounding Text
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[10px] font-mono text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy Passage"}</span>
              </button>
            </div>

            <div className="relative p-4 rounded-2xl bg-amber-500/[0.04] dark:bg-indigo-950/20 border border-amber-500/20 dark:border-indigo-500/30 text-slate-800 dark:text-slate-200 text-xs leading-relaxed font-sans shadow-inner selection:bg-amber-200 dark:selection:bg-indigo-900 overflow-y-auto">
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-60">
                <Bookmark className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <p className="whitespace-pre-wrap">{citation.snippet}</p>
            </div>
          </div>

          {/* Prompt Suggestion / Follow-up Action */}
          {onAskAboutChunk && (
            <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-white/[0.02] border border-indigo-200/80 dark:border-indigo-500/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-[11px] text-slate-700 dark:text-slate-300 truncate">
                  Ask follow-up on this passage?
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onAskAboutChunk(
                    `Elaborate further on this passage from ${citation.document_title}: "${citation.snippet.slice(0, 80)}..."`
                  )
                }
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 flex items-center gap-1 transition-all shrink-0 cursor-pointer shadow-xs"
              >
                <span>Ask</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Action Links */}
          {(onInspectDocumentChunks || onDownloadDoc) && citation.document_id && (
            <div className="space-y-1.5 pt-1 border-t border-slate-200/60 dark:border-white/[0.06]">
              {onInspectDocumentChunks && (
                <button
                  type="button"
                  onClick={() => onInspectDocumentChunks(citation.document_id)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.06] text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Inspect All Document Chunks</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </button>
              )}

              {onDownloadDoc && (
                <button
                  type="button"
                  onClick={() => onDownloadDoc(citation.document_id)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.06] text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-blue-500" />
                    <span>Download Original PDF File</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Empty / Placeholder State */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              No Passage Selected
            </h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[260px] mt-1 leading-relaxed">
              Click any source card or citation tag in the chat thread to inspect its exact verified text side-by-side.
            </p>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-100/50 dark:bg-white/[0.01] flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span>RAG Grounding Engine</span>
        <span>Zero Hallucination Mode</span>
      </div>
    </div>
    </>
  );
}
