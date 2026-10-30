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
  Gauge,
  Zap,
  RefreshCw,
  Cpu,
  UserPlus,
  X,
  History as HistoryIcon,
  Bot,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Terminal,
} from "lucide-react";
import {
  api,
  DocumentItem,
  ApiKeyItem,
  SourceCitation,
  UsageSummary,
  MembershipItem,
  SessionSummary,
  WorkflowDefinition,
  AgentExecutionSummary,
  AgentExecutionDetail,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { CosmicThemeToggle } from "@/components/CosmicThemeToggle";
import { CustomRoleDropdown, ROLE_OPTIONS, INVITE_ROLE_OPTIONS } from "@/components/CustomRoleDropdown";
import { FloatingRocketDock, ActiveTab } from "@/components/FloatingRocketDock";
import { OrbitalCore } from "@/components/OrbitalCore";

function renderFormattedAnswer(text: string) {
  const lines = text.split("\n");
  return lines.map((line, lIdx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={lIdx} className="h-2" />;
    }

    const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("* ");
    const content = isBullet ? trimmed.replace(/^[•\-\*]\s*/, "") : trimmed;

    const parts = content.split(/(\*\*[^*]+\*\*)/g);

    const renderedParts = parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={pIdx} className="font-bold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.includes("[Source:")) {
        const subParts = part.split(/(\[Source:[^\]]+\])/g);
        return (
          <span key={pIdx}>
            {subParts.map((sub, sIdx) => {
              if (sub.startsWith("[Source:") && sub.endsWith("]")) {
                return (
                  <span
                    key={sIdx}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 mx-1"
                  >
                    {sub.slice(1, -1)}
                  </span>
                );
              }
              return sub;
            })}
          </span>
        );
      }
      return <span key={pIdx}>{part}</span>;
    });

    if (isBullet) {
      return (
        <div key={lIdx} className="flex items-start gap-2 ml-1 my-0.5">
          <span className="text-indigo-500 font-bold leading-5 select-none">•</span>
          <span className="leading-relaxed flex-1">{renderedParts}</span>
        </div>
      );
    }

    return (
      <p key={lIdx} className="leading-relaxed">
        {renderedParts}
      </p>
    );
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, organizationId, role, isLoading: authLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("documents");

  // Agent Workflows state (Section 8.4 & 11)
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [executions, setExecutions] = useState<AgentExecutionSummary[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<AgentExecutionDetail | null>(null);
  const [selectedWfName, setSelectedWfName] = useState("Enterprise Knowledge Auditor");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [isAgentExecuting, setIsAgentExecuting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalReason, setApprovalReason] = useState("");

  // Usage telemetry state (Section 7.4)
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [isUsageLoading, setIsUsageLoading] = useState(false);

  // Members state (Section 7.1)
  const [members, setMembers] = useState<MembershipItem[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("developer");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

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
      isStreaming?: boolean;
    }>
  >([]);
  // Conversation Session state (Section 16.1 #6)
  const [chatSessions, setChatSessions] = useState<SessionSummary[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

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
      loadUsage();
      loadMembers();
      loadChatSessions();
      loadAgentData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, organizationId]);

  // Auto-poll document status if any document is processing or queued
  useEffect(() => {
    const hasPendingDocs = documents.some(
      (d) => d.status === "processing" || d.status === "queued"
    );

    if (!hasPendingDocs || !token) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (attempts > 10) {
        clearInterval(interval);
        return;
      }
      loadDocuments();
    }, 3000);

    return () => clearInterval(interval);
  }, [documents, token]);

  // Scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isQuerying]);

  const loadAgentData = async () => {
    try {
      const [wfList, execList] = await Promise.all([
        api.listWorkflows(),
        api.listAgentExecutions()
      ]);
      setWorkflows(wfList);
      setExecutions(execList);
      if (execList.length > 0 && !selectedExecution) {
        const firstDetail = await api.getAgentExecution(execList[0].id);
        setSelectedExecution(firstDetail);
      }
    } catch (err) {
      console.error("Failed to load agent workflows:", err);
    }
  };

  const handleLaunchAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentPrompt.trim() || isAgentExecuting) return;
    setIsAgentExecuting(true);
    try {
      const detail = await api.startAgentExecution(selectedWfName, agentPrompt.trim());
      setSelectedExecution(detail);
      setAgentPrompt("");
      await loadAgentData();
      await loadUsage();
    } catch (err) {
      alert((err as Error).message || "Agent execution failed");
    } finally {
      setIsAgentExecuting(false);
    }
  };

  const handleSelectExecution = async (id: string) => {
    try {
      const detail = await api.getAgentExecution(id);
      setSelectedExecution(detail);
    } catch (err) {
      alert((err as Error).message || "Failed to load execution trace");
    }
  };

  const handleProcessApproval = async (approve: boolean) => {
    if (!selectedExecution) return;
    setIsApproving(true);
    try {
      const updated = await api.approveAgentAction(selectedExecution.id, approve, approvalReason || undefined);
      setSelectedExecution(updated);
      setApprovalReason("");
      await loadAgentData();
    } catch (err) {
      alert((err as Error).message || "Failed to process approval");
    } finally {
      setIsApproving(false);
    }
  };

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

  const loadUsage = async () => {
    try {
      setIsUsageLoading(true);
      const data = await api.getUsage();
      setUsage(data);
    } catch (e) {
      console.error("Failed to load telemetry usage:", e);
    } finally {
      setIsUsageLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!organizationId) return;
    try {
      setIsMembersLoading(true);
      const data = await api.listMembers(organizationId);
      setMembers(data);
    } catch (e) {
      console.error("Failed to load members:", e);
    } finally {
      setIsMembersLoading(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    setInviteError(null);
    setIsInviting(true);
    setGeneratedInviteLink(null);

    try {
      const res = await api.inviteMember(organizationId, inviteEmail, inviteRole);
      if (res.invitation_token) {
        const link = `${window.location.origin}/accept-invite?token=${res.invitation_token}`;
        setGeneratedInviteLink(link);
      }
      setInviteEmail("");
      await loadMembers();
    } catch (err: unknown) {
      setInviteError((err as Error).message || "Failed to invite member");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    if (!organizationId) return;
    if (!confirm("Are you sure you want to remove this member or revoke their invitation?")) return;
    try {
      await api.removeMember(organizationId, membershipId);
      await loadMembers();
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to remove member");
    }
  };

  const handleUpdateRole = async (membershipId: string, newRole: string) => {
    if (!organizationId) return;
    try {
      await api.updateMemberRole(organizationId, membershipId, newRole);
      await loadMembers();
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to update role");
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only authentic PDF documents are supported.");
      return;
    }

    if (documents.length >= 5) {
      setUploadError("Plan quota exceeded: Free tier allows up to 5 documents. Please delete an existing document or upgrade your plan to upload more.");
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

const loadChatSessions = async () => {
    setIsSessionsLoading(true);
    try {
      const data = await api.listChatSessions();
      setChatSessions(data);
    } catch (err) {
      console.error("Failed to load chat sessions:", err);
    } finally {
      setIsSessionsLoading(false);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    if (sessionId === currentSessionId) return;
    setCurrentSessionId(sessionId);
    try {
      const detail = await api.getChatSession(sessionId);
      const converted = detail.messages.map((m) => ({
        sender: m.sender as "user" | "assistant",
        text: m.content,
        sources: m.sources,
        model: m.model,
        isStreaming: false,
      }));
      setChatMessages(converted);
    } catch (err) {
      alert((err as Error).message || "Failed to load thread");
    }
  };

  const handleNewThread = () => {
    setCurrentSessionId(null);
    setChatMessages([]);
    setInputQuery("");
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this conversation thread?")) return;
    try {
      await api.deleteChatSession(sessionId);
      setChatSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        handleNewThread();
      }
    } catch (err) {
      alert((err as Error).message || "Failed to delete thread");
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isQuerying) return;

    const query = inputQuery.trim();
    setInputQuery("");
    
    // Append user query and empty streaming assistant response
    setChatMessages((prev) => [
      ...prev,
      { sender: "user", text: query },
      { sender: "assistant", text: "", isStreaming: true }
    ]);
    setIsQuerying(true);

    try {
      await api.chatQueryStream(
        query,
        3,
        {
          onSession: (meta) => {
            setCurrentSessionId(meta.session_id);
            loadChatSessions();
      loadAgentData();
          },
          onToken: (token: string) => {
          setChatMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last && last.sender === "assistant") {
              copy[copy.length - 1] = {
                ...last,
                text: last.text + token,
                isStreaming: true,
              };
            }
            return copy;
          });
        },
        onCitations: (citations: SourceCitation[]) => {
          setChatMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last && last.sender === "assistant") {
              copy[copy.length - 1] = {
                ...last,
                sources: citations,
              };
            }
            return copy;
          });
        },
        onDone: (metrics) => {
          setChatMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last && last.sender === "assistant") {
              copy[copy.length - 1] = {
                ...last,
                model: metrics.model,
                isStreaming: false,
              };
            }
            return copy;
          });
          setIsQuerying(false);
          loadUsage(); // Live refresh token quota telemetry (Section 7.4)
          loadChatSessions();
      loadAgentData(); // Refresh past conversation sessions list
        },
        onError: (errMsg: string) => {
          setChatMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last && last.sender === "assistant") {
              copy[copy.length - 1] = {
                ...last,
                text: (last.text ? last.text + "\n\n" : "") + `⚠️ ${errMsg}`,
                isStreaming: false,
              };
            }
            return copy;
          });
          setIsQuerying(false);
        }
      }, currentSessionId || undefined);
    } catch (err: unknown) {
      const errMsg = (err as Error).message || "Unknown error";
      setChatMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.sender === "assistant") {
          copy[copy.length - 1] = {
            ...last,
            text: (last.text ? last.text + "\n\n" : "") + `⚠️ ${errMsg}`,
            isStreaming: false,
          };
        } else {
          copy.push({
            sender: "assistant",
            text: `⚠️ ${errMsg}`,
            isStreaming: false,
          });
        }
        return copy;
      });
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
      <div className="min-h-screen flex items-center justify-center bg-[#060911] dark:bg-[#060911]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-36 sm:pb-32 flex flex-col selection:bg-blue-600 selection:text-white overflow-x-hidden">
      {/* Top Floating Glass Island (Navbar) */}
      <header className="h-16 border-b border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#090d18]/60 backdrop-blur-2xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors duration-300">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Brand Mark with Soft Glow */}
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg tracking-tight">
              Bytherix{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-400">
                EAM
              </span>
            </span>
          </div>

          <div className="h-4 w-px bg-slate-300 dark:bg-white/10 mx-1 sm:mx-2 hidden sm:block" />

          {/* Active Tenant Capsule */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300">
            <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 font-mono hidden md:inline">Tenant:</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white truncate max-w-[100px] sm:max-w-none">
              {organizationId ? `${organizationId.slice(0, 8)}...` : "Workspace"}
            </span>
          </div>

          {/* Role Badge */}
          <div className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
            <span>{role || "owner"}</span>
          </div>
        </div>

        {/* Right Nav Actions */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.full_name}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{user?.email}</p>
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
            className="p-2 rounded-full bg-slate-100 dark:bg-white/[0.05] hover:bg-red-500/10 border border-slate-200 dark:border-white/10 hover:border-red-500/30 text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Workspace Stage */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-32 sm:pb-36 space-y-6 sm:space-y-8">
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
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Enterprise Knowledge Library
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
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
                className={`conic-glow-inner p-6 sm:p-10 text-center cursor-pointer transition-all duration-300 ${
                  isDragging ? "bg-blue-50 dark:bg-[#11192d]" : ""
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
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-purple-600/20 border border-blue-500/20 dark:border-white/20 flex items-center justify-center text-blue-600 dark:text-blue-300 mb-3 shadow-[0_0_25px_rgba(59,130,246,0.2)] dark:shadow-[0_0_25px_rgba(59,130,246,0.4)]">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  {isDragging ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400 animate-pulse">
                        Release to launch ingestion sequence
                      </p>
                      <p className="text-xs text-blue-500 dark:text-blue-300/80">
                        File will be validated and queued for background chunking
                      </p>
                    </div>
                  ) : isUploading ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        Ingesting and validating %PDF- header...
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Worker thread generating 1536-dim vector embeddings
                      </p>
                    </div>
                  ) : documents.length >= 5 ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                        Plan Quota Reached (5/5 Documents)
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Free tier cap reached. Delete an existing document below to upload a new one.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Click or drag & drop PDF files to ingest
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Strict <span className="font-mono font-semibold text-blue-600 dark:text-cyan-400">%PDF-</span> magic byte validation with SHA-256 deduplication
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {uploadError && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Document Library Cards */}
            <div className="card-depth-3d p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.08]">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Ingested Documents ({documents.length})</span>
                </div>
                <button
                  onClick={loadDocuments}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-mono transition-colors"
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
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-slate-200 dark:border-white/[0.06] flex items-center justify-between transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                          <FileCheck2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-sm">
                            {doc.title || doc.filename}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span>{doc.page_count ? `${doc.page_count} pages` : "Queued"}</span>
                            {doc.checksum && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-slate-600 dark:text-slate-500">
                                  {doc.checksum.slice(0, 8)}...
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            doc.status === "indexed"
                              ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                              : doc.status === "processing"
                              ? "bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-400 animate-pulse"
                              : "bg-blue-500/15 border border-blue-500/40 text-blue-700 dark:text-blue-400"
                          }`}
                        >
                          {doc.status === "indexed" ? "Ready" : doc.status}
                        </span>

                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          title="Delete document"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
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
          <div className="card-depth-3d relative flex flex-col md:flex-row h-[620px] sm:h-[680px] overflow-hidden">
            {/* 1. Desktop Left Sidebar: Past Conversations (Always visible & docked on desktop) */}
            <div className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-white/[0.08] bg-slate-50/60 dark:bg-black/25 shrink-0">
              <div className="p-3.5 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-2">
                <button
                  onClick={handleNewThread}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-sm transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Thread</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                  <span>Past Threads</span>
                  <span className="font-mono">{chatSessions.length}</span>
                </div>

                {isSessionsLoading ? (
                  <div className="p-4 text-center text-xs text-slate-400">Loading threads...</div>
                ) : chatSessions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic">No saved threads yet</div>
                ) : (
                  chatSessions.map((session) => {
                    const isSelected = session.id === currentSessionId;
                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSelectSession(session.id)}
                        className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                          isSelected
                            ? "bg-indigo-50 dark:bg-white/[0.08] text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-500/30 shadow-sm"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="truncate pr-4 flex-1">
                          <p className="truncate font-medium">{session.title}</p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {session.message_count} messages
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSession(e, session.id)}
                          title="Delete thread"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. Mobile Slide-Over Drawer for Past Conversations */}
            {isMobileDrawerOpen && (
              <div className="md:hidden absolute inset-0 z-30 flex">
                <div
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                  onClick={() => setIsMobileDrawerOpen(false)}
                />
                <div className="relative w-72 max-w-[80%] h-full bg-white dark:bg-[#0d1322] border-r border-slate-200 dark:border-white/10 flex flex-col shadow-2xl z-40">
                  <div className="p-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                      <HistoryIcon className="w-4 h-4 text-indigo-500" />
                      <span>Past Conversations ({chatSessions.length})</span>
                    </div>
                    <button
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-2 border-b border-slate-200 dark:border-white/10">
                    <button
                      onClick={() => {
                        handleNewThread();
                        setIsMobileDrawerOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-sm transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Thread</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {chatSessions.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 italic">No saved threads yet</div>
                    ) : (
                      chatSessions.map((session) => {
                        const isSelected = session.id === currentSessionId;
                        return (
                          <div
                            key={session.id}
                            onClick={() => {
                              handleSelectSession(session.id);
                              setIsMobileDrawerOpen(false);
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                              isSelected
                                ? "bg-indigo-50 dark:bg-white/[0.08] text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-500/30"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                            }`}
                          >
                            <div className="truncate pr-2 flex-1">
                              <p className="truncate font-medium">{session.title}</p>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                {session.message_count} messages
                              </span>
                            </div>
                            <button
                              onClick={(e) => handleDeleteSession(e, session.id)}
                              className="p-1 text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Main Chat Viewport */}
            <div className="flex-1 flex flex-col min-w-0 h-full">
              {/* Chat Header Bar */}
              <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between bg-slate-50/80 dark:bg-white/[0.02] shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Mobile Thread Drawer Toggle */}
                  <button
                    onClick={() => setIsMobileDrawerOpen(true)}
                    className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-200/60 dark:bg-white/[0.06] text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors shrink-0"
                  >
                    <HistoryIcon className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Threads ({chatSessions.length})</span>
                  </button>

                  <div className="hidden sm:flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="truncate min-w-0">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white truncate">
                      Grounded Knowledge QA
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {currentSessionId
                        ? chatSessions.find((s) => s.id === currentSessionId)?.title || "Active Thread"
                        : "New Thread"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Quick New Thread on mobile */}
                  <button
                    onClick={handleNewThread}
                    title="Start fresh thread"
                    className="md:hidden p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] sm:text-[11px] font-mono text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded bg-slate-200/60 dark:bg-white/[0.05]">
                    Section 9.2 Hybrid
                  </span>
                </div>
              </div>

              {/* Chat Message Scrollable Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-500">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Ask your knowledge library</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm">
                      Answers are strictly grounded in your ingested documents with verbatim source citations.
                    </p>

                    <div className="flex flex-wrap gap-2 justify-center max-w-md pt-3">
                      <button
                        onClick={() => setInputQuery("What are the core technical requirements for Bytherix EAM?")}
                        className="text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        &quot;What are the core technical requirements for Bytherix EAM?&quot;
                      </button>
                      <button
                        onClick={() => setInputQuery("What are the subscription plans and quotas?")}
                        className="text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 transition-colors"
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
                        className={`max-w-2xl rounded-2xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed transition-all shadow-sm ${
                          msg.sender === "user"
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md border border-white/20"
                            : "bg-white/95 dark:bg-[#121829] backdrop-blur-md border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-200"
                        }`}
                      >
                        {msg.sender === "user" ? (
                          <p className="whitespace-pre-wrap font-medium">{msg.text}</p>
                        ) : msg.text ? (
                          <div className="space-y-1.5 text-slate-800 dark:text-slate-200">
                            {renderFormattedAnswer(msg.text)}
                            {msg.isStreaming && (
                              <span className="inline-block w-1.5 h-3.5 ml-1 bg-indigo-500 animate-pulse rounded-sm align-middle" />
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 py-1 text-xs text-indigo-600 dark:text-indigo-400">
                            <div className="w-3.5 h-3.5 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
                            <span className="font-medium animate-pulse">Consulting vector index & streaming grounded answer...</span>
                          </div>
                        )}

                        {/* Citations section */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/[0.08] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                <FileText className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                Citations & Provenance ({msg.sources.length})
                              </span>
                              {msg.model && (
                                <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
                                  Model: {msg.model}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {msg.sources.map((src, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="holo-citation p-2.5 rounded-xl text-[11px] text-slate-800 dark:text-slate-300 transition-all hover:border-indigo-500/30"
                                >
                                  <div className="flex items-center justify-between font-medium text-slate-600 dark:text-slate-400 mb-1">
                                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[220px]">
                                      {src.document_title || "Document"}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-mono text-[10px] font-semibold border border-indigo-500/20">
                                      Page {src.page_number} • Match: {(src.similarity_score * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  <p className="text-slate-600 dark:text-slate-400 line-clamp-2 italic text-[11px]">
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
                <div ref={chatBottomRef} />
              </div>

              {/* 4. Anchored Input Console (Clean flex layout with separate Send button) */}
              <form
                onSubmit={handleSendChat}
                className="p-3 sm:p-4 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/90 dark:bg-[#0d1322]/90 backdrop-blur-md shrink-0"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="Ask a question about your uploaded documents..."
                    className="flex-1 min-w-0 px-4 py-2.5 sm:py-3 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isQuerying || !inputQuery.trim()}
                    className="shrink-0 flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-500/20 transition-all active:scale-95"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB: GOVERNED AGENT WORKFLOWS (SECTION 8.4 & 11) */}
        {activeTab === "agents" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2">
                <span>Governed Agent Workflows</span>
                <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                Allowlisted tools, bounded step budgets, and human-in-the-loop authorization gates (Section 8.4 & 11).
              </p>
            </div>

            {/* Workflow Catalog Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {(workflows.length > 0 ? workflows : [
                {
                  id: "Enterprise Knowledge Auditor",
                  name: "Enterprise Knowledge Auditor",
                  category: "Governance & Compliance",
                  description: "Scans all ingested tenant documents, verifies chunk indexes, and audits compliance coverage.",
                  allowed_tools: ["DocumentSearchTool", "KnowledgeAuditReportTool", "QuotaCheckTool"],
                  has_approval_gate: false,
                },
                {
                  id: "Executive Briefing Synthesizer",
                  name: "Executive Briefing Synthesizer",
                  category: "Intelligence Synthesis",
                  description: "Cross-references multiple organization documents to generate high-level strategic intelligence.",
                  allowed_tools: ["DocumentSearchTool", "QuotaCheckTool"],
                  has_approval_gate: false,
                },
                {
                  id: "Governed Data Export & Integration",
                  name: "Governed Data Export & Integration",
                  category: "Operations",
                  description: "Prepares compliance data for external export. Pauses at human-in-the-loop gate before dispatch.",
                  allowed_tools: ["DocumentSearchTool", "SensitiveExportTool"],
                  has_approval_gate: true,
                },
              ]).map((wf) => {
                const wfName = wf.name || wf.id;
                const isSelected = selectedWfName === wfName;
                return (
                  <div
                    key={wf.id || wfName}
                    onClick={() => setSelectedWfName(wfName)}
                    className={`card-depth-3d p-4 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? "border-indigo-500/80 ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20"
                        : "hover:border-slate-300 dark:hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        {wf.category}
                      </span>
                      {wf.has_approval_gate && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Approval Gate
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">{wfName}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">{wf.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {wf.allowed_tools.map((t, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Launch Form */}
            <form onSubmit={handleLaunchAgent} className="card-depth-3d p-4 sm:p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Target Objective: {selectedWfName}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Max Step Budget: 5 Steps</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  required
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  placeholder="Enter objective for the agent (e.g., Audit knowledge base and verify token usage)..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isAgentExecuting || !agentPrompt.trim()}
                  className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isAgentExecuting ? "Executing Workflow..." : "Launch Governed Agent"}</span>
                </button>
              </div>
            </form>

            {/* Dual-Pane Execution Trace & History Monitor */}
            <div className="card-depth-3d flex flex-col md:flex-row h-[600px] rounded-2xl overflow-hidden">
              {/* Left Column: Execution History */}
              <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/[0.08] bg-slate-50/60 dark:bg-black/25 flex flex-col shrink-0">
                <div className="p-3 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Execution Audit Log ({executions.length})
                  </span>
                  <button onClick={loadAgentData} className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white">
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {executions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic">No executions recorded yet</div>
                  ) : (
                    executions.map((e) => {
                      const isSelected = selectedExecution?.id === e.id;
                      return (
                        <div
                          key={e.id}
                          onClick={() => handleSelectExecution(e.id)}
                          className={`p-3 rounded-xl cursor-pointer text-xs transition-all ${
                            isSelected
                              ? "bg-indigo-50 dark:bg-white/[0.08] text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-500/30"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold truncate text-[11px]">{e.workflow_name}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                e.status === "completed"
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : e.status === "pending_approval"
                                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 animate-pulse"
                                  : "bg-red-500/15 text-red-600 dark:text-red-400"
                              }`}
                            >
                              {e.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-1">{e.input_prompt}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{e.total_steps} steps</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Step-by-Step Trace & Approval Gate */}
              <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0d1322] overflow-y-auto p-4 sm:p-6 space-y-4">
                {!selectedExecution ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
                    <Bot className="w-10 h-10 text-indigo-400/50" />
                    <p className="text-xs">Select or launch a workflow to view its governed execution trace.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Header bar of trace */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{selectedExecution.workflow_name}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              selectedExecution.status === "completed"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : selectedExecution.status === "pending_approval"
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 animate-pulse border border-amber-500/30"
                                : "bg-red-500/15 text-red-600 dark:text-red-400"
                            }`}
                          >
                            {selectedExecution.status}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">&ldquo;{selectedExecution.input_prompt}&rdquo;</p>
                      </div>
                      <span className="text-xs font-mono text-slate-400">{selectedExecution.total_steps} steps executed</span>
                    </div>

                    {/* Human-In-The-Loop Approval Gate Banner (Section 8.4 #6) */}
                    {selectedExecution.status === "pending_approval" && (
                      <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 space-y-3 shadow-lg shadow-amber-500/5">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <h5 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                              Human-In-The-Loop Authorization Gate (Section 8.4 #6)
                            </h5>
                            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                              The agent proposed a consequential action requiring explicit tenant administrator authorization:
                            </p>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-amber-500/15 font-mono text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                          <p>
                            <strong>Proposed Tool:</strong> {selectedExecution.pending_tool_name}
                          </p>
                          <p>
                            <strong>Parameters:</strong> {selectedExecution.pending_tool_args}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={approvalReason}
                            onChange={(e) => setApprovalReason(e.target.value)}
                            placeholder="Optional authorization note..."
                            className="flex-1 px-3 py-2 rounded-xl text-xs bg-white dark:bg-black/40 border border-amber-500/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                          />
                          <button
                            type="button"
                            disabled={isApproving}
                            onClick={() => handleProcessApproval(true)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve & Execute</span>
                          </button>
                          <button
                            type="button"
                            disabled={isApproving}
                            onClick={() => handleProcessApproval(false)}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-red-500/30 flex items-center gap-1.5 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step-by-Step Execution Trace Timeline */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Agent Reasoning & Tool Step Log
                      </span>
                      {selectedExecution.traces.map((trace) => (
                        <div
                          key={trace.id}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">Step {trace.step_number}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                trace.status === "completed"
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : trace.status === "pending_approval"
                                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                  : "bg-red-500/15 text-red-600 dark:text-red-400"
                              }`}
                            >
                              {trace.status}
                            </span>
                          </div>

                          {trace.thought && (
                            <p className="text-slate-700 dark:text-slate-300 italic leading-relaxed">
                              &ldquo;{trace.thought}&rdquo;
                            </p>
                          )}

                          {trace.tool_name && (
                            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-black/30 font-mono text-[11px] space-y-1">
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                🔧 Tool: {trace.tool_name}
                              </span>
                              {trace.tool_output && (
                                <p className="text-slate-600 dark:text-slate-400 mt-1">{trace.tool_output}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Final Output Card */}
                    {selectedExecution.final_output && (
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-slate-800 dark:text-slate-200 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Finalized Workflow Result
                        </span>
                        <div className="whitespace-pre-wrap leading-relaxed">{selectedExecution.final_output}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: API KEYS */}
        {activeTab === "apikeys" && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2">
                <span>API Keys & Machine Access</span>
                <Key className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Scoped high-entropy API keys (`bx_live_...`) for CLI, pipelines, or integrations.
              </p>
            </div>

            {/* Revealed Key Modal */}
            {createdRawKey && (
              <div className="card-depth-3d p-5 border-amber-500/40 bg-amber-50/50 dark:bg-gradient-to-tr dark:from-amber-950/20 dark:to-black/60 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Copy Your API Secret Key (Shown Only Once!)</span>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-black/80 p-2.5 rounded-xl border border-amber-300 dark:border-amber-500/30">
                  <code className="text-xs font-mono text-slate-900 dark:text-white flex-1 break-all">
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
                  className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline pt-1 block font-medium"
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
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
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
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
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
                className="btn-3d btn-3d-purple disabled:opacity-50 w-full md:w-auto"
              >
                <span className="btn-3d-top py-2 px-4 text-xs justify-center">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Generate Key</span>
                </span>
              </button>
            </form>

            {/* Keys Table */}
            <div className="card-depth-3d overflow-hidden">
              <div className="divide-y divide-slate-200 dark:divide-white/[0.05]">
                {apiKeys.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No API keys generated yet.
                  </div>
                ) : (
                  apiKeys.map((k) => (
                    <div
                      key={k.id}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{k.name}</span>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-400 font-semibold">
                            {k.prefix}
                          </span>
                          {k.is_revoked && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 font-semibold">
                              Revoked
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 font-mono">
                          Scopes: {k.scopes}
                        </p>
                      </div>

                      {!k.is_revoked && (
                        <button
                          onClick={() => handleRevokeKey(k.id)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors font-medium"
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
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2">
                <span>Workspace & Quotas</span>
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Multi-tenant telemetry and subscription plan boundaries.
              </p>
            </div>

            {/* 3 Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card-depth-3d p-5 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Subscription Tier
                </span>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white">Starter Free</p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">Active Tenant Plan</p>
              </div>

              <div className="card-depth-3d p-5 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Document Limit
                </span>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {Math.min(documents.length, usage?.documents_limit ?? 5)}{" "}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    / {usage?.documents_limit ?? 5} docs
                  </span>
                </p>
                <p
                  className={`text-[11px] font-semibold ${
                    documents.length >= (usage?.documents_limit ?? 5)
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {documents.length >= (usage?.documents_limit ?? 5)
                    ? "● Quota Cap Reached (Free Tier)"
                    : "PDF Magic Byte Protected"}
                </p>
              </div>

              <div className="card-depth-3d p-5 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Token Allowance
                </span>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {(usage?.tokens_used ?? 0).toLocaleString()}{" "}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    / {(usage?.token_allowance ?? 100000).toLocaleString()}
                  </span>
                </p>
                <p
                  className={`text-[11px] font-semibold ${
                    usage?.is_quota_exceeded
                      ? "text-rose-600 dark:text-rose-400"
                      : (usage?.percentage_used ?? 0) >= 80
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {usage?.is_quota_exceeded
                    ? "● Quota Cap Reached"
                    : `${usage?.percentage_used ?? 0}% utilized this cycle`}
                </p>
              </div>
            </div>

            {/* Real-time Token Metering & Telemetry Console (Section 7.4) */}
            <div className="card-depth-3d p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/[0.08] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 dark:bg-teal-400/10 flex items-center justify-center text-teal-600 dark:text-teal-400 border border-teal-500/20">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Token Usage Metering</span>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300">
                        Section 7.4
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Real-time consumption telemetry across RAG inference & LLM prompts
                    </p>
                  </div>
                </div>

                <button
                  onClick={loadUsage}
                  disabled={isUsageLoading}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/[0.08] transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isUsageLoading ? "animate-spin" : ""}`} />
                  <span>Sync Telemetry</span>
                </button>
              </div>

              {/* Gauge Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-baseline text-xs font-semibold">
                  <span className="text-slate-700 dark:text-slate-300">
                    Quota Consumption Gauge
                  </span>
                  <span className="font-mono text-slate-900 dark:text-white font-bold">
                    {(usage?.tokens_used ?? 0).toLocaleString()} / {(usage?.token_allowance ?? 100000).toLocaleString()} tokens ({usage?.percentage_used ?? 0}%)
                  </span>
                </div>

                {/* Progress Bar Track */}
                <div className="h-3.5 w-full rounded-full bg-slate-200 dark:bg-black/60 border border-slate-300 dark:border-white/[0.08] overflow-hidden p-0.5 shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      (usage?.percentage_used ?? 0) >= 100
                        ? "bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_12px_rgba(244,63,94,0.6)]"
                        : (usage?.percentage_used ?? 0) >= 80
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                        : "bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-500 shadow-[0_0_12px_rgba(20,184,166,0.5)]"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(usage?.tokens_used ? 2 : 0, usage?.percentage_used ?? 0))}%` }}
                  />
                </div>
              </div>

              {/* Detailed Telemetry 4-Column Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <Cpu className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                    <span>Prompt Tokens</span>
                  </div>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
                    {(usage?.prompt_tokens ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">Context & RAG prompt</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    <span>Completion</span>
                  </div>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
                    {(usage?.completion_tokens ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">Generated answers</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <Layers className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    <span>RAG Queries</span>
                  </div>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
                    {(usage?.queries_count ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">Billable interactions</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <Gauge className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Remaining</span>
                  </div>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
                    {Math.max(0, (usage?.token_allowance ?? 100000) - (usage?.tokens_used ?? 0)).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">Monthly headroom</p>
                </div>
              </div>

              {/* Quota Threshold Warning Banner */}
              {(usage?.is_quota_exceeded || (usage?.percentage_used ?? 0) >= 80) && (
                <div
                  className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs ${
                    usage?.is_quota_exceeded
                      ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200"
                      : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200"
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <div>
                    <span className="font-bold">
                      {usage?.is_quota_exceeded
                        ? "Quota Limit Reached:"
                        : "Approaching Plan Boundary:"}
                    </span>{" "}
                    {usage?.is_quota_exceeded
                      ? "Your organization has consumed all 100,000 free tokens. Further RAG queries will be rejected with HTTP 429 until the next billing cycle or tier upgrade (Section 7.4)."
                      : `You have consumed ${usage?.percentage_used}% of your monthly allowance. Consider upgrading to the Growth Tier for higher allowances.`}
                  </div>
                </div>
              )}
            </div>

            {/* Workspace Identifiers Table */}
            <div className="card-depth-3d p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Workspace Identifiers
              </h3>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:justify-between p-2.5 sm:p-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] gap-1">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold">Organization ID:</span>
                  <span className="text-slate-900 dark:text-slate-200 font-bold break-all sm:break-normal">{organizationId}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between p-2.5 sm:p-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] gap-1">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold">Your User ID:</span>
                  <span className="text-slate-900 dark:text-slate-200 font-bold break-all sm:break-normal">{user?.id}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between p-2.5 sm:p-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] gap-1">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold">Tenant Role:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 uppercase font-extrabold">{role}</span>
                </div>
              </div>
            </div>

            {/* Team Members & Role Access Control (Section 7.1) */}
            <div className="card-depth-3d p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/[0.08] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Team Members & RBAC</span>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300">
                        Section 7.1
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Collaborator accounts, scoped roles, and single-use invitation tokens
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Invite Member</span>
                </button>
              </div>

              {/* Members List */}
              <div className="space-y-2">
                {members.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">
                    {isMembersLoading ? "Loading members..." : "No members found in this workspace."}
                  </div>
                ) : (
                  members.map((m) => (
                    <div
                      key={m.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/[0.06] gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-teal-500/20 to-indigo-500/20 flex items-center justify-center text-slate-800 dark:text-slate-200 font-bold text-xs uppercase border border-slate-200 dark:border-white/[0.08]">
                          {(m.user_full_name || m.user_email || "U").slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {m.user_full_name || "Invited User"}
                            </span>
                            {m.user_id === user?.id && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 font-mono font-semibold">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {m.user_email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            m.status === "active"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {m.status}
                        </span>

                        {/* Custom Role Dropdown */}
                        <div className="w-32">
                          <CustomRoleDropdown
                            value={m.role}
                            disabled={m.role === "organization_owner"}
                            onChange={(newRole) => handleUpdateRole(m.id, newRole)}
                            options={ROLE_OPTIONS}
                            compact
                          />
                        </div>

                        {/* Copy Invite Link if Invited */}
                        {m.status === "invited" && m.invitation_token && (
                          <button
                            onClick={() => {
                              const link = `${window.location.origin}/accept-invite?token=${m.invitation_token}`;
                              navigator.clipboard.writeText(link);
                              alert("Invitation link copied to clipboard!");
                            }}
                            title="Copy Invitation Link"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/[0.08] transition-all"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Remove / Revoke Button */}
                        {m.role !== "organization_owner" && (
                          <button
                            onClick={() => handleRemoveMember(m.id)}
                            title="Remove member"
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Invite Member Modal */}
            {showInviteModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="card-depth-3d w-full max-w-md p-6 space-y-4 relative">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Invite New Collaborator
                      </h4>
                    </div>
                    <button
                      onClick={() => {
                        setShowInviteModal(false);
                        setGeneratedInviteLink(null);
                        setInviteError(null);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {inviteError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200 text-xs">
                      {inviteError}
                    </div>
                  )}

                  {generatedInviteLink ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        <span>Invitation generated successfully!</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Share this single-use link with your teammate (valid for 7 days per Section 7.1):
                      </p>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/[0.08]">
                        <input
                          type="text"
                          readOnly
                          value={generatedInviteLink}
                          className="bg-transparent font-mono text-[11px] text-slate-900 dark:text-white w-full focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(generatedInviteLink);
                            setCopiedInvite(true);
                            setTimeout(() => setCopiedInvite(false), 2000);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-500 shrink-0 flex items-center gap-1"
                        >
                          {copiedInvite ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedInvite ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleInviteSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Teammate Email
                        </label>
                        <input
                          type="email"
                          required
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="teammate@example.com"
                          className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-100 dark:bg-black/40 border border-slate-300 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Tenant Role (Least Privilege)
                        </label>
                        <CustomRoleDropdown
                          value={inviteRole}
                          onChange={(val) => setInviteRole(val)}
                          options={INVITE_ROLE_OPTIONS}
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowInviteModal(false)}
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isInviting}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isInviting ? "Generating Invite..." : "Send Invitation"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
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
