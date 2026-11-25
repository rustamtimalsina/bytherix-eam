"use client";

import React, { useState, useEffect } from "react";
import { 
  Receipt, 
  FileText, 
  Download, 
  CheckCircle2, 
  CreditCard, 
  Calendar, 
  Check, 
  Loader2 
} from "lucide-react";
import { api, InvoiceItem } from "@/lib/api";

interface BillingLedgerProps {
  organizationId?: string;
  currentPlanTier?: string;
}

export const BillingLedger: React.FC<BillingLedgerProps> = ({
  organizationId,
  currentPlanTier = "starter"
}) => {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, [organizationId, currentPlanTier]);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.getInvoices();
      setInvoices(res.invoices || []);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load billing invoices");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = async (invoice: InvoiceItem) => {
    try {
      setDownloadingId(invoice.id);
      const token = typeof window !== "undefined" ? localStorage.getItem("bytherix_token") : null;
      const baseUrl = api.getApiBaseUrl(); // http://localhost:8000/api/v1
      
      const response = await fetch(`${baseUrl}/billing/invoices/${invoice.id}/download`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download invoice (HTTP ${response.status})`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Bytherix_Invoice_${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadSuccessId(invoice.id);
      setTimeout(() => setDownloadSuccessId(null), 2500);
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to download receipt");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="card-depth-3d p-6 space-y-5 rounded-2xl border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-slate-900/40">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Billing Invoices &amp; Tax Receipts
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                SOC-2 Auditable
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Official monthly billing cycles, token consumption breakdown, and downloadable PDF receipts.
            </p>
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-200/60 dark:bg-white/[0.04] border border-slate-300/60 dark:border-white/[0.08] text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block leading-tight whitespace-nowrap">Payment Standing</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
              <CheckCircle2 className="w-3 h-3" />
              <span>Good Standing</span>
            </span>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Invoices Table */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-xs">Loading billing ledger...</span>
        </div>
      ) : invoices.length === 0 ? (
        <div className="py-10 text-center text-slate-500 text-xs">
          No billing invoices found for this organization.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/[0.08]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-black/40 border-b border-slate-200/80 dark:border-white/[0.08] text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Billing Cycle</th>
                <th className="py-3 px-4">Plan Tier</th>
                <th className="py-3 px-4">Usage Metered</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.06]">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>{inv.invoice_number}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{inv.billing_period}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      {inv.plan_tier}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    <span>{inv.tokens_consumed.toLocaleString()} / {inv.token_allowance.toLocaleString()} tok</span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    ${inv.amount_usd.toFixed(2)} {inv.currency}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      <span>{inv.status}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(inv)}
                      disabled={downloadingId === inv.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-xs font-bold border border-indigo-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                      title="Download official PDF Tax Receipt"
                    >
                      {downloadingId === inv.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : downloadSuccessId === inv.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Downloaded</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3 h-3" />
                          <span>PDF Receipt</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Compliance Footer Note */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 border-t border-slate-200/60 dark:border-white/[0.06] gap-2">
        <div className="flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
          <span>Automated monthly invoicing processed via Stripe Payment Gateway.</span>
        </div>
        <span className="font-mono text-[10px] text-slate-500">All PDF receipts include company tax ID &amp; line-item audit</span>
      </div>
    </div>
  );
};
