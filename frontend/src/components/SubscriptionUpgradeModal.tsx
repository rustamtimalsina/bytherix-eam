"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  Zap,
  CreditCard,
  Crown,
} from "lucide-react";
import { api, PlanDetail } from "@/lib/api";

const DEFAULT_PLANS: PlanDetail[] = [
  {
    id: "starter",
    name: "Starter Free",
    price_usd_monthly: 0,
    token_allowance: 100000,
    documents_limit: 5,
    rate_limit_per_min: 60,
    features: [
      "100,000 monthly AI tokens",
      "Up to 5 PDF documents (10 MB each)",
      "1536-dim pgvector HNSW indexing",
      "Pre-flight DLP Shield zero-leak protection",
      "Real-time RAG Triad hallucination scoreboard",
      "Standard developer community support"
    ],
    is_current: true
  },
  {
    id: "growth",
    name: "Growth Pro",
    price_usd_monthly: 49,
    token_allowance: 1500000,
    documents_limit: 50,
    rate_limit_per_min: 300,
    features: [
      "1,500,000 monthly AI tokens",
      "Up to 50 PDF documents (50 MB each)",
      "Priority pgvector vector retrieval (<45ms P95)",
      "Canary MLOps model promotions & traffic split",
      "Targeted document scope RAG filtering",
      "Governed agent workflow executions (10 steps)",
      "Priority SLA developer support"
    ],
    is_current: false
  },
  {
    id: "enterprise",
    name: "Enterprise Quantum",
    price_usd_monthly: 299,
    token_allowance: 10000000,
    documents_limit: 500,
    rate_limit_per_min: 1000,
    features: [
      "10,000,000 monthly AI tokens",
      "Up to 500 documents with dedicated vector pool",
      "Air-gapped PII DLP vault & custom regex masking",
      "Multi-stage MLOps automated rollback gates",
      "SOC 2 & ISO 27001 audit export compliance",
      "99.99% high availability SLA guarantee",
      "24/7 Dedicated solutions engineering"
    ],
    is_current: false
  }
];

interface SubscriptionUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanTier: string;
  onPlanUpgraded: (newPlanTier: string, newAllowance: number) => void;
  showToast?: (title: string, message: string, type: "info" | "success" | "error" | "warning") => void;
}

export function SubscriptionUpgradeModal({
  isOpen,
  onClose,
  currentPlanTier,
  onPlanUpgraded,
  showToast,
}: SubscriptionUpgradeModalProps) {
  const [plans, setPlans] = useState<PlanDetail[]>(DEFAULT_PLANS);
  const [upgradingTier, setUpgradingTier] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !upgradingTier) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, upgradingTier, onClose]);

  // Load plans catalog from backend
  useEffect(() => {
    if (!isOpen) return;
    const fetchPlans = async () => {
      try {
        const res = await api.getBillingPlans();
        if (res && res.plans && res.plans.length > 0) {
          setPlans(res.plans);
        }
      } catch (err) {
        console.error("Failed to load billing plans, using resilient fallback", err);
      }
    };
    fetchPlans();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpgrade = async (targetPlanId: string) => {
    if (targetPlanId === currentPlanTier.toLowerCase()) return;
    try {
      setUpgradingTier(targetPlanId);
      // Simulate real Stripe checkout processing latency
      await new Promise((r) => setTimeout(r, 600));

      const res = await api.upgradePlan(targetPlanId, "pm_simulated_card_visa");
      if (res.success) {
        onPlanUpgraded(res.current_plan, res.token_allowance);
        if (showToast) {
          showToast(
            "Subscription Upgraded!",
            `Successfully upgraded to ${res.current_plan.toUpperCase()}. Your token budget is now ${res.token_allowance.toLocaleString()} tokens/mo.`,
            "success"
          );
        }
        setTimeout(() => {
          onClose();
        }, 300);
      }
    } catch (err) {
      const msg = (err as Error).message || "Upgrade failed";
      if (showToast) {
        showToast("Upgrade Notice", msg, "error");
      }
    } finally {
      setUpgradingTier(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={() => !upgradingTier && onClose()}
      />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-5xl rounded-2xl bg-white dark:bg-[#080d19] border border-slate-200 dark:border-white/[0.08] shadow-2xl z-10 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
        style={{
          boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Header Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between bg-slate-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Subscription Plans & Compute Quota
                </h3>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                  Section 7.3 & 7.4
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Elevate your monthly token allowance, knowledge documents limit, and priority MLOps compute.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={!!upgradingTier}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 3 Plans Grid */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlanTier.toLowerCase();
              const isGrowth = plan.id === "growth";
              const isUpgradingThis = upgradingTier === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl flex flex-col justify-between transition-all duration-200 p-5 sm:p-6 ${
                    isGrowth
                      ? "bg-gradient-to-b from-indigo-50/50 via-white to-white dark:from-indigo-950/20 dark:via-[#090e1c] dark:to-[#090e1c] border-2 border-indigo-500 shadow-xl shadow-indigo-500/10"
                      : "bg-white/80 dark:bg-[#070b16] border border-slate-200 dark:border-white/[0.08]"
                  }`}
                  style={{
                    boxShadow: isGrowth
                      ? "0 20px 35px -10px rgba(99, 102, 241, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)"
                      : "inset 0 1px 0 0 rgba(255, 255, 255, 0.04)",
                  }}
                >
                  {/* Growth Pro Most Popular Badge */}
                  {isGrowth && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-indigo-500/30">
                      ⚡ Most Popular
                    </div>
                  )}

                  <div>
                    {/* Plan Name & Tagline */}
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        {plan.name}
                      </h4>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Current</span>
                        </span>
                      )}
                    </div>

                    {/* Pricing */}
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                        ${plan.price_usd_monthly}
                      </span>
                      <span className="text-xs font-mono text-slate-400">/ month</span>
                    </div>

                    {/* Metrics Pill Grid */}
                    <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05] space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Token Budget:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {plan.token_allowance.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Max Documents:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {plan.documents_limit} files
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Rate Limit:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {plan.rate_limit_per_min} req/min
                        </span>
                      </div>
                    </div>

                    {/* Feature Checklist */}
                    <div className="mt-5 space-y-2.5">
                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        Included Capabilities
                      </p>
                      {plan.features.map((feature, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2 text-xs">
                          <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                          <span className="text-slate-600 dark:text-slate-300 leading-snug">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/[0.05]">
                    {isCurrent ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-slate-500 text-xs font-bold font-mono cursor-not-allowed border border-slate-200/50 dark:border-white/[0.05]"
                      >
                        Active Plan
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={!!upgradingTier}
                        className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm ${
                          isGrowth
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-indigo-500/20"
                            : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isUpgradingThis ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>Simulating Stripe...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" />
                            <span>Upgrade to {plan.name}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer: Security Guarantee */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Stripe Webhook Verified:</strong> Signed server-side events as source of truth (§ 7.3).
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span>PCI-DSS Compliant</span>
            <span>&bull;</span>
            <span>Zero Card Storage on Bytherix</span>
          </div>
        </div>
      </div>
    </div>
  );
}
