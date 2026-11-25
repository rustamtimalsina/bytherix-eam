"use client";

import React, { useState } from "react";
import {
  Swords,
  Sparkles,
  Zap,
  Clock,
  DollarSign,
  Trophy,
  CheckCircle2,
  Play,
  RotateCcw,
  ChevronDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  Cpu
} from "lucide-react";
import { RegisteredModelSummary } from "@/lib/api";

interface ModelArenaPlaygroundProps {
  models: RegisteredModelSummary[];
  onPromoteModel?: (modelId: string, versionId: string) => void;
}

interface ArenaResult {
  modelName: string;
  versionTag: string;
  output: string;
  latencyMs: number;
  tokens: number;
  costUsd: number;
  qualityScore: number;
  winner: boolean;
}

const PRESET_PROMPTS = [
  {
    label: "Enterprise Policy Assessment",
    prompt: "Evaluate the disaster recovery and backup requirements for a multi-tenant healthcare enterprise handling HIPAA data.",
  },
  {
    label: "SQL & Vector Schema Optimization",
    prompt: "Design an optimized PostgreSQL schema with pgvector (1536 dimensions) supporting HNSW indexing and multi-tenant RLS.",
  },
  {
    label: "Security & Zero-Trust Governance",
    prompt: "Outline how pre-LLM DLP interception prevents cloud credentials and database connection strings from leaking to external inference providers.",
  },
];

export function ModelArenaPlayground({
  models,
  onPromoteModel,
}: ModelArenaPlaygroundProps) {
  const availableModelOptions = Array.from(
    new Set([
      "gpt-4o-enterprise",
      "gpt-4o-mini-fast",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "claude-3-5-sonnet",
      ...models.map((m) => m.name),
    ])
  );

  const [modelA, setModelA] = useState<string>(
    availableModelOptions[0] || "gpt-4o-enterprise"
  );
  const [modelB, setModelB] = useState<string>(
    availableModelOptions[1] || "gpt-4o-mini-fast"
  );
  const [prompt, setPrompt] = useState(PRESET_PROMPTS[0].prompt);
  const [isRunning, setIsRunning] = useState(false);
  const [resultA, setResultA] = useState<ArenaResult | null>(null);
  const [resultB, setResultB] = useState<ArenaResult | null>(null);

  const handleRunArena = () => {
    if (!prompt.trim() || isRunning) return;
    setIsRunning(true);
    setResultA(null);
    setResultB(null);

    // Simulate high-fidelity realistic side-by-side benchmark
    setTimeout(() => {
      const latencyA = Math.floor(Math.random() * 80) + 120; // 120 - 200ms
      const latencyB = Math.floor(Math.random() * 100) + 210; // 210 - 310ms

      const tokensA = Math.floor(Math.random() * 80) + 240;
      const tokensB = Math.floor(Math.random() * 90) + 260;

      const costA = Number(((tokensA / 1_000_000) * 1.5).toFixed(5));
      const costB = Number(((tokensB / 1_000_000) * 4.5).toFixed(5));

      const scoreA = 94.2;
      const scoreB = 96.5;

      const outputTextA = `[${modelA}] Rigorous evaluation completed with verified compliance citations:\n\n1. Deterministic Multi-Tenant Isolation: Tenant context is injected at the database pool layer using session variables and pgvector tenant scoping.\n2. Automated DLP Boundary: Any secrets matching entropy thresholds (>4.5) or AWS/OpenAI regex signatures are masked pre-inference with zero plaintext leakage.\n3. RTO / RPO Guarantee: Enforces 15-minute point-in-time recovery with continuous WAL archiving to geo-redundant object storage.`;

      const outputTextB = `[${modelB}] Enterprise architectural synthesis:\n\n• High-Availability Architecture: Multi-AZ read replicas combined with stateless application microservices behind an active-active load balancer.\n• Zero-Trust Token Metering: Implements token bucket rate limiting alongside real-time quota telemetry to guarantee bounded compute costs.\n• Audit Immutability: Every model invocation generates an SHA-256 HMAC signed event stored in write-once audit ledgers.`;

      setResultA({
        modelName: modelA,
        versionTag: "v1.0.0 (Production)",
        output: outputTextA,
        latencyMs: latencyA,
        tokens: tokensA,
        costUsd: costA,
        qualityScore: scoreA,
        winner: latencyA < latencyB,
      });

      setResultB({
        modelName: modelB,
        versionTag: "v2.0.0-rc1 (Staging)",
        output: outputTextB,
        latencyMs: latencyB,
        tokens: tokensB,
        costUsd: costB,
        qualityScore: scoreB,
        winner: latencyB < latencyA,
      });

      setIsRunning(false);
    }, 1400);
  };

  return (
    <div className="card-depth-3d p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#070b14]/90 backdrop-blur-xl space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200/60 dark:border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 p-0.5 shadow-lg shadow-indigo-500/20 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Swords className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Side-by-Side Model Arena</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shrink-0">
                Playground
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Benchmark production vs candidate models side-by-side with latency, cost, and hallucination metrics.
            </p>
          </div>
        </div>
      </div>

      {/* Model Selectors & Input */}
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Model A Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Model A (Baseline / Production)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Baseline</span>
            </label>
            <div className="relative">
              <select
                value={modelA}
                onChange={(e) => setModelA(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1222] border border-slate-200 dark:border-white/[0.1] text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 cursor-pointer shadow-xs"
              >
                {availableModelOptions.map((m) => (
                  <option key={m} value={m} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Model B Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>Model B (Candidate / Staging)</span>
              </span>
              <span className="text-[10px] font-mono text-indigo-400 font-semibold">Candidate</span>
            </label>
            <div className="relative">
              <select
                value={modelB}
                onChange={(e) => setModelB(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1222] border border-slate-200 dark:border-white/[0.1] text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none pr-8 cursor-pointer shadow-xs"
              >
                {availableModelOptions.map((m) => (
                  <option key={m} value={m} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Prompt Input with Presets Header */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Evaluation Prompt
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mr-1">
                Presets:
              </span>
              {PRESET_PROMPTS.map((p, idx) => {
                const isActive = prompt === p.prompt;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(p.prompt)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium transition-all cursor-pointer ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-xs border border-indigo-500"
                        : "bg-slate-100 dark:bg-white/[0.04] hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter instruction to evaluate across both models simultaneously..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.1] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-sans"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleRunArena}
            disabled={isRunning || !prompt.trim()}
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            {isRunning ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Benchmarking Both Models...</span>
              </>
            ) : (
              <>
                <Swords className="w-4 h-4" />
                <span>Run Side-by-Side Arena Test</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Arena Results Side-by-Side */}
      {(resultA && resultB) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200/60 dark:border-white/[0.08] animate-in fade-in duration-300">
          {/* Card A */}
          <div className={`p-4.5 rounded-2xl border transition-all ${
            resultA.winner
              ? "bg-blue-500/[0.04] dark:bg-blue-950/20 border-blue-500/40 shadow-lg shadow-blue-500/10"
              : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08]"
          } space-y-3`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-blue-500 font-bold uppercase tracking-wider">
                  Model A
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono">
                  {resultA.modelName}
                </h4>
              </div>
              {resultA.winner && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  Fastest Latency
                </span>
              )}
            </div>

            {/* Performance Stats Pill Bar */}
            <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-slate-100 dark:bg-white/[0.04] text-[10.5px] font-mono text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-500" />
                <span>{resultA.latencyMs}ms</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>{resultA.tokens} tokens</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-500" />
                <span>${resultA.costUsd.toFixed(5)}</span>
              </div>
            </div>

            {/* Output */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.06] text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans max-h-60 overflow-y-auto">
              {resultA.output}
            </div>
          </div>

          {/* Card B */}
          <div className={`p-4.5 rounded-2xl border transition-all ${
            resultB.winner
              ? "bg-indigo-500/[0.04] dark:bg-indigo-950/20 border-indigo-500/40 shadow-lg shadow-indigo-500/10"
              : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08]"
          } space-y-3`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-indigo-500 font-bold uppercase tracking-wider">
                  Model B
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono">
                  {resultB.modelName}
                </h4>
              </div>
              {resultB.winner && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  Fastest Latency
                </span>
              )}
            </div>

            {/* Performance Stats Pill Bar */}
            <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-slate-100 dark:bg-white/[0.04] text-[10.5px] font-mono text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-500" />
                <span>{resultB.latencyMs}ms</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>{resultB.tokens} tokens</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-500" />
                <span>${resultB.costUsd.toFixed(5)}</span>
              </div>
            </div>

            {/* Output */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.06] text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans max-h-60 overflow-y-auto">
              {resultB.output}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
