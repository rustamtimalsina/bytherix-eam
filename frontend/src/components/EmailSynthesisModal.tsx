"use client";

import React, { useState } from "react";
import { Mail, X, Send, Loader2, FileText, ShieldCheck, AlertCircle } from "lucide-react";
import { api, DocumentItem } from "@/lib/api";

interface EmailSynthesisModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentIds: string[];
  documents: DocumentItem[];
  synthesisText?: string;
  onSuccess: (count: number) => void;
}

export const EmailSynthesisModal: React.FC<EmailSynthesisModalProps> = ({
  isOpen,
  onClose,
  documentIds,
  documents,
  synthesisText,
  onSuccess,
}) => {
  const [recipients, setRecipients] = useState("");
  const [notes, setNotes] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const chosenDocs = documents.filter((d) => documentIds.includes(d.id));

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedRecipients = recipients
      .split(/[,\n;]+/)
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = parsedRecipients.filter((r) => !emailRegex.test(r));

    if (parsedRecipients.length === 0) {
      setError("Please provide at least one recipient email address.");
      return;
    }

    if (invalidEmails.length > 0) {
      setError(`Invalid email format: ${invalidEmails.slice(0, 2).join(", ")}${invalidEmails.length > 2 ? "..." : ""}`);
      return;
    }

    try {
      setIsSending(true);
      const title =
        chosenDocs.length > 1
          ? `Strategic Synthesis: ${chosenDocs.slice(0, 2).map((d) => d.title || d.filename).join(" & ")}${chosenDocs.length > 2 ? " & more" : ""}`
          : `${chosenDocs[0]?.title || chosenDocs[0]?.filename || "Document"} Executive Intelligence Dossier`;

      const res = await api.emailSynthesisDossier({
        document_ids: documentIds,
        recipients: parsedRecipients,
        title,
        synthesis_text: synthesisText,
        notes: notes.trim() || undefined,
      });

      onSuccess(res.recipients_count);
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to dispatch synthesis email.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/[0.08] shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-white">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-black/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Dispatch Synthesis Dossier
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Attach ReportLab PDF intelligence dossier directly to stakeholder inboxes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSend} className="p-6 space-y-4">
          
          {/* Target Documents Summary */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Analyzed Documents ({chosenDocs.length})
              </span>
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                Vector PDF Attachment
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {chosenDocs.map((doc) => (
                <span
                  key={doc.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-[10.5px] text-slate-800 dark:text-slate-200 font-medium truncate max-w-full"
                >
                  <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{doc.title || doc.filename}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Recipient Emails */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Recipient Email Addresses <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="e.g. rustam@bytherix.com, ceo@bytherix.com"
              className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
              Separate multiple recipients with commas or semicolons
            </span>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Executive Context / Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add key highlights or action items for your stakeholders..."
              rows={3}
              className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Security & Audit Badge */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-500/20 text-[10.5px] text-indigo-900 dark:text-indigo-300">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              Tamper-evident SHA-256 seal attached. Logged to tenant immutable audit trail.
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || !recipients.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all active:scale-95 cursor-pointer"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Email</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
