"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  UploadCloud,
  Trash2,
  Send,
  Plus,
  Copy,
  Check,
  LogOut,
  Sparkles,
  ShieldAlert,
  FileCheck2,
  Layers,
  Key,
  Users,
} from "lucide-react";
import { api, DocumentItem, ApiKeyItem, SourceCitation } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { CosmicThemeToggle } from "@/components/CosmicThemeToggle";
import { FloatingRocketDock, ActiveTab } from "@/components/FloatingRocketDock";
import { OrbitalCore } from "@/components/OrbitalCore";

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, organizationId, role, isLoading: authLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("documents");

  // Documents state
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<
    Array<{
      sender: "user" | "assistant";
      text: string;
      sources?: SourceCitation[];
      model?: string;
    }>
  >([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState("docs:read,docs:write,chat:query");
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Auth gate
  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login");
    }
  }, [authLoading, token, router]);

  // Load initial data
  useEffect(() => {
    if (token) {
      loadDocuments();
      loadApiKeys();
    }
  }, [token]);

  // Auto-poll document status if any document is processing or queued
  useEffect(() => {
    const hasPendingDocs = documents.some(
      (d) => d.status === "processing" || d.status === "queued"
    );

    if (!hasPendingDocs || !token) return;

    const interval = setInterval(() => {
      loadDocuments();
    }, 2500);

    return () => clearInterval(interval);
  }, [documents, token]);

  // Scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isQuerying]);

  const loadDocuments = async () => {
    try {
      const docs = await api.listDocuments();
      setDocuments(docs);
    } catch (e) {
      console.error(e);
    }
  };

  const loadApiKeys = async () => {
    try {
      const keys = await api.listApiKeys();
      setApiKeys(keys);
    } catch (e) {
      console.error(e);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only authentic PDF documents are supported.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      await api.uploadDocument(file);
      await loadDocuments();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      setUploadError((err as Error).message || "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document and its chunk vectors?")) return;
    try {
      await api.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to delete document");
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isQuerying) return;

    const query = inputQuery.trim();
    setInputQuery("");
    setChatMessages((prev) => [...prev, { sender: "user", text: query }]);
    setIsQuerying(true);

    try {
      const response = await api.chatQuery(query, 3);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          text: response.answer,
          sources: response.sources,
          model: response.model,
        },
      ]);
    } catch (err: unknown) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          text: `⚠️ Error retrieving knowledge: ${(err as Error).message || "Unknown error"}`,
        },
      ]);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setIsCreatingKey(true);

    try {
      const newKey = await api.createApiKey(newKeyName.trim(), newKeyScopes);
      if (newKey.raw_key) {
        setCreatedRawKey(newKey.raw_key);
      }
      setNewKeyName("");
      await loadApiKeys();
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to create API key");
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This action is irreversible.")) return;
    try {
      await api.revokeApiKey(id);
      await loadApiKeys();
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to revoke API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  if (authLoading || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060911]">
        <OrbitalCore label="AUTHENTICATING TENANT..." />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-28 flex flex-col selection:bg-blue-600 selection:text-white overflow-x-hidden">
      {/* Top Floating Glass Island (Navbar) */}
      <header className="h-16 border-b border-white/[0.08] bg-[#090d18]/60 backdrop-blur-2xl px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {/* Brand Mark with Soft Glow */}
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-lg tracking-tight">
              Bytherix{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
                EAM
              </span>
            </span>
          </div>

          <div className="h-4 w-px bg-white/10 mx-2" />

          {/* Active Tenant Capsule */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs text-slate-300">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400 font-mono">Tenant:</span>
            <span className="font-mono font-medium text-white">
              {organizationId ? `${organizationId.slice(0, 8)}...` : "Workspace"}
            </span>
          </div>

          {/* Role Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{role || "owner"}</span>
          </div>
        </div>

        {/* Right Nav Actions */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-white">{user?.full_name}</p>
            <p className="text-[11px] text-slate-400">{user?.email}</p>
          </div>

          {/* Cosmic Night Sky Theme Toggle */}
          <CosmicThemeToggle />

          {/* Logout */}
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            title="Sign out"
            className="p-2 rounded-full bg-white/[0.05] hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Workspace Stage */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-8">
        {/* Living AI Core Centerpiece */}
        <OrbitalCore
          label={
            activeTab === "documents"
              ? "KNOWLEDGE INGESTION STATION"
              : activeTab === "chat"
              ? "GROUNDED HYBRID RAG CORE"
              : activeTab === "apikeys"
              ? "MACHINE AUTHENTICATION VAULT"
              : "TENANT WORKSPACE TELEMETRY"
          }
        />

        {/* TAB 1: DOCUMENTS HUB */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Enterprise Knowledge Library
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Validated PDF ingestion with chunk vectors and SHA-256 tenant deduplication.
              </p>
            </div>

            {/* Ingestion Dropzone */}
            <div className="conic-glow-box">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`conic-glow-inner p-8 text-center cursor-pointer transition-all duration-300 ${
                  isDragging ? "bg-[#11192d]" : ""
                }`}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-purple-600/30 border border-white/20 flex items-center justify-center text-blue-300 mb-3 shadow-[0_0_25px_rgba(59,130,246,0.4)]">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  {isDragging ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-blue-400 animate-pulse">
                        Release to launch ingestion sequence
                      </p>
                      <p className="text-xs text-blue-300/80">
                        File will be validated and queued for background chunking
                      </p>
                    </div>
                  ) : isUploading ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-blue-400">
                        Ingesting and validating %PDF- header...
                      </p>
                      <p className="text-xs text-slate-400">
                        Worker thread generating 1536-dim vector embeddings
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">
                        Click or drag & drop PDF files to ingest
                      </p>
                      <p className="text-xs text-slate-400">
                        Strict <span className="font-mono text-cyan-400">%PDF-</span> magic byte validation with SHA-256 deduplication
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {uploadError && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Document Library Cards */}
            <div className="card-depth-3d p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Ingested Documents ({documents.length})</span>
                </div>
                <button
                  onClick={loadDocuments}
                  className="text-xs text-blue-400 hover:text-blue-300 font-mono transition-colors"
                >
                  [refresh]
                </button>
              </div>

              {documents.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  No documents in your tenant library. Drop a PDF above to begin.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/15 flex items-center justify-between transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                          <FileCheck2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate max-w-sm">
                            {doc.title || doc.filename}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span>{doc.page_count ? `${doc.page_count} pages` : "Queued"}</span>
                            {doc.checksum && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-slate-500">
                                  {doc.checksum.slice(0, 8)}...
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            doc.status === "indexed"
                              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                              : doc.status === "processing"
                              ? "bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse"
                              : "bg-blue-500/10 border border-blue-500/30 text-blue-400"
                          }`}
                        >
                          {doc.status === "indexed" ? "Ready" : doc.status}
                        </span>

                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          title="Delete document"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: RAG AI CHATROOM */}
        {activeTab === "chat" && (
          <div className="card-depth-3d flex flex-col h-[650px] overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Grounded Knowledge QA
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-white/[0.04]">
                Section 9.2 Hybrid Retrieval
              </span>
            </div>

            {/* Conversation Scroll */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-slate-500">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Ask your knowledge library</h4>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Answers are strictly grounded in your ingested documents with verbatim source citations.
                  </p>

                  <div className="flex flex-wrap gap-2 justify-center max-w-md pt-3">
                    <button
                      onClick={() => setInputQuery("What are the core technical requirements for Bytherix EAM?")}
                      className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 transition-colors"
                    >
                      &quot;What are the core technical requirements for Bytherix EAM?&quot;
                    </button>
                    <button
                      onClick={() => setInputQuery("What are the subscription plans and quotas?")}
                      className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 transition-colors"
                    >
                      &quot;What are the subscription plans and quotas?&quot;
                    </button>
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg border border-white/20"
                          : "bg-white/[0.03] border border-white/10 text-slate-200"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {/* Citations section */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/[0.08] space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                            <FileText className="w-3 h-3 text-indigo-400" />
                            Citations & Provenance ({msg.sources.length})
                          </span>
                          <div className="grid grid-cols-1 gap-2">
                            {msg.sources.map((src, sIdx) => (
                              <div
                                key={sIdx}
                                className="holo-citation p-2.5 rounded-xl text-[11px] text-slate-300"
                              >
                                <div className="flex items-center justify-between font-medium text-slate-400 mb-1">
                                  <span className="text-white font-semibold truncate max-w-[220px]">
                                    {src.document_title || "Document"}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                                    Page {src.page_number} • Match: {(src.similarity_score * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <p className="text-slate-400 line-clamp-2 italic text-[11px]">
                                  &ldquo;{src.snippet}&rdquo;
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {isQuerying && (
                <div className="flex items-center gap-2 text-xs text-indigo-400 p-2">
                  <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span>Executing Section 9.2 hybrid search & generating answer...</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Glowing Input Console */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-white/[0.08] bg-black/20">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Ask a question about your uploaded documents..."
                  className="neon-console-input w-full pl-4 pr-24 py-3 text-xs placeholder-slate-500"
                />
                <button
                  type="submit"
                  disabled={isQuerying || !inputQuery.trim()}
                  className="btn-3d absolute right-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="btn-3d-top py-2 px-3 text-xs">
                    <span>Send</span>
                    <Send className="w-3 h-3" />
                  </span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: API KEYS */}
        {activeTab === "apikeys" && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
                <span>API Keys & Machine Access</span>
                <Key className="w-5 h-5 text-purple-400" />
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Scoped high-entropy API keys (`bx_live_...`) for CLI, pipelines, or integrations.
              </p>
            </div>

            {/* Revealed Key Modal */}
            {createdRawKey && (
              <div className="card-depth-3d p-5 border-amber-500/40 bg-gradient-to-tr from-amber-950/20 to-black/60 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Copy Your API Secret Key (Shown Only Once!)</span>
                </div>
                <div className="flex items-center gap-2 bg-black/80 p-2.5 rounded-xl border border-amber-500/30">
                  <code className="text-xs font-mono text-white flex-1 break-all">
                    {createdRawKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(createdRawKey)}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <button
                  onClick={() => setCreatedRawKey(null)}
                  className="text-[11px] text-amber-400 hover:underline pt-1 block"
                >
                  I have saved my key securely
                </button>
              </div>
            )}

            {/* Generate Key Form */}
            <form
              onSubmit={handleCreateApiKey}
              className="card-depth-3d p-5 flex flex-col md:flex-row gap-4 items-end"
            >
              <div className="flex-1 w-full">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                  Key Description / Name
                </label>
                <input
                  type="text"
                  required
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. CI/CD Ingestion Pipeline"
                  className="neon-console-input w-full px-3.5 py-2 text-xs"
                />
              </div>

              <div className="flex-1 w-full">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                  Permission Scopes (comma-separated)
                </label>
                <input
                  type="text"
                  value={newKeyScopes}
                  onChange={(e) => setNewKeyScopes(e.target.value)}
                  className="neon-console-input w-full px-3.5 py-2 text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingKey}
                className="btn-3d btn-3d-purple disabled:opacity-50"
              >
                <span className="btn-3d-top py-2 px-4 text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Generate Key</span>
                </span>
              </button>
            </form>

            {/* Keys Table */}
            <div className="card-depth-3d overflow-hidden">
              <div className="divide-y divide-white/[0.05]">
                {apiKeys.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No API keys generated yet.
                  </div>
                ) : (
                  apiKeys.map((k) => (
                    <div
                      key={k.id}
                      className="p-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">{k.name}</span>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400">
                            {k.prefix}
                          </span>
                          {k.is_revoked && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-800/60">
                              Revoked
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          Scopes: {k.scopes}
                        </p>
                      </div>

                      {!k.is_revoked && (
                        <button
                          onClick={() => handleRevokeKey(k.id)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-red-800/60 text-red-400 hover:bg-red-950/40 transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TEAM & WORKSPACE */}
        {activeTab === "team" && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
                <span>Workspace & Quotas</span>
                <Users className="w-5 h-5 text-emerald-400" />
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Multi-tenant telemetry and subscription plan boundaries.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card-depth-3d p-5 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Subscription Tier
                </span>
                <p className="text-2xl font-extrabold text-white">Starter Free</p>
                <p className="text-[11px] text-emerald-400">Active Tenant Plan</p>
              </div>

              <div className="card-depth-3d p-5 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Document Limit
                </span>
                <p className="text-2xl font-extrabold text-white">
                  {documents.length} <span className="text-xs font-normal text-slate-500">/ 5 docs</span>
                </p>
                <p className="text-[11px] text-slate-400">PDF Magic Byte Protected</p>
              </div>

              <div className="card-depth-3d p-5 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Token Allowance
                </span>
                <p className="text-2xl font-extrabold text-white">100,000</p>
                <p className="text-[11px] text-slate-400">Monthly RAG Token Budget</p>
              </div>
            </div>

            <div className="card-depth-3d p-5 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Workspace Identifiers
              </h3>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
                  <span className="text-slate-500">Organization ID:</span>
                  <span className="text-slate-200">{organizationId}</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
                  <span className="text-slate-500">Your User ID:</span>
                  <span className="text-slate-200">{user?.id}</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
                  <span className="text-slate-500">Tenant Role:</span>
                  <span className="text-emerald-400 uppercase font-semibold">{role}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Rocket Dock Anchored at the Bottom */}
      <FloatingRocketDock
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        documentCount={documents.length}
        apiKeyCount={apiKeys.length}
      />
    </div>
  );
}
