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
} from "lucide-react";
import { api, DLPRuleItem, DLPResultResponse, DLPStatsResponse } from "@/lib/api";

interface DLPShieldModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DLPShieldModal({ isOpen, onClose }: DLPShieldModalProps) {
  const [rules, setRules] = useState<DLPRuleItem[]>([]);
  const [stats, setStats] = useState<DLPStatsResponse | null>(null);
  const [sandboxText, setSandboxText] = useState("");
  const [scanResult, setScanResult] = useState<DLPResultResponse | null>(null);
  const [isScanning, setIsScanning] = useState(false);

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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white dark:bg-[#0c1222]">
          
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
                        <AlertTriangle className="w-3 h-3" />
                        {scanResult.entities_detected.length} SENSITIVE ENTITY REDACTED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
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
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md uppercase ${
                        rule.severity === "CRITICAL"
                          ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30"
                          : rule.severity === "HIGH"
                          ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30"
                          : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30"
                      }`}>
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
