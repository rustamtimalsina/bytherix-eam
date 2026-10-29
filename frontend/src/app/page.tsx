"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  FileText,
  MessageSquare,
  Key,
  Users,
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
  ShieldCheck,
} from "lucide-react";
import { api, DocumentItem, ApiKeyItem, SourceCitation } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type ActiveTab = "documents" | "chat" | "apikeys" | "team";

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
      <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)] animate-pulse">
            <Bot className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navbar with Glassmorphism */}
      <header className="h-16 border-b border-white/[0.08] bg-[#0c111d]/70 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-40 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-white/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-white tracking-tight text-base">
              Bytherix <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">EAM</span>
            </span>
          </div>

          <div className="h-4 w-px bg-white/10 mx-2" />

          {/* Org Pill with Live Dot */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#111726] border border-white/10 text-xs text-slate-300 shadow-inner">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Tenant:</span>
            <span className="font-mono font-medium text-white">
              {organizationId ? `${organizationId.slice(0, 8)}...` : "Workspace"}
            </span>
          </div>

          {/* Role Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{role || "owner"}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-white">{user?.full_name}</p>
            <p className="text-[11px] text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            title="Sign out"
            className="p-2.5 rounded-xl bg-[#141b2d] hover:bg-red-500/10 border border-white/10 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-all duration-200 shadow-sm"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-6 gap-6">
        {/* Sidebar Tabs */}
        <aside className="w-64 shrink-0 flex flex-col gap-2.5">
          <button
            onClick={() => setActiveTab("documents")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === "documents"
                ? "bg-gradient-to-r from-blue-600/20 to-indigo-600/10 border border-blue-500/40 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            <div className={`p-1.5 rounded-lg ${activeTab === "documents" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>
              <FileText className="w-4 h-4" />
            </div>
            <span>Documents Hub</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-200 font-mono">
              {documents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === "chat"
                ? "bg-gradient-to-r from-blue-600/20 to-indigo-600/10 border border-blue-500/40 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            <div className={`p-1.5 rounded-lg ${activeTab === "chat" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"}`}>
              <MessageSquare className="w-4 h-4" />
            </div>
            <span>RAG AI Assistant</span>
          </button>

          <button
            onClick={() => setActiveTab("apikeys")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === "apikeys"
                ? "bg-gradient-to-r from-blue-600/20 to-indigo-600/10 border border-blue-500/40 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            <div className={`p-1.5 rounded-lg ${activeTab === "apikeys" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400"}`}>
              <Key className="w-4 h-4" />
            </div>
            <span>API Keys</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-200 font-mono">
              {apiKeys.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("team")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === "team"
                ? "bg-gradient-to-r from-blue-600/20 to-indigo-600/10 border border-blue-500/40 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            <div className={`p-1.5 rounded-lg ${activeTab === "team" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"}`}>
              <Users className="w-4 h-4" />
            </div>
            <span>Team & Quotas</span>
          </button>

          {/* Quick status card with glowing pulse */}
          <div className="mt-auto uiverse-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Section 9.2 Hybrid RAG</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Lexical keyword weighting + Vector similarity search online.
            </p>
          </div>
        </aside>

        {/* Tab View Container */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* TAB 1: DOCUMENTS */}
          {activeTab === "documents" && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Documents & Knowledge Base</span>
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Upload enterprise PDFs to chunk, embed, and index into your private vector store.
                  </p>
                </div>
              </div>

              {/* Uiverse Dropzone with Holographic Pulse */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`uiverse-dropzone p-10 text-center cursor-pointer ${
                  isDragging ? "dragging" : ""
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
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 shadow-[0_0_25px_rgba(59,130,246,0.3)]">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  {isDragging ? (
                    <div className="space-y-1">
                      <p className="text-base font-bold text-blue-400 animate-pulse">
                        Release to drop and upload PDF
                      </p>
                      <p className="text-xs text-blue-300/80">
                        File will be validated and queued for background chunking
                      </p>
                    </div>
                  ) : isUploading ? (
                    <div className="space-y-1">
                      <p className="text-base font-bold text-blue-400">Uploading and validating magic bytes...</p>
                      <p className="text-xs text-slate-400">Background workers will chunk and embed vectors.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-white">
                        Click or drag & drop PDF files here
                      </p>
                      <p className="text-xs text-slate-400">
                        Strict <span className="font-mono text-blue-400">%PDF-</span> header validation with SHA-256 tenant deduplication.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {uploadError && (
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm flex items-center gap-2.5 shadow-lg">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Document List Table */}
              <div className="uiverse-card overflow-hidden">
                <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-blue-400" />
                    <span>Ingested Documents ({documents.length})</span>
                  </h3>
                  <button
                    onClick={loadDocuments}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                  >
                    Refresh
                  </button>
                </div>

                {documents.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-sm">
                    No documents uploaded yet. Drop a PDF above to begin question answering.
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.05]">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-900/40 to-indigo-900/40 border border-blue-700/40 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
                            <FileCheck2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate max-w-md">
                              {doc.title || doc.filename}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                              <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                              <span>•</span>
                              <span>{doc.page_count ? `${doc.page_count} pages` : "Pages queued"}</span>
                              {doc.checksum && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-[11px] text-slate-500">
                                    SHA: {doc.checksum.slice(0, 8)}...
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                              doc.status === "indexed"
                                ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                                : doc.status === "processing"
                                ? "bg-amber-500/10 border border-amber-500/40 text-amber-400 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                                : "bg-blue-500/10 border border-blue-500/40 text-blue-400"
                            }`}
                          >
                            {doc.status === "indexed" ? "Ready" : doc.status}
                          </span>

                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            title="Delete document"
                            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AI CHAT (RAG) */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col h-[calc(100vh-140px)] uiverse-card overflow-hidden">
              {/* Chat Header */}
              <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Grounded Knowledge QA</h3>
                    <p className="text-[11px] text-slate-400">Strict hybrid citation provenance</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-400 font-mono">
                  <span>Hybrid Lexical + Vector</span>
                </div>
              </div>

              {/* Chat Scroll Area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 text-slate-500">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">Ask your knowledge base</h4>
                      <p className="text-xs text-slate-400 max-w-sm mt-1">
                        Queries are matched using Section 9.2 Hybrid Search, scoring keywords and chunk vectors for high precision.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2.5 justify-center max-w-md pt-2">
                      <button
                        onClick={() => setInputQuery("What are the core technical requirements for Bytherix EAM?")}
                        className="uiverse-btn-secondary text-xs px-3.5 py-2 font-medium"
                      >
                        &quot;What are the core technical requirements for Bytherix EAM?&quot;
                      </button>
                      <button
                        onClick={() => setInputQuery("What are the subscription plans and quotas?")}
                        className="uiverse-btn-secondary text-xs px-3.5 py-2 font-medium"
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
                        className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_20px_rgba(79,70,229,0.35)] border border-white/20"
                            : "uiverse-card text-slate-200 border-white/10"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>

                        {/* Citations section */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-4 pt-3.5 border-t border-white/[0.08] space-y-2.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                              Citations & Provenance ({msg.sources.length})
                            </span>
                            <div className="grid grid-cols-1 gap-2">
                              {msg.sources.map((src, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="uiverse-citation p-3 rounded-xl text-xs text-slate-300"
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
                  <div className="flex items-center gap-2.5 text-xs text-indigo-400 p-2">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span>Executing Section 9.2 hybrid search & generating answer...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input Form with Uiverse Glowing Input */}
              <form onSubmit={handleSendChat} className="p-4 border-t border-white/[0.08] bg-white/[0.01]">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="Ask anything about your documents (e.g. Bytherix EAM requirements)..."
                    className="uiverse-input w-full pl-4 pr-12 py-3 text-sm placeholder-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={isQuerying || !inputQuery.trim()}
                    className="uiverse-btn-primary absolute right-1.5 p-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: API KEYS */}
          {activeTab === "apikeys" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>API Keys & Machine Access</span>
                  <Key className="w-5 h-5 text-purple-400" />
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Generate scoped high-entropy API keys (`bx_live_...`) for CLI, pipelines, or integrations.
                </p>
              </div>

              {/* Reveal newly created key modal */}
              {createdRawKey && (
                <div className="uiverse-card p-6 border-amber-500/40 bg-gradient-to-tr from-amber-950/30 to-black/60 shadow-[0_0_30px_rgba(245,158,11,0.2)] space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
                    <ShieldAlert className="w-5 h-5" />
                    <span>Copy Your API Secret Key (Shown Only Once!)</span>
                  </div>
                  <p className="text-xs text-amber-200/80">
                    Make sure to store this key safely. You won&apos;t be able to view it again.
                  </p>
                  <div className="flex items-center gap-2 bg-black/70 p-3 rounded-xl border border-amber-500/30 shadow-inner">
                    <code className="text-xs font-mono text-white flex-1 break-all">
                      {createdRawKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(createdRawKey)}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <button
                    onClick={() => setCreatedRawKey(null)}
                    className="text-xs text-amber-400 hover:underline pt-1 block"
                  >
                    I have saved my key securely
                  </button>
                </div>
              )}

              {/* Create Key Form */}
              <form
                onSubmit={handleCreateApiKey}
                className="uiverse-card p-6 flex flex-col md:flex-row gap-4 items-end"
              >
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Key Description / Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. CI/CD Ingestion Pipeline"
                    className="uiverse-input w-full px-3.5 py-2.5 text-sm"
                  />
                </div>

                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Permission Scopes (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newKeyScopes}
                    onChange={(e) => setNewKeyScopes(e.target.value)}
                    className="uiverse-input w-full px-3.5 py-2.5 text-xs font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingKey}
                  className="uiverse-btn-primary px-6 py-2.5 text-sm font-semibold flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate Key</span>
                </button>
              </form>

              {/* Key List */}
              <div className="uiverse-card overflow-hidden">
                <div className="divide-y divide-white/[0.05]">
                  {apiKeys.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      No API keys generated yet.
                    </div>
                  ) : (
                    apiKeys.map((k) => (
                      <div
                        key={k.id}
                        className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-semibold text-white">{k.name}</span>
                            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400">
                              {k.prefix}
                            </span>
                            {k.is_revoked && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-800/60">
                                Revoked
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 font-mono">
                            Scopes: {k.scopes}
                          </p>
                        </div>

                        {!k.is_revoked && (
                          <button
                            onClick={() => handleRevokeKey(k.id)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-red-800/60 text-red-400 hover:bg-red-950/40 transition-colors"
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

          {/* TAB 4: TEAM & QUOTAS */}
          {activeTab === "team" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Organization & Plan Quotas</span>
                  <Users className="w-5 h-5 text-emerald-400" />
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Multi-tenant workspace configuration and tier boundaries.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="uiverse-card p-6 space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Subscription Tier
                  </span>
                  <p className="text-3xl font-extrabold text-white">Starter Free</p>
                  <p className="text-xs text-emerald-400 font-medium">Active Tenant Plan</p>
                </div>

                <div className="uiverse-card p-6 space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Document Limit
                  </span>
                  <p className="text-3xl font-extrabold text-white">
                    {documents.length} <span className="text-sm font-normal text-slate-500">/ 5 docs</span>
                  </p>
                  <p className="text-xs text-slate-400">PDF Magic Byte Protected</p>
                </div>

                <div className="uiverse-card p-6 space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Token Allowance
                  </span>
                  <p className="text-3xl font-extrabold text-white">100,000</p>
                  <p className="text-xs text-slate-400">Monthly RAG Token Budget</p>
                </div>
              </div>

              {/* Workspace details */}
              <div className="uiverse-card p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white">Workspace Identifiers</h3>
                <div className="space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between p-3 rounded-xl bg-black/40 border border-white/[0.06]">
                    <span className="text-slate-500">Organization ID:</span>
                    <span className="text-slate-200">{organizationId}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-black/40 border border-white/[0.06]">
                    <span className="text-slate-500">Your User ID:</span>
                    <span className="text-slate-200">{user?.id}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-black/40 border border-white/[0.06]">
                    <span className="text-slate-500">Tenant Role:</span>
                    <span className="text-emerald-400 uppercase font-semibold">{role}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
