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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      <div className="min-h-screen flex items-center justify-center bg-[#070b14]">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight">
            Bytherix <span className="text-blue-400">EAM</span>
          </span>
          <div className="h-4 w-px bg-slate-800 mx-2" />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono text-slate-400">Org:</span>
            <span className="font-semibold text-white truncate max-w-[140px]">
              {organizationId ? `${organizationId.slice(0, 8)}...` : "Workspace"}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
            {role || "member"}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-white">{user?.full_name}</p>
            <p className="text-[11px] text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            title="Sign out"
            className="p-2 rounded-lg bg-slate-800/50 hover:bg-red-950/40 border border-slate-700/60 hover:border-red-800/60 text-slate-400 hover:text-red-300 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-6 gap-6">
        {/* Sidebar Tabs */}
        <aside className="w-64 shrink-0 flex flex-col gap-2">
          <button
            onClick={() => setActiveTab("documents")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === "documents"
                ? "bg-blue-600/10 border border-blue-500/30 text-blue-400 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Documents Hub</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {documents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === "chat"
                ? "bg-blue-600/10 border border-blue-500/30 text-blue-400 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>RAG AI Assistant</span>
          </button>

          <button
            onClick={() => setActiveTab("apikeys")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === "apikeys"
                ? "bg-blue-600/10 border border-blue-500/30 text-blue-400 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <Key className="w-4 h-4" />
            <span>API Keys</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {apiKeys.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("team")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === "team"
                ? "bg-blue-600/10 border border-blue-500/30 text-blue-400 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Team & Quotas</span>
          </button>

          {/* Quick status card */}
          <div className="mt-auto p-4 rounded-xl border border-slate-800 bg-slate-900/30 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Backend API Live</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Postgres vector similarity + Non-blocking background worker active.
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
                  <h2 className="text-xl font-bold text-white tracking-tight">Documents & Knowledge Base</h2>
                  <p className="text-sm text-slate-400">
                    Upload enterprise PDFs to chunk, embed, and index into your private vector store.
                  </p>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isUploading
                    ? "border-blue-500 bg-blue-500/5"
                    : "border-slate-800 hover:border-blue-500/60 bg-slate-900/20 hover:bg-slate-900/40"
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
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  {isUploading ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-400">Uploading and validating magic bytes...</p>
                      <p className="text-xs text-slate-500">Background workers will chunk and embed vectors.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-white">Click or drag & drop PDF files here</p>
                      <p className="text-xs text-slate-500">
                        Strict %PDF- header validation with SHA-256 tenant deduplication.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {uploadError && (
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Document List Table */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Ingested Documents ({documents.length})</h3>
                  <button
                    onClick={loadDocuments}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Refresh
                  </button>
                </div>

                {documents.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-sm">
                    No documents uploaded yet. Upload a PDF above to begin question answering.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-blue-900/30 border border-blue-700/40 flex items-center justify-center text-blue-400 shrink-0">
                            <FileCheck2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate max-w-md">
                              {doc.title || doc.filename}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                              <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                              <span>•</span>
                              <span>{doc.page_count ? `${doc.page_count} pages` : "Pages queued"}</span>
                              {doc.checksum && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-[11px] text-slate-600">
                                    SHA: {doc.checksum.slice(0, 8)}...
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                              doc.status === "indexed"
                                ? "bg-emerald-950/60 border border-emerald-800/60 text-emerald-400"
                                : doc.status === "processing"
                                ? "bg-amber-950/60 border border-amber-800/60 text-amber-400 animate-pulse"
                                : "bg-blue-950/60 border border-blue-800/60 text-blue-400"
                            }`}
                          >
                            {doc.status}
                          </span>

                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            title="Delete document"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition-colors"
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
            <div className="flex-1 flex flex-col h-[calc(100vh-140px)] rounded-2xl border border-slate-800/80 bg-slate-900/40 overflow-hidden shadow-xl">
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-white">Grounded Knowledge QA</h3>
                </div>
                <span className="text-xs text-slate-400">
                  Retriever: Top-3 Cosine Similarity
                </span>
              </div>

              {/* Chat Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 text-slate-500">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Ask your knowledge base</h4>
                      <p className="text-xs text-slate-400 max-w-sm mt-1">
                        Queries are matched against chunk embeddings from your uploaded PDFs, returning strict verbatim citations.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center max-w-md pt-2">
                      <button
                        onClick={() => setInputQuery("What are the key highlights of this document?")}
                        className="text-xs px-3 py-1.5 rounded-full bg-slate-800/70 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
                      >
                        &quot;What are the key highlights?&quot;
                      </button>
                      <button
                        onClick={() => setInputQuery("Summarize the main requirements")}
                        className="text-xs px-3 py-1.5 rounded-full bg-slate-800/70 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
                      >
                        &quot;Summarize the main requirements&quot;
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
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                            : "bg-slate-800/60 border border-slate-700/60 text-slate-200"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>

                        {/* Citations section */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-slate-700/80 space-y-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              Citations & Provenance ({msg.sources.length})
                            </span>
                            <div className="grid grid-cols-1 gap-2">
                              {msg.sources.map((src, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/40 text-xs text-slate-300"
                                >
                                  <div className="flex items-center justify-between font-medium text-slate-400 mb-1">
                                    <span className="text-white truncate max-w-[200px]">
                                      {src.document_title || "Document"}
                                    </span>
                                    <span className="text-blue-400 font-mono text-[11px]">
                                      Page {src.page_number} (Score: {src.similarity_score.toFixed(3)})
                                    </span>
                                  </div>
                                  <p className="text-slate-400 line-clamp-2 italic">
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
                  <div className="flex items-center gap-2 text-xs text-blue-400">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span>Searching vector chunks & generating answer...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendChat} className="p-4 border-t border-slate-800/80 bg-slate-900/60">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="Ask a question about your uploaded documents..."
                    className="w-full pl-4 pr-12 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isQuerying || !inputQuery.trim()}
                    className="absolute right-2 p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                <h2 className="text-xl font-bold text-white tracking-tight">API Keys & Machine Access</h2>
                <p className="text-sm text-slate-400">
                  Generate scoped high-entropy API keys (`bx_live_...`) for CLI, pipelines, or integrations.
                </p>
              </div>

              {/* Reveal newly created key modal */}
              {createdRawKey && (
                <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-200 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Copy Your API Secret Key (Shown Only Once!)</span>
                  </div>
                  <p className="text-xs text-amber-200/80">
                    Make sure to store this key safely. You won&apos;t be able to view it again.
                  </p>
                  <div className="flex items-center gap-2 bg-black/60 p-2.5 rounded-xl border border-amber-900/60">
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
                    className="text-xs text-amber-400 hover:underline pt-1 block"
                  >
                    I have saved my key securely
                  </button>
                </div>
              )}

              {/* Create Key Form */}
              <form
                onSubmit={handleCreateApiKey}
                className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 flex flex-col md:flex-row gap-4 items-end"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingKey}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate Key</span>
                </button>
              </form>

              {/* Key List */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 overflow-hidden">
                <div className="divide-y divide-slate-800/60">
                  {apiKeys.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      No API keys generated yet.
                    </div>
                  ) : (
                    apiKeys.map((k) => (
                      <div
                        key={k.id}
                        className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{k.name}</span>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-blue-400">
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
                <h2 className="text-xl font-bold text-white tracking-tight">Organization & Plan Quotas</h2>
                <p className="text-sm text-slate-400">
                  Multi-tenant workspace configuration and tier boundaries.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Subscription Tier
                  </span>
                  <p className="text-2xl font-bold text-white">Starter Free</p>
                  <p className="text-xs text-emerald-400">Active Tenant Plan</p>
                </div>

                <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Document Limit
                  </span>
                  <p className="text-2xl font-bold text-white">
                    {documents.length} <span className="text-sm font-normal text-slate-500">/ 5 docs</span>
                  </p>
                  <p className="text-xs text-slate-400">PDF Magic Byte Protected</p>
                </div>

                <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Token Allowance
                  </span>
                  <p className="text-2xl font-bold text-white">100,000</p>
                  <p className="text-xs text-slate-400">Monthly RAG Token Budget</p>
                </div>
              </div>

              {/* Workspace details */}
              <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-4">
                <h3 className="text-sm font-semibold text-white">Workspace Identifiers</h3>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                    <span className="text-slate-500">Organization ID:</span>
                    <span className="text-slate-200">{organizationId}</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                    <span className="text-slate-500">Your User ID:</span>
                    <span className="text-slate-200">{user?.id}</span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
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
