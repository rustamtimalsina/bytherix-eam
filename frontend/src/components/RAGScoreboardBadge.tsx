"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Activity,
  Sparkles,
} from "lucide-react";
import { RAGEvalData } from "@/lib/api";

interface RAGScoreboardBadgeProps {
  evaluation: RAGEvalData;
}

export function RAGScoreboardBadge({ evaluation }: RAGScoreboardBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const faithPercent = Math.round(evaluation.faithfulness_score * 100);
  const contextPercent = Math.round(evaluation.context_relevance_score * 100);
  const answerPercent = Math.round(evaluation.answer_relevance_score * 100);
  const hallucinationPercent = Math.max(0, 100 - faithPercent);

  const getRiskStyle = () => {
    switch (evaluation.hallucination_risk) {
      case "MINIMAL":
        return {
          pill: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/30",
          bar: "bg-emerald-500",
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
          label: "0% Hallucination",
        };
      case "LOW":
        return {
          pill: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-500/30",
          bar: "bg-blue-500",
          icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />,
          label: `${hallucinationPercent}% Variance`,
        };
      case "MODERATE":
        return {
          pill: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500/30",
          bar: "bg-amber-500",
          icon: <Activity className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />,
          label: `${hallucinationPercent}% Hallucination Risk`,
        };
      default:
        return {
          pill: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-500/30",
          bar: "bg-rose-500",
          icon: <Activity className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />,
          label: "Elevated Risk",
        };
    }
  };

  const style = getRiskStyle();

  return (
    <div className="inline-block select-none my-1">
      {/* Clickable Capsule Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-mono font-semibold border transition-all duration-200 shadow-xs hover:opacity-90 active:scale-95 ${style.pill}`}
        title="View RAG Triad Grounding & Hallucination Metrics"
      >
        {style.icon}
        <span className="font-bold">{faithPercent}% Grounded</span>
        <span className="opacity-40">•</span>
        <span>{style.label}</span>
        {isOpen ? (
          <ChevronUp className="w-3 h-3 ml-0.5 opacity-60" />
        ) : (
          <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
        )}
      </button>

      {/* Expandable Scoreboard Drawer */}
      {isOpen && (
        <div className="mt-2 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0c1222] text-slate-900 dark:text-white space-y-3.5 animate-in fade-in duration-150 shadow-md">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                RAG Triad & Hallucination Audit
              </span>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300">
              {evaluation.compliance_badge.replace(/_/g, " ")}
            </span>
          </div>

          {/* Triad Progress Meters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            
            {/* 1. Faithfulness */}
            <div className="p-2.5 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 dark:text-slate-400">
                <span>Faithfulness</span>
                <span className="font-bold text-slate-900 dark:text-white">{faithPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${faithPercent}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-tight">
                Grounded in citations
              </span>
            </div>

            {/* 2. Context Relevance */}
            <div className="p-2.5 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 dark:text-slate-400">
                <span>Context Relevance</span>
                <span className="font-bold text-slate-900 dark:text-white">{contextPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${contextPercent}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-tight">
                Document retrieval accuracy
              </span>
            </div>

            {/* 3. Answer Relevance */}
            <div className="p-2.5 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 dark:text-slate-400">
                <span>Answer Relevance</span>
                <span className="font-bold text-slate-900 dark:text-white">{answerPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${answerPercent}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-tight">
                Directness to prompt
              </span>
            </div>

          </div>

          {/* Verdict Summary */}
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">
              {evaluation.summary_verdict} ({evaluation.supported_claims}/{evaluation.total_claims} assertions verified).
            </span>
          </div>

          {/* Claims breakdown preview */}
          {evaluation.claims_breakdown && evaluation.claims_breakdown.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Assertion Verifications ({evaluation.claims_breakdown.length})
              </span>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {evaluation.claims_breakdown.map((c, i) => (
                  <div
                    key={i}
                    className="p-1.5 rounded-md bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-[11px] flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-slate-700 dark:text-slate-300">
                      &ldquo;{c.claim_text}&rdquo;
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold shrink-0 ${
                      c.is_grounded
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                    }`}>
                      {c.is_grounded ? "GROUNDED" : "UNVERIFIED"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
