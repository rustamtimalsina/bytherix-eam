"use client";

import React, { useEffect, useState } from "react";
import { 
  Sparkles, 
  X, 
  Clock, 
  Tag, 
  FileText, 
  MessageSquare, 
  ArrowRight, 
  Layers, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { api, DocumentInsightResponse } from "@/lib/api";

interface DocumentBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string | null;
  documentTitle: string;
  onSelectPrompt: (prompt: string) => void;
}

export const DocumentBriefingModal: React.FC<DocumentBriefingModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  onSelectPrompt,
}) => {
  const [insight, setInsight] = useState<DocumentInsightResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !documentId) {
      setInsight(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api.getDocumentInsights(documentId)
      .then((data) => {
        if (isMounted) {
          setInsight(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || "Failed to load document briefing.");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, documentId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner with Gradient Accent */}
        <div className="relative p-5 sm:p-6 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    AI Executive Briefing
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                    Grounded Intelligence
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-md mt-0.5">
                  {documentTitle}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          {insight && (
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Reading Time: <strong>~{insight.reading_time_minutes} min</strong></span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <Layers className="w-3.5 h-3.5 text-purple-500" />
                <span>Indexed Chunks: <strong>{insight.total_chunks}</strong></span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                <span>Pages: <strong>{insight.total_pages}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {isLoading && (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 animate-pulse">
                Synthesizing executive briefing across pgvector embeddings...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {insight && !isLoading && (
            <>
              {/* 1. Executive Summary Bullets */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Executive TL;DR Summary</span>
                </h4>
                <div className="space-y-2">
                  {insight.executive_summary.map((bullet, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex items-start gap-3"
                    >
                      <span className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {bullet}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Key Topics Tag Cloud */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Key Domain Topics</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {insight.key_topics.map((topic, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10"
                    >
                      #{topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* 3. One-Click Suggested Prompt Chips */}
              <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                    <span>Instant Questions (Click to Ask AI)</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">1-Click Grounded QA</span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {insight.suggested_questions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onSelectPrompt(question);
                        onClose();
                      }}
                      className="group p-3 rounded-xl bg-gradient-to-r from-purple-500/5 to-indigo-500/5 hover:from-purple-500/15 hover:to-indigo-500/15 border border-purple-500/20 hover:border-purple-500/40 text-left flex items-center justify-between gap-3 transition-all duration-200 cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <MessageSquare className="w-3 h-3" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {question}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 opacity-80 group-hover:opacity-100 shrink-0">
                        <span>Ask</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
            Zero-Leak DLP Shield & pgvector verified
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white font-semibold hover:bg-slate-300 dark:hover:bg-white/15 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
