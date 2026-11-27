"use client";

import React, { useState, useEffect } from "react";
import {
  Webhook,
  Plus,
  Send,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Clock,
  Activity,
  AlertCircle,
  Loader2,
  FileCode,
  CheckCircle2,
  XCircle,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Terminal,
  Eye,
} from "lucide-react";
import {
  api,
  WebhookItem,
  WebhookCreatedResponse,
  WebhookDeliveryItem,
  WebhookTestResponse
} from "@/lib/api";

interface WebhookManagerCardProps {
  token?: string | null;
  isOwnerOrAdmin?: boolean;
}

const AVAILABLE_EVENTS = [
  {
    id: "model.promoted",
    label: "Model Promoted",
    description: "Fires when an AI model stage transitions to Staging or Production in MLOps.",
    color: "violet",
  },
  {
    id: "dlp.violation",
    label: "DLP Violation",
    description: "Fires when Zero-Leak DLP Shield intercepts PII, credentials, or keys.",
    color: "rose",
  },
];

export const WebhookManagerCard: React.FC<WebhookManagerCardProps> = ({
  token,
  isOwnerOrAdmin = true,
}) => {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Creation form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    "model.promoted",
    "dlp.violation",
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Secret reveal banner (One-Time Display)
  const [revealedSecret, setRevealedSecret] = useState<WebhookCreatedResponse | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Test Ping & Event state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testingEvent, setTestingEvent] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<WebhookTestResponse & { webhookId: string } | null>(null);
  const [showCardPreview, setShowCardPreview] = useState(false);

  // Delivery logs drawer
  const [deliveryDrawerWebhook, setDeliveryDrawerWebhook] = useState<WebhookItem | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryItem[]>([]);
  const [isLoadingDeliveries, setIsLoadingDeliveries] = useState(false);
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null);

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchWebhooks();
    }
  }, [token]);

  const fetchWebhooks = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const list = await api.getWebhooks();
      setWebhooks(list || []);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || "Failed to load webhook subscriptions.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEvent = (eventId: string) => {
    if (selectedEvents.includes(eventId)) {
      if (selectedEvents.length === 1) return; // Keep at least one event
      setSelectedEvents(selectedEvents.filter((e) => e !== eventId));
    } else {
      setSelectedEvents([...selectedEvents, eventId]);
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const created = await api.createWebhook({
        url: url.trim(),
        description: description.trim() || undefined,
        events: selectedEvents,
      });

      setRevealedSecret(created);
      setUrl("");
      setDescription("");
      setSelectedEvents(["model.promoted", "dlp.violation"]);
      setShowCreateForm(false);
      await fetchWebhooks();
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || "Failed to create webhook subscription.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm("Are you sure you want to delete this webhook subscription? Dispatched events will no longer reach this URL.")) {
      return;
    }
    try {
      setDeletingId(id);
      await api.deleteWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      if (testResult?.webhookId === id) setTestResult(null);
      if (deliveryDrawerWebhook?.id === id) setDeliveryDrawerWebhook(null);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || "Failed to delete webhook.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleTestEvent = async (webhook: WebhookItem, eventType: string = "ping") => {
    try {
      setTestingId(webhook.id);
      setTestingEvent(eventType);
      setTestResult(null);
      setShowCardPreview(false);
      const res = await api.testWebhook(webhook.id, eventType);
      setTestResult({ ...res, webhookId: webhook.id, event_type: eventType });
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || "Failed to dispatch test event.");
    } finally {
      setTestingId(null);
      setTestingEvent(null);
    }
  };

  const handleOpenDeliveries = async (webhook: WebhookItem) => {
    setDeliveryDrawerWebhook(webhook);
    try {
      setIsLoadingDeliveries(true);
      const logs = await api.getWebhookDeliveries(webhook.id);
      setDeliveries(logs || []);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || "Failed to load delivery logs.");
    } finally {
      setIsLoadingDeliveries(false);
    }
  };

  const handleCopySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2500);
  };

  return (
    <div className="card-depth-3d p-5 sm:p-6 space-y-6 border border-indigo-500/20 bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl rounded-2xl shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
              <Webhook className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Enterprise Event Webhooks</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                HMAC-SHA256 Signed
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Stream real-time security violations and MLOps promotion events to your SIEM, Discord, or external services.
          </p>
        </div>

        {isOwnerOrAdmin && (
          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {showCreateForm ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>New Webhook</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-3 text-xs text-red-600 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 dark:hover:text-red-300 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Revealed Secret Banner (One-Time Copy Guard) */}
      {revealedSecret && (
        <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-500/40 space-y-3 animate-fadeIn">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-500 animate-pulse" />
            <span>Copy Your Webhook Signing Secret (Shown Only Once!)</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Bytherix signs each payload with RFC 2104 HMAC-SHA256. Verify requests using the header{" "}
            <code className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-indigo-600 dark:text-indigo-400">
              X-Bytherix-Signature: sha256=...
            </code>
          </p>

          <div className="flex items-center gap-2 bg-white dark:bg-black/70 p-2.5 rounded-xl border border-amber-400/40 dark:border-amber-500/30">
            <code className="text-xs font-mono text-slate-900 dark:text-emerald-400 flex-1 break-all select-all font-semibold">
              {revealedSecret.secret}
            </code>
            <button
              type="button"
              onClick={() => handleCopySecret(revealedSecret.secret)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              {copiedSecret ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSecret ? "Copied" : "Copy Secret"}</span>
            </button>
          </div>

          <div className="flex justify-between items-center pt-1 text-[11px]">
            <span className="text-slate-500 font-mono text-[10px]">
              Prefix: {revealedSecret.secret_prefix}...
            </span>
            <button
              type="button"
              onClick={() => setRevealedSecret(null)}
              className="text-amber-700 dark:text-amber-400 hover:underline font-bold"
            >
              I have saved my secret securely
            </button>
          </div>
        </div>
      )}

      {/* Webhook Registration Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateWebhook}
          className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-black/40 border border-indigo-500/30 space-y-4 animate-fadeIn"
        >
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-white/[0.08] text-xs font-bold text-slate-900 dark:text-white">
            <Plus className="w-3.5 h-3.5 text-indigo-500" />
            <span>Register New Webhook Endpoint</span>
          </div>

          {/* Quick Presets for Slack / Discord / Local */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Presets:
            </span>
            <button
              type="button"
              onClick={() => {
                setUrl("https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_SLACK_TOKEN");
                setDescription("Slack Security & Incident Channel");
                setSelectedEvents(["model.promoted", "dlp.violation"]);
              }}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-[10.5px] font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-500 transition-colors"
            >
              Slack Webhook
            </button>
            <button
              type="button"
              onClick={() => {
                setUrl("https://discord.com/api/webhooks/YOUR_CHANNEL_ID/YOUR_DISCORD_TOKEN");
                setDescription("Discord Security Bot Alerts");
                setSelectedEvents(["model.promoted", "dlp.violation"]);
              }}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-[10.5px] font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-500 transition-colors"
            >
              Discord Webhook
            </button>
            <button
              type="button"
              onClick={() => {
                setUrl("http://127.0.0.1:8765/webhook");
                setDescription("Local Automated Receiver (Port 8765)");
                setSelectedEvents(["model.promoted", "dlp.violation"]);
              }}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-[10.5px] font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-500 transition-colors"
            >
              Local Test (Port 8765)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Payload URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.yourcompany.com/events/bytherix"
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-black/60 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <span className="text-[10px] text-slate-500">
                Must be an active HTTP/HTTPS endpoint accepting POST requests.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Production SIEM & Slack Alert Channel"
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-black/60 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500">
                Human-friendly label to identify this listener.
              </span>
            </div>
          </div>

          {/* Event subscriptions */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Subscribed Event Types ({selectedEvents.length} Selected)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {AVAILABLE_EVENTS.map((ev) => {
                const isChecked = selectedEvents.includes(ev.id);
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => handleToggleEvent(ev.id)}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      isChecked
                        ? "bg-indigo-500/10 border-indigo-500/50 shadow-sm"
                        : "bg-white/40 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition-all ${
                        isChecked
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-slate-400 dark:border-slate-600"
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {ev.id}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold whitespace-nowrap shrink-0">
                          {ev.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                        {ev.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !url.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Register Webhook</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Live Test Result Toast/Callout */}
      {testResult && (
        <div className="p-4 rounded-xl bg-slate-900 text-white border border-indigo-500/40 shadow-xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold flex-wrap">
              {testResult.status === "delivered" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-amber-400" />
              )}
              <span>Live Test: {testResult.status.toUpperCase()}</span>
              {testResult.event_type && (
                <span className="font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px]">
                  {testResult.event_type}
                </span>
              )}
              {testResult.status_code && (
                <span className="font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                  HTTP {testResult.status_code}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setTestResult(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] text-slate-300">{testResult.message}</p>

          <div className="bg-black/60 p-2.5 rounded-lg border border-white/10 font-mono text-[10px] space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span>Signature Header:</span>
              <span className="text-emerald-400 font-bold">RFC 2104 HMAC-SHA256</span>
            </div>
            <div className="text-indigo-300 break-all select-all font-semibold">
              X-Bytherix-Signature: {testResult.signature_preview}
            </div>
          </div>

          {testResult.formatted_card && (
            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={() => setShowCardPreview(!showCardPreview)}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>
                  {showCardPreview ? "Hide" : "View"} Formatted Card Payload (
                  {Object.keys(testResult.formatted_card).includes("attachments")
                    ? "Slack Block Kit"
                    : Object.keys(testResult.formatted_card).includes("embeds")
                    ? "Discord Embed"
                    : "JSON Envelope"}
                  )
                </span>
                {showCardPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showCardPreview && (
                <pre className="p-3 rounded-lg bg-black/80 border border-white/10 text-[10.5px] font-mono text-emerald-300 overflow-x-auto max-h-56 leading-relaxed">
                  {JSON.stringify(testResult.formatted_card, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Webhooks Table / List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto" />
            <p className="text-xs text-slate-500">Loading registered webhook subscriptions...</p>
          </div>
        ) : webhooks.length === 0 ? (
          <div className="py-12 text-center space-y-3 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl">
            <Radio className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto stroke-[1.5]" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                No Webhooks Registered
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Connect external SIEM or alerting services to receive automated notifications when models are promoted or DLP violations occur.
              </p>
            </div>
            {isOwnerOrAdmin && (
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Webhook</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
            {webhooks.map((w) => (
              <div
                key={w.id}
                data-testid="webhook-row"
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
              >
                {/* Left: Info */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white break-all">
                      {w.url}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        w.is_active
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-500/10 text-slate-500 border border-slate-500/30"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${w.is_active ? "bg-emerald-500" : "bg-slate-500"}`} />
                      {w.is_active ? "Active" : "Paused"}
                    </span>
                  </div>

                  {w.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {w.description}
                    </p>
                  )}

                  {/* Subscribed events & secret prefix */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      Events:
                    </span>
                    {w.events.map((ev) => (
                      <span
                        key={ev}
                        className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-semibold"
                      >
                        {ev}
                      </span>
                    ))}
                    <span className="text-slate-400 dark:text-slate-600">•</span>
                    <span className="font-mono text-[10px] text-slate-500">
                      Secret: {w.secret_prefix}••••••••
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 self-end md:self-center flex-shrink-0 flex-wrap">
                  {/* Test Ping Button */}
                  <button
                    type="button"
                    disabled={testingId === w.id}
                    onClick={() => handleTestEvent(w, "ping")}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 disabled:opacity-50 text-[11px] font-semibold transition-all shadow-xs"
                    title="Send a basic ping connectivity check"
                  >
                    {testingId === w.id && testingEvent === "ping" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    <span>Ping</span>
                  </button>

                  {/* Test DLP Alert */}
                  <button
                    type="button"
                    disabled={testingId === w.id}
                    onClick={() => handleTestEvent(w, "dlp.violation")}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 text-[11px] font-semibold transition-all shadow-xs"
                    title="Simulate a real DLP violation alert card (Slack Block Kit or Discord Embed)"
                  >
                    {testingId === w.id && testingEvent === "dlp.violation" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ShieldAlert className="w-3 h-3 text-rose-500" />
                    )}
                    <span>DLP Alert 🚨</span>
                  </button>

                  {/* Test MLOps Alert */}
                  <button
                    type="button"
                    disabled={testingId === w.id}
                    onClick={() => handleTestEvent(w, "model.promoted")}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 disabled:opacity-50 text-[11px] font-semibold transition-all shadow-xs"
                    title="Simulate a real MLOps model promotion / SLA alert card"
                  >
                    {testingId === w.id && testingEvent === "model.promoted" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Activity className="w-3 h-3 text-amber-500" />
                    )}
                    <span>MLOps SLA ⚠️</span>
                  </button>

                  {/* View Deliveries */}
                  <button
                    type="button"
                    onClick={() => handleOpenDeliveries(w)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 text-[11px] font-medium transition-colors"
                  >
                    <Activity className="w-3 h-3 text-slate-500" />
                    <span>Logs</span>
                  </button>

                  {/* Delete Webhook */}
                  {isOwnerOrAdmin && (
                    <button
                      type="button"
                      disabled={deletingId === w.id}
                      onClick={() => handleDeleteWebhook(w.id)}
                      className="p-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                      title="Delete webhook"
                    >
                      {deletingId === w.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delivery Logs Modal / Drawer */}
      {deliveryDrawerWebhook && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fadeIn">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Webhook Delivery History
                  </h4>
                </div>
                <p className="font-mono text-xs text-slate-500 truncate max-w-md">
                  {deliveryDrawerWebhook.url}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeliveryDrawerWebhook(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              {isLoadingDeliveries ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mx-auto" />
                  <p className="text-xs text-slate-500">Fetching delivery logs...</p>
                </div>
              ) : deliveries.length === 0 ? (
                <div className="py-12 text-center space-y-2 text-slate-500 text-xs">
                  <Clock className="w-6 h-6 mx-auto stroke-[1.5] text-slate-400" />
                  <p>No delivery attempts recorded for this webhook yet.</p>
                  <p className="text-[11px] text-slate-400">
                    Click &ldquo;Test Ping&rdquo; on the subscription to trigger a simulated delivery.
                  </p>
                </div>
              ) : (
                deliveries.map((d) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-black/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                            d.status === "delivered"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {d.status_code ? `HTTP ${d.status_code}` : d.status.toUpperCase()}
                        </span>
                        <span className="font-mono text-xs text-slate-900 dark:text-white font-semibold">
                          {d.event_type}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(d.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Attempts: {d.attempts}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedDeliveryId(
                            expandedDeliveryId === d.id ? null : d.id
                          )
                        }
                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>{expandedDeliveryId === d.id ? "Hide Payload" : "View Payload"}</span>
                      </button>
                    </div>

                    {expandedDeliveryId === d.id && (
                      <pre className="p-3 rounded-lg bg-black text-slate-300 font-mono text-[10px] overflow-x-auto border border-white/10 max-h-48">
                        {JSON.stringify(d.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setDeliveryDrawerWebhook(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-bold transition-colors"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
