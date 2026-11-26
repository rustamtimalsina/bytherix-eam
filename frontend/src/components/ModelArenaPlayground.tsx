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
  ChevronDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Database,
  Cpu,
  Copy,
  Check,
  Filter,
  BarChart2
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

interface BenchmarkPreset {
  id: string;
  category: "all" | "compliance" | "security" | "architecture" | "speed" | "rag";
  label: string;
  badge: string;
  targetMetric: string;
  description: string;
  prompt: string;
}

const BENCHMARK_PRESETS: BenchmarkPreset[] = [
  {
    id: "hipaa-compliance",
    category: "compliance",
    label: "HIPAA & SOC 2 Compliance Audit",
    badge: "Compliance",
    targetMetric: "Zero Plaintext Leakage & Grounding",
    description: "Evaluates multi-tenant audit trail, encryption at rest, and business associate agreement requirements.",
    prompt: "Conduct an authoritative compliance review for multi-tenant data storage under HIPAA and SOC 2 Type II, specifying required encryption at rest, in transit, and tenant-keyed HMAC integrity safeguards.",
  },
  {
    id: "dlp-interception",
    category: "security",
    label: "Zero-Trust Secret Redaction",
    badge: "DLP Defense",
    targetMetric: "100% High-Entropy Redaction",
    description: "Tests pre-inference filtering of cloud credentials, JWT tokens, and private RSA keys.",
    prompt: "Demonstrate how pre-inference DLP inspection intercepts high-entropy secrets (AWS secret keys, JWT bearer tokens, and private SSH keys) to guarantee zero plaintext leakage to third-party model APIs.",
  },
  {
    id: "vector-schema",
    category: "architecture",
    label: "HNSW 1536-dim Schema Optimization",
    badge: "Vector Ops",
    targetMetric: "Index Efficiency & RLS",
    description: "Evaluates PostgreSQL 16 schema design with pgvector HNSW indexing and Row-Level Security.",
    prompt: "Design an optimized PostgreSQL 16 schema utilizing pgvector with 1536-dimensional HNSW index configuration (m=16, ef_construction=64) enforcing Row-Level Security for multi-tenant enterprise isolation.",
  },
  {
    id: "velocity-stress",
    category: "speed",
    label: "Sub-150ms Velocity Stress-Test",
    badge: "P99 Speed",
    targetMetric: "Time-to-First-Token < 150ms",
    description: "Tests model response conciseness and raw generation tokens/second under strict word budgets.",
    prompt: "Summarize 5 core principles of deterministic distributed consensus in under 120 words. Optimize for maximum token velocity and sub-150ms time-to-first-token.",
  },
  {
    id: "rag-hallucination",
    category: "rag",
    label: "Adversarial Hallucination Trap",
    badge: "Factuality",
    targetMetric: "100% Attribution Accuracy",
    description: "Presents conflicting premises to detect whether the model hallucinates unverified claims.",
    prompt: "If an ingested document states 'Bytherix SLA guarantees 99.95% uptime' and another states 'Disaster recovery failover takes 15 minutes', can an enterprise claim zero data loss in all catastrophic multi-region outages? Ground strictly in facts and identify unstated assumptions.",
  },
];

const CATEGORIES = [
  { id: "all", label: "All Benchmarks" },
  { id: "compliance", label: "Compliance & Legal" },
  { id: "security", label: "Security & DLP" },
  { id: "architecture", label: "Vector & SQL" },
  { id: "speed", label: "Velocity & P99" },
  { id: "rag", label: "RAG Factuality" },
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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activePresetId, setActivePresetId] = useState<string>(BENCHMARK_PRESETS[0].id);
  const [prompt, setPrompt] = useState(BENCHMARK_PRESETS[0].prompt);
  const [isRunning, setIsRunning] = useState(false);
  const [resultA, setResultA] = useState<ArenaResult | null>(null);
  const [resultB, setResultB] = useState<ArenaResult | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const filteredPresets = selectedCategory === "all"
    ? BENCHMARK_PRESETS
    : BENCHMARK_PRESETS.filter((p) => p.category === selectedCategory);

  const handleSelectPreset = (preset: BenchmarkPreset) => {
    setActivePresetId(preset.id);
    setPrompt(preset.prompt);
  };

  const handleRunArena = () => {
    if (!prompt.trim() || isRunning) return;
    setIsRunning(true);
    setResultA(null);
    setResultB(null);

    // Realistic simulated high-fidelity side-by-side benchmark
    setTimeout(() => {
      const isSpeedPreset = activePresetId === "velocity-stress";
      const baseLatA = isSpeedPreset ? 95 : 140;
      const baseLatB = isSpeedPreset ? 165 : 230;

      const latencyA = Math.floor(Math.random() * 40) + baseLatA;
      const latencyB = Math.floor(Math.random() * 50) + baseLatB;

      const tokensA = Math.floor(Math.random() * 60) + (isSpeedPreset ? 110 : 250);
      const tokensB = Math.floor(Math.random() * 70) + (isSpeedPreset ? 135 : 270);

      const costA = Number(((tokensA / 1_000_000) * 1.5).toFixed(5));
      const costB = Number(((tokensB / 1_000_000) * 4.5).toFixed(5));

      const scoreA = Number((Math.random() * 2 + 94.5).toFixed(1));
      const scoreB = Number((Math.random() * 2 + 96.0).toFixed(1));

      const activePreset = BENCHMARK_PRESETS.find((p) => p.id === activePresetId);
      const benchmarkLabel = activePreset?.label || "Custom Evaluation";

      const outputTextA = `[${modelA}] Benchmarked on ${benchmarkLabel}:\n\n1. Deterministic Multi-Tenant Isolation: Tenant context is injected at the database pool layer using session variables and pgvector tenant scoping.\n2. Automated DLP Boundary: Any secrets matching entropy thresholds (>4.5) or AWS/OpenAI regex signatures are masked pre-inference with zero plaintext leakage.\n3. RTO / RPO Guarantee: Enforces 15-minute point-in-time recovery with continuous WAL archiving to geo-redundant object storage.`;

      const outputTextB = `[${modelB}] Enterprise architectural synthesis on ${benchmarkLabel}:\n\n• High-Availability Architecture: Multi-AZ read replicas combined with stateless application microservices behind an active-active load balancer.\n• Zero-Trust Token Metering: Implements token bucket rate limiting alongside real-time quota telemetry to guarantee bounded compute costs.\n• Audit Immutability: Every model invocation generates an SHA-256 HMAC signed event stored in write-once audit ledgers.`;

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
    }, 1250);
  };

  const handleCopyComparison = () => {
    if (!resultA || !resultB) return;
    const summary = `=== Bytherix Model Arena Benchmark Summary ===
Evaluation Prompt: "${prompt}"
Model A: ${resultA.modelName} | Latency: ${resultA.latencyMs}ms | Tokens: ${resultA.tokens} | Cost: $${resultA.costUsd} | Quality: ${resultA.qualityScore}%
Model B: ${resultB.modelName} | Latency: ${resultB.latencyMs}ms | Tokens: ${resultB.tokens} | Cost: $${resultB.costUsd} | Quality: ${resultB.qualityScore}%
Winner: ${resultA.winner ? resultA.modelName : resultB.modelName} (Fastest Latency)`;

    navigator.clipboard.writeText(summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const activePreset = BENCHMARK_PRESETS.find((p) => p.id === activePresetId);

  return (
    <div className="card-depth-3d p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#070b14]/90 backdrop-blur-xl space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200/60 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

        {/* Action Pills */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Dual-Inference Ready
          </span>
        </div>
      </div>

      {/* 1. Benchmark Preset Library (Interactive Selection) */}
      <div className="space-y-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Enterprise Benchmark Presets
            </h4>
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedCategory === cat.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white/60 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/[0.08]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preset Chips Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredPresets.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer group flex flex-col justify-between ${
                  isSelected
                    ? "bg-indigo-600/10 border-indigo-500/60 ring-1 ring-indigo-500/40 shadow-xs"
                    : "bg-white dark:bg-[#0c1222] border-slate-200/80 dark:border-white/[0.06] hover:border-indigo-400/50 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20"
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white leading-snug">
                    {preset.label}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                    {preset.badge}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                  {preset.description}
                </p>
                <div className="mt-2 pt-1 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[9px] font-mono text-slate-400">
                  <span className="truncate max-w-[160px] text-indigo-600 dark:text-indigo-400 font-medium">
                    {preset.targetMetric}
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-0.5">
                    Select <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Model Selectors */}
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

      {/* Prompt Input Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <span>Evaluation Prompt</span>
            {activePreset && (
              <span className="text-[10px] font-mono text-indigo-500 font-normal">
                ({activePreset.targetMetric})
              </span>
            )}
          </label>
          <span className="text-[10.5px] font-mono text-slate-400">
            {prompt.length} chars
          </span>
        </div>

        <div className="relative">
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter instruction to evaluate across both models simultaneously..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.1] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-sans leading-relaxed"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>Parallel dual-inference testing with isolated token latency meters</span>
          </div>

          <button
            type="button"
            onClick={handleRunArena}
            disabled={isRunning || !prompt.trim()}
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
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

      {/* Arena Results Side-by-Side & Head-to-Head Delta */}
      {resultA && resultB && (
        <div className="space-y-4 pt-4 border-t border-slate-200/60 dark:border-white/[0.08] animate-in fade-in duration-300">
          {/* Head-to-Head Delta Bar */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                  Head-to-Head Benchmark Winner
                </span>
                <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {resultA.winner ? resultA.modelName : resultB.modelName} &mdash;{" "}
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                    {Math.abs(resultA.latencyMs - resultB.latencyMs)}ms faster (
                    {Math.round(
                      (Math.abs(resultA.latencyMs - resultB.latencyMs) /
                        Math.max(resultA.latencyMs, resultB.latencyMs)) *
                        100
                    )}
                    % speedup)
                  </span>
                </h5>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyComparison}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08] text-xs font-mono transition-all cursor-pointer self-start sm:self-auto"
              title="Copy benchmark summary"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Benchmark Summary</span>
                </>
              )}
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card A */}
            <div
              className={`p-4.5 rounded-2xl border transition-all ${
                resultA.winner
                  ? "bg-blue-500/[0.04] dark:bg-blue-950/20 border-blue-500/40 shadow-lg shadow-blue-500/10"
                  : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08]"
              } space-y-3`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-blue-500 font-bold uppercase tracking-wider">
                    Model A (Baseline)
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
                  <span>{resultA.tokens} tok</span>
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
            <div
              className={`p-4.5 rounded-2xl border transition-all ${
                resultB.winner
                  ? "bg-indigo-500/[0.04] dark:bg-indigo-950/20 border-indigo-500/40 shadow-lg shadow-indigo-500/10"
                  : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08]"
              } space-y-3`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-indigo-500 font-bold uppercase tracking-wider">
                    Model B (Candidate)
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
                  <span>{resultB.tokens} tok</span>
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
        </div>
      )}
    </div>
  );
}
