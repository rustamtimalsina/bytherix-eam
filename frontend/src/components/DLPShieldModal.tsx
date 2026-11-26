"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  Key,
  CreditCard,
  Mail,
  Phone,
  Database,
  FileKey,
  CheckCircle2,
  AlertTriangle,
  X,
  Play,
  Sparkles,
  Code2,
  Sliders,
  Check,
  Copy,
  Info,
} from "lucide-react";
import {
  api,
  DLPRuleItem,
  DLPResultResponse,
  DLPStatsResponse,
  CustomRegexTestRequest,
  CustomRegexTestResponse,
} from "@/lib/api";

interface DLPShieldModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const REGEX_PRESETS = [
  {
    name: "NEPAL_CITIZENSHIP",
    label: "Nepal Citizenship No",
    pattern: "\\b\\d{2}-\\d{2}-\\d{2}-\\d{5}\\b",
    sample: "Employee verification: Rustam Timalsina, Citizenship No: 27-01-79-12345 issued from Kathmandu district.",
    description: "Standard Nepal citizenship format (e.g. 27-01-79-12345)",
    tag: "Nepal Reg",
  },
  {
    name: "NEPAL_PAN",
    label: "Nepal PAN No",
    pattern: "\\b\\d{9}\\b",
    sample: "Bytherix Technology corporate billing PAN is 609876543 for tax deduction.",
    description: "Inland Revenue Dept 9-digit tax identifier",
    tag: "Nepal Reg",
  },
  {
    name: "SESSION_BEARER_TOKEN",
    label: "Bytherix Session / JWT",
    pattern: "(?:byth_[a-zA-Z0-9_-]{20,48})|(?:ey[a-zA-Z0-9_-]{20,}\\.[a-zA-Z0-9_-]{20,})",
    sample: "Authorization: Bearer byth_sec_99a8b7c6d5e4f3a2b1c0d9e8 in incoming header.",
    description: "Internal session credentials & tokens",
    tag: "Internal Sec",
  },
  {
    name: "PATIENT_MRN",
    label: "Hospital MRN",
    pattern: "\\bMRN-[A-Z]{2,3}-\\d{6}\\b",
    sample: "Patient clinical audit: MRN-KTM-998812, cardiology observation.",
    description: "HIPAA Patient medical record format",
    tag: "Healthcare",
  },
];

export function DLPShieldModal({ isOpen, onClose }: DLPShieldModalProps) {
  const [activeTab, setActiveTab] = useState<"standard" | "custom_regex">("standard");
  const [rules, setRules] = useState<DLPRuleItem[]>([]);
  const [stats, setStats] = useState<DLPStatsResponse | null>(null);
  const [sandboxText, setSandboxText] = useState("");
  const [scanResult, setScanResult] = useState<DLPResultResponse | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Custom Regex Sandbox state
  const [customRuleName, setCustomRuleName] = useState("NEPAL_CITIZENSHIP");
  const [customPattern, setCustomPattern] = useState("\\b\\d{2}-\\d{2}-\\d{2}-\\d{5}\\b");
  const [customSampleText, setCustomSampleText] = useState(
    "Employee verification: Rustam Timalsina, Citizenship No: 27-01-79-12345 issued from Kathmandu district."
  );
  const [customRegexResult, setCustomRegexResult] = useState<CustomRegexTestResponse | null>(null);
  const [isTestingRegex, setIsTestingRegex] = useState(false);
  const [copiedMasked, setCopiedMasked] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDlpData();
    }
  }, [isOpen]);

  const loadDlpData = async () => {
    try {
      const [rulesData, statsData] = await Promise.all([
        api.getDlpRules(),
        api.getDlpStats(),
      ]);
      setRules(rulesData.rules || []);
      setStats(statsData);
    } catch (err) {
      console.error("Failed to load DLP Shield data", err);
    }
  };

  const handleRunScan = async (overrideText?: string) => {
    const textToScan = overrideText !== undefined ? overrideText : sandboxText;
    if (!textToScan.trim()) return;
    setIsScanning(true);
    try {
      const result = await api.scanDlp(textToScan);
      setScanResult(result);
    } catch (err) {
      console.error("DLP scan failed", err);
    } finally {
      setIsScanning(false);
    }
  };

  const loadSamplePreset = (type: "api_keys" | "cards_db") => {
    setScanResult(null);
    if (type === "api_keys") {
      const sample = `Hello, please verify my OpenAI key sk-live9876543210abcdef9876543210 and AWS access key AKIAIOSFODNN7EXAMPLE. Reach me at devops@bytherix.com or +1 (555) 234-5678.`;
      setSandboxText(sample);
    } else {
      const sample = `Internal DB connection: postgresql://admin:SuperSecretPass123@prod-db.bytherix.net:5432/eam_core. Corporate Visa card: 4532 0151 1283 0366.`;
      setSandboxText(sample);
    }
  };

  const handleSelectPreset = (preset: (typeof REGEX_PRESETS)[0]) => {
    setCustomRuleName(preset.name);
    setCustomPattern(preset.pattern);
    setCustomSampleText(preset.sample);
    setCustomRegexResult(null);
  };

  const handleTestCustomRegex = async () => {
    if (!customPattern.trim()) return;
    setIsTestingRegex(true);
    try {
      const res = await api.testCustomRegexDlp({
        pattern: customPattern,
        sample_text: customSampleText,
        rule_name: customRuleName,
      });
      setCustomRegexResult(res);
    } catch (err: unknown) {
      setCustomRegexResult({
        is_valid_regex: false,
        matches_count: 0,
        masked_text: customSampleText,
        matched_segments: [],
        error_message: (err as Error).message || "Request failed",
      });
    } finally {
      setIsTestingRegex(false);
    }
  };

  const handleCopyMasked = () => {
    if (customRegexResult?.masked_text) {
      navigator.clipboard.writeText(customRegexResult.masked_text);
      setCopiedMasked(true);
      setTimeout(() => setCopiedMasked(false), 2000);
    }
  };

  if (!isOpen) return null;

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case "API_KEY":
        return <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case "PRIVATE_KEY":
        return <FileKey className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case "CREDIT_CARD":
        return <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case "DATABASE_URI":
      case "PASSWORD":
        return <Database className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
      case "EMAIL":
        return <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case "PHONE_NUMBER":
        return <Phone className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      default:
        return <Lock className="w-4 h-4 text-slate-600 dark:text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/[0.08] shadow-2xl overflow-hidden text-slate-900 dark:text-white transition-colors duration-300">
        
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Bytherix DLP Shield
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
                  ENFORCING
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Zero-Leak Real-Time Data Loss Prevention & PII Masking Engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.01] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("standard")}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "standard"
                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Pre-Configured Detectors
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom_regex")}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "custom_regex"
                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Custom Regex Rule Sandbox
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 font-mono font-bold">
              NEW
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white dark:bg-[#0c1222]">
          {activeTab === "standard" ? (
            <>
              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
                  <span className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400 block mb-1">
                    Enforcement Status
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> Active (Pre-LLM)
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
                  <span className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400 block mb-1">
                    Active Detectors
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-cyan-700 dark:text-cyan-400">
                    {rules.length || 8} Rule Engines
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
                  <span className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400 block mb-1">
                    Redactions Prevented
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-400">
                    {stats?.total_redaction_events ?? 0} Events
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
                  <span className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400 block mb-1">
                    Compliance Standard
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-400">
                    PCI-DSS & SOC 2
                  </span>
                </div>
              </div>

              {/* Interactive Live Testing Sandbox */}
              <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] p-4.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Interactive DLP Sandbox & Masking Tester
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadSamplePreset("api_keys")}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.1] text-[11px] font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-colors shadow-xs"
                    >
                      Load API Keys Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSamplePreset("cards_db")}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.1] text-[11px] font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-colors shadow-xs"
                    >
                      Load Card & DB Preset
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <textarea
                    value={sandboxText}
                    onChange={(e) => setSandboxText(e.target.value)}
                    placeholder="Type or paste any sensitive prompt, API token, password, or credit card here to test real-time interception..."
                    className="w-full h-20 p-3 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner"
                  />

                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      Input length: {sandboxText.length} characters
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRunScan()}
                      disabled={isScanning || !sandboxText.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5" />
                      {isScanning ? "Scanning..." : "Execute DLP Redaction"}
                    </button>
                  </div>
                </div>

                {/* Scan Output Diff */}
                {scanResult && (
                  <div className="mt-3 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 space-y-3 animate-in fade-in duration-150 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {scanResult.is_masked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {scanResult.entities_detected.length} SENSITIVE ENTITY REDACTED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            100% CLEAN
                          </span>
                        )}
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                          {scanResult.summary}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] font-mono text-xs text-slate-900 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {scanResult.masked_text}
                    </div>

                    {scanResult.entities_detected.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {scanResult.entities_detected.map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] text-[10px] font-mono font-medium text-slate-700 dark:text-cyan-300 border border-slate-200 dark:border-cyan-500/30"
                          >
                            <Lock className="w-2.5 h-2.5 text-cyan-600 dark:text-cyan-400" />
                            {item.category}: {item.redacted_preview}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Active Protection Engines Matrix */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Active Detector Engines ({rules.length})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-3 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] flex items-start gap-3 hover:border-slate-300 dark:hover:border-white/[0.15] transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] shrink-0 mt-0.5">
                        {getCategoryIcon(rule.id)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {rule.name}
                          </h4>
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md uppercase whitespace-nowrap shrink-0 ${
                              rule.severity === "CRITICAL"
                                ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30"
                                : rule.severity === "HIGH"
                                ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30"
                                : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30"
                            }`}
                          >
                            {rule.severity}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {rule.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Top Banner / Explanation */}
              <div className="p-4 rounded-xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-500/30 flex items-start gap-3">
                <Info className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Enterprise Custom DLP Regex Simulator & Safety Sandbox
                  </p>
                  <p className="leading-relaxed">
                    Test proprietary compliance patterns, national ID numbers (e.g., Nepal Citizenship & PAN), and internal secret schemas before enforcing them across tenant LLM pipelines. Matches are dynamically redacted using standard replacement tags <code className="font-mono text-[11px] px-1 py-0.5 rounded bg-white dark:bg-black/40 border border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300">[REDACTED_RULE_N]</code>.
                  </p>
                </div>
              </div>

              {/* 1-Click Regulatory & Security Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                    1-Click Enterprise & Regulatory Presets
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Click to load pattern & test payload
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {REGEX_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-3 text-left rounded-xl border transition-all text-xs flex flex-col justify-between gap-2 ${
                        customRuleName === preset.name
                          ? "bg-cyan-50/70 dark:bg-cyan-500/10 border-cyan-400 dark:border-cyan-500/40 shadow-xs ring-1 ring-cyan-500/30"
                          : "bg-slate-50/70 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {preset.label}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold">
                            {preset.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                          {preset.description}
                        </p>
                      </div>
                      <code className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 truncate block bg-white dark:bg-black/30 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/5">
                        {preset.pattern}
                      </code>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pattern Form Input & Test Sandbox */}
              <div className="p-4.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Rule Identifier Name
                    </label>
                    <input
                      type="text"
                      value={customRuleName}
                      onChange={(e) => setCustomRuleName(e.target.value)}
                      placeholder="e.g. NEPAL_CITIZENSHIP"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Regular Expression Pattern (Python `re` standard)
                    </label>
                    <input
                      type="text"
                      value={customPattern}
                      onChange={(e) => setCustomPattern(e.target.value)}
                      placeholder="e.g. \\b\\d{2}-\\d{2}-\\d{2}-\\d{5}\\b"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-mono text-cyan-600 dark:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Sample Payload / Unsanitized Text
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {customSampleText.length} chars
                    </span>
                  </div>
                  <textarea
                    value={customSampleText}
                    onChange={(e) => setCustomSampleText(e.target.value)}
                    placeholder="Enter raw text with sensitive numbers or tokens to verify redaction..."
                    className="w-full h-24 p-3 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleTestCustomRegex}
                    disabled={isTestingRegex || !customPattern.trim() || !customSampleText.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {isTestingRegex ? "Testing Pattern..." : "Test Regex Pattern"}
                  </button>
                </div>
              </div>

              {/* Custom Regex Simulation Output */}
              {customRegexResult && (
                <div className="p-4.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 space-y-3.5 shadow-sm animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2">
                      {customRegexResult.is_valid_regex ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          VALID REGEX SYNTAX
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          SYNTAX ERROR
                        </span>
                      )}

                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {customRegexResult.matches_count} {customRegexResult.matches_count === 1 ? "match" : "matches"} detected
                      </span>
                    </div>

                    {customRegexResult.is_valid_regex && (
                      <button
                        type="button"
                        onClick={handleCopyMasked}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.15] text-[11px] font-medium text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        {copiedMasked ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedMasked ? "Copied" : "Copy Redacted Text"}
                      </button>
                    )}
                  </div>

                  {customRegexResult.error_message && (
                    <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 text-xs font-mono text-rose-700 dark:text-rose-300">
                      {customRegexResult.error_message}
                    </div>
                  )}

                  {customRegexResult.is_valid_regex && (
                    <div className="space-y-3">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                          Simulated Redacted Text Output (Pre-LLM)
                        </span>
                        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] font-mono text-xs text-slate-900 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {customRegexResult.masked_text}
                        </div>
                      </div>

                      {customRegexResult.matched_segments && customRegexResult.matched_segments.length > 0 && (
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                            Intercepted Sensitive Value Extracts ({customRegexResult.matched_segments.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {customRegexResult.matched_segments.map((seg, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 font-mono text-[11px]"
                              >
                                <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                {seg}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-black/40 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Active across /chat, /chat/stream, and document ingestion pipelines
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-white/[0.08] dark:hover:bg-white/[0.15] text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
