"use client";
import { BytherixEAMLogo } from "@/components/BytherixEAMLogo";

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
  ChevronDown,
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
  Download,
  Search,
  Eye,
  ShieldCheck,
  Filter,
  Activity,
  BarChart3,
  ExternalLink,
  ArrowRight,
  Database,
  Hash,
  Calendar,
  FileJson,
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
  RegisteredModelSummary,
  RegisteredModelDetail,
  PredictionResult,
  AuditLogItem,
  AuditStats,
  ObservabilityTelemetryResponse,
  DocumentChunksResponse,
  DeadLetterJobItem,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { CosmicThemeToggle } from "@/components/CosmicThemeToggle";
import { CustomRoleDropdown, ROLE_OPTIONS, INVITE_ROLE_OPTIONS } from "@/components/CustomRoleDropdown";
import { FloatingRocketDock, ActiveTab } from "@/components/FloatingRocketDock";
import { TiltCard3D } from "@/components/TiltCard3D";
import { DLPShieldModal } from "@/components/DLPShieldModal";
import { RAGScoreboardBadge } from "@/components/RAGScoreboardBadge";
import { DeveloperApiPortal } from "@/components/DeveloperApiPortal";
import { CommandPaletteModal } from "@/components/CommandPaletteModal";
import { TelemetrySparkline } from "@/components/TelemetrySparkline";
import { CitationInspectorDrawer } from "@/components/CitationInspectorDrawer";
import { DocumentScopeSelector } from "@/components/DocumentScopeSelector";
import { SubscriptionUpgradeModal } from "@/components/SubscriptionUpgradeModal";
import { MarkdownAnswer } from "@/components/MarkdownAnswer";
import { FlowButton } from "@/components/FlowButton";
import { EnterpriseFooter } from "@/components/EnterpriseFooter";
import { RAGEvalData } from "@/lib/api";

const TASK_TYPE_OPTIONS = [
  { value: "text-generation", label: "Text Generation (LLM)" },
  { value: "embeddings", label: "Dense Vector Embeddings" },
  { value: "classification", label: "Classification" },
  { value: "summarization", label: "Summarization" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, organizationId, role, isLoading: authLoading, logout } = useAuth();

  // Role-Aware Access Control (Section 3.1 & 10.2)
  const isOwnerOrAdmin =
    role === "organization_owner" ||
    role === "organization_administrator" ||
    Boolean(user?.is_platform_operator);

  const canManageModels =
    isOwnerOrAdmin || role === "ai_ml_engineer";

  const canUploadDocs =
    isOwnerOrAdmin || role === "developer" || role === "ai_ml_engineer";

  const canCreateApiKeys =
    isOwnerOrAdmin || role === "developer";

  const canViewAudit = isOwnerOrAdmin;

  const canRegisterModels =
    isOwnerOrAdmin || role === "developer" || role === "ai_ml_engineer";

  const canAccessModels =
    isOwnerOrAdmin || role === "developer" || role === "ai_ml_engineer";
  const [activeTab, setActiveTab] = useState<ActiveTab>("documents");

  // MLOps Model Registry state (Section 9 & 14)
  const [models, setModels] = useState<RegisteredModelSummary[]>([]);
  const [selectedModel, setSelectedModel] = useState<RegisteredModelDetail | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [predictPrompt, setPredictPrompt] = useState("");
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const [showNewModelModal, setShowNewModelModal] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const [newModelDesc, setNewModelDesc] = useState("");
  const [newModelTask, setNewModelTask] = useState("text-generation");
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);
  const taskDropdownRef = useRef<HTMLDivElement>(null);
  const [isCreatingModel, setIsCreatingModel] = useState(false);
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [newVersionTag, setNewVersionTag] = useState("");
  const [newVersionAccuracy, setNewVersionAccuracy] = useState("98.0");
  const [newVersionLatency, setNewVersionLatency] = useState("85");
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);

  // Audit Logs state (Section 10 & 13)
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<"" | "info" | "warning" | "critical">("");
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const auditLimit = 15;
  const [isExportingAudit, setIsExportingAudit] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<"csv" | "json" | null>(null);
  const [auditDatePreset, setAuditDatePreset] = useState<"all" | "24h" | "7d" | "30d">("all");
  const [auditExportNotification, setAuditExportNotification] = useState<{
    format: string;
    recordCount: string;
    checksum: string;
    filename: string;
  } | null>(null);
  const [copiedChecksum, setCopiedChecksum] = useState(false);
  const [inspectingAuditLog, setInspectingAuditLog] = useState<AuditLogItem | null>(null);
  const [copiedAuditJson, setCopiedAuditJson] = useState(false);

  // Observability & Prometheus Telemetry state (Section 13 & 14.3)
  const [telemetry, setTelemetry] = useState<ObservabilityTelemetryResponse | null>(null);
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState(false);
  const [auditSubView, setAuditSubView] = useState<"logs" | "telemetry" | "dlq">("logs");

  // DLQ (Dead-Letter Queue) State (Section 11.3 & 14)
  const [dlqJobs, setDlqJobs] = useState<DeadLetterJobItem[]>([]);
  const [dlqTotal, setDlqTotal] = useState(0);
  const [isLoadingDlq, setIsLoadingDlq] = useState(false);
  const [dlqStatusFilter, setDlqStatusFilter] = useState<string>("");
  const [inspectingDlqJob, setInspectingDlqJob] = useState<DeadLetterJobItem | null>(null);
  const [copiedDlqTrace, setCopiedDlqTrace] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [purgingJobId, setPurgingJobId] = useState<string | null>(null);
  const [dlqActionMessage, setDlqActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Agent Workflows state (Section 8.4 & 11)
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [executions, setExecutions] = useState<AgentExecutionSummary[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<AgentExecutionDetail | null>(null);
  const [selectedWfName, setSelectedWfName] = useState("Enterprise Knowledge Auditor");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [isAgentExecuting, setIsAgentExecuting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalReason, setApprovalReason] = useState("");

  // Real-Time SSE Notification Alert state
  interface LiveAlertItem {
    id: string;
    type: string;
    title: string;
    message: string;
  }
  const [liveAlert, setLiveAlert] = useState<LiveAlertItem | null>(null);

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
  // Document Scope Filtering State (Section 8.2)
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const handleToggleDocScope = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllDocScope = () => {
    const readyIds = documents.filter((d) => d.status.toLowerCase() === "ready").map((d) => d.id);
    setSelectedDocIds(readyIds);
  };

  const handleClearDocScope = () => {
    setSelectedDocIds([]);
  };

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
      evaluation?: RAGEvalData;
    }>
  >([]);
  // Conversation Session state (Section 16.1 #6)
  const [chatSessions, setChatSessions] = useState<SessionSummary[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const [inputQuery, setInputQuery] = useState("");
  const [copiedMessageIdx, setCopiedMessageIdx] = useState<number | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [isDlpModalOpen, setIsDlpModalOpen] = useState(false);
  const [activeDlpEvent, setActiveDlpEvent] = useState<{
    isMasked: boolean;
    categories?: string[];
    count?: number;
    summary: string;
  } | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState("docs:read,docs:write,chat:query");
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);

  const showToast = (title: string, message: string, type: "info" | "success" | "error" | "warning" = "info") => {
    setLiveAlert({
      id: String(Date.now()),
      type,
      title,
      message,
    });
  };

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
      if (canAccessModels) {
        loadModelsData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, organizationId, canAccessModels]);

  // Load audit trail data
  const loadAuditData = async () => {
    try {
      setIsLoadingAudit(true);
      let startDate: string | undefined = undefined;
      if (auditDatePreset === "24h") {
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      } else if (auditDatePreset === "7d") {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (auditDatePreset === "30d") {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      const [stats, logs] = await Promise.all([
        api.getAuditStats(),
        api.listAuditLogs({
          severity: auditSeverityFilter || undefined,
          startDate,
          limit: auditLimit,
          offset: (auditPage - 1) * auditLimit,
        }),
      ]);
      setAuditStats(stats);
      setAuditLogs(logs.items);
      setAuditTotal(logs.total);
    } catch (err) {
      console.error("Failed to load audit data", err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const loadTelemetryData = async () => {
    try {
      setIsLoadingTelemetry(true);
      const data = await api.getObservabilityTelemetry();
      setTelemetry(data);
    } catch (err) {
      console.error("Failed to load telemetry data", err);
    } finally {
      setIsLoadingTelemetry(false);
    }
  };

  const loadDlqData = async () => {
    try {
      setIsLoadingDlq(true);
      const res = await api.listDeadLetterJobs({
        status: dlqStatusFilter || undefined,
        limit: 50,
      });
      setDlqJobs(res.items);
      setDlqTotal(res.total);
    } catch (err) {
      console.error("Failed to load DLQ data", err);
    } finally {
      setIsLoadingDlq(false);
    }
  };

  const handleRetryDlqJob = async (jobId: string) => {
    try {
      setRetryingJobId(jobId);
      const res = await api.retryDeadLetterJob(jobId);
      setDlqActionMessage({ type: "success", text: res.message });
      setTimeout(() => setDlqActionMessage(null), 5000);
      loadDlqData();
      if (inspectingDlqJob?.id === jobId) {
        setInspectingDlqJob((prev) => (prev ? { ...prev, status: "retrying", retry_count: prev.retry_count + 1 } : null));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to retry job";
      setDlqActionMessage({ type: "error", text: msg });
      setTimeout(() => setDlqActionMessage(null), 5000);
    } finally {
      setRetryingJobId(null);
    }
  };

  const handlePurgeDlqJob = async (jobId: string) => {
    try {
      setPurgingJobId(jobId);
      const res = await api.purgeDeadLetterJob(jobId);
      setDlqActionMessage({ type: "success", text: res.message });
      setTimeout(() => setDlqActionMessage(null), 5000);
      loadDlqData();
      if (inspectingDlqJob?.id === jobId) {
        setInspectingDlqJob(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to purge job";
      setDlqActionMessage({ type: "error", text: msg });
      setTimeout(() => setDlqActionMessage(null), 5000);
    } finally {
      setPurgingJobId(null);
    }
  };

  const handleExportAuditLogs = async (format: "csv" | "json") => {
    try {
      setIsExportingAudit(true);
      setExportingFormat(format);
      let startDate: string | undefined = undefined;
      if (auditDatePreset === "24h") {
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      } else if (auditDatePreset === "7d") {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (auditDatePreset === "30d") {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      const { blob, filename, checksum, recordCount } = await api.exportAuditLogs({
        format,
        startDate,
        severity: auditSeverityFilter || undefined,
        action: auditSearchQuery.trim() || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setAuditExportNotification({
        format: format.toUpperCase(),
        recordCount,
        checksum,
        filename,
      });
      setTimeout(() => setAuditExportNotification(null), 10000);
    } catch (err) {
      console.error(`Failed to export audit logs as ${format.toUpperCase()}`, err);
    } finally {
      setIsExportingAudit(false);
      setExportingFormat(null);
    }
  };

  // Re-fetch audit logs when switching to audit tab or changing filters
  useEffect(() => {
    if (token && activeTab === "audit") {
      if (auditSubView === "logs" && canViewAudit) {
        loadAuditData();
        loadTelemetryData();
      } else if (auditSubView === "telemetry") {
        loadTelemetryData();
      } else if (auditSubView === "dlq") {
        loadDlqData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeTab, auditSubView, auditSeverityFilter, auditDatePreset, auditPage, dlqStatusFilter]);

  // Re-fetch models when switching to models tab
  useEffect(() => {
    if (token && activeTab === "models" && canAccessModels) {
      loadModelsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeTab, canAccessModels]);

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

  // Real-time Event Stream (Live Human-In-The-Loop Approval & Indexing Alerts)
  useEffect(() => {
    if (!token) return;
    const url = api.getNotificationStreamUrl();
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "approval_required") {
          setLiveAlert({
            id: String(Date.now()),
            type: "approval_required",
            title: data.title || "Human-In-The-Loop Approval Required",
            message: data.message || "An agent execution is paused awaiting administrator authorization."
          });
          loadAgentData();
        } else if (data.type === "approval_resolved") {
          setLiveAlert({
            id: String(Date.now()),
            type: "approval_resolved",
            title: data.title || "Approval Processed",
            message: data.message
          });
          loadAgentData();
        } else if (data.type === "quota_warning") {
          setLiveAlert({
            id: String(Date.now()),
            type: "warning",
            title: data.title || "Token Quota Warning (80% Utilized)",
            message: data.message || "You have reached 80% of your monthly AI token budget."
          });
          loadUsage();
        } else if (data.type === "quota_exceeded") {
          setLiveAlert({
            id: String(Date.now()),
            type: "error",
            title: data.title || "Token Quota Exceeded (100% Used)",
            message: data.message || "Monthly token quota exhausted. Inference requests are blocked."
          });
          loadUsage();
        } else if (data.type === "latency_budget_exceeded") {
          setLiveAlert({
            id: String(Date.now()),
            type: "warning",
            title: data.title || "Latency SLA Budget Exceeded",
            message: data.message || "Platform p95 latency is exceeding target SLA budget."
          });
        } else if (data.type === "plan_upgraded") {
          setLiveAlert({
            id: String(Date.now()),
            type: "plan_upgraded",
            title: data.title || "Subscription Upgraded",
            message: data.message
          });
          loadUsage();
        } else if (data.type === "document_indexed" || data.type === "document_failed") {
          setLiveAlert({
            id: String(Date.now()),
            type: data.type,
            title: data.title || "Document Update",
            message: data.message
          });
          loadDocuments();
        }
      } catch {}
    };

    return () => {
      es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Auto-dismiss live alerts after 8 seconds
  useEffect(() => {
    if (!liveAlert) return;
    const timer = setTimeout(() => {
      setLiveAlert(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [liveAlert]);

  // Scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isQuerying]);

  // Close task type dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (taskDropdownRef.current && !taskDropdownRef.current.contains(event.target as Node)) {
        setIsTaskDropdownOpen(false);
      }
    }
    if (isTaskDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isTaskDropdownOpen]);

  const loadModelsData = async () => {
    try {
      setIsModelLoading(true);
      const list = await api.listModels();
      setModels(list);
      if (list.length > 0) {
        const targetId = selectedModelId || list[0].id;
        setSelectedModelId(targetId);
        const detail = await api.getModel(targetId);
        setSelectedModel(detail);
      }
    } catch (err) {
      console.error("Failed to load MLOps models:", err);
    } finally {
      setIsModelLoading(false);
    }
  };

  const handleSelectModel = async (id: string) => {
    try {
      setSelectedModelId(id);
      setPredictionResult(null);
      const detail = await api.getModel(id);
      setSelectedModel(detail);
    } catch (err) {
      showToast("Operation Notice", (err as Error).message || "Failed to load model details", "error");
    }
  };

  const handlePromoteVersion = async (versionId: string, stage: string) => {
    try {
      setIsPromoting(true);
      await api.promoteModelVersion(versionId, stage);
      if (selectedModelId) {
        const detail = await api.getModel(selectedModelId);
        setSelectedModel(detail);
      }
      const list = await api.listModels();
      setModels(list);
    } catch (err) {
      showToast("Operation Notice", (err as Error).message || "Failed to promote version", "error");
    } finally {
      setIsPromoting(false);
    }
  };

  const handleRollbackVersion = async (targetVersionId: string) => {
    if (!selectedModelId) return;
    try {
      setIsPromoting(true);
      await api.rollbackModel(selectedModelId, targetVersionId);
      const detail = await api.getModel(selectedModelId);
      setSelectedModel(detail);
      const list = await api.listModels();
      setModels(list);
    } catch (err) {
      showToast("Operation Notice", (err as Error).message || "Failed to rollback version", "error");
    } finally {
      setIsPromoting(false);
    }
  };

  const handleCreateNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionTag.trim() || !selectedModelId || isCreatingVersion) return;
    try {
      setIsCreatingVersion(true);
      await api.createModelVersion(
        selectedModelId,
        newVersionTag.trim(),
        JSON.stringify({ context_window: 128000, temperature: 0.7 }),
        parseFloat(newVersionAccuracy) / 100.0 || 0.95,
        parseFloat(newVersionLatency) || 90.0
      );
      setShowNewVersionModal(false);
      setNewVersionTag("");
      const detail = await api.getModel(selectedModelId);
      setSelectedModel(detail);
      const list = await api.listModels();
      setModels(list);
    } catch (err) {
      showToast("Operation Notice", (err as Error).message || "Failed to create model version", "error");
    } finally {
      setIsCreatingVersion(false);
    }
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!predictPrompt.trim() || !selectedModel || isPredicting) return;
    try {
      setIsPredicting(true);
      const res = await api.predictModel(selectedModel.name, predictPrompt.trim());
      setPredictionResult(res);
      await loadUsage();
    } catch (err) {
      showToast("Operation Notice", (err as Error).message || "Prediction request failed", "error");
    } finally {
      setIsPredicting(false);
    }
  };

  const handleCreateNewModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelName.trim() || isCreatingModel) return;
    try {
      setIsCreatingModel(true);
      const created = await api.registerModel(newModelName.trim(), newModelDesc.trim() || undefined, newModelTask);
      setShowNewModelModal(false);
      setNewModelName("");
      setNewModelDesc("");
      await loadModelsData();
      handleSelectModel(created.id);
    } catch (err) {
      showToast("Operation Notice", (err as Error).message || "Failed to register model", "error");
    } finally {
      setIsCreatingModel(false);
    }
  };

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
      showToast("Operation Notice", (err as Error).message || "Agent execution failed", "error");
    } finally {
      setIsAgentExecuting(false);
    }
  };

  const handleSelectExecution = async (id: string) => {
    try {
      const detail = await api.getAgentExecution(id);
      setSelectedExecution(detail);
    } catch (err) {
      showToast("Operation Notice", (err as Error).message || "Failed to load execution trace", "error");
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
      showToast("Operation Notice", (err as Error).message || "Failed to process approval", "error");
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
      showToast("Operation Notice", (err as Error).message || "Failed to remove member", "error");
    }
  };

  const handleUpdateRole = async (membershipId: string, newRole: string) => {
    if (!organizationId) return;
    try {
      await api.updateMemberRole(organizationId, membershipId, newRole);
      await loadMembers();
    } catch (err: unknown) {
      showToast("Operation Notice", (err as Error).message || "Failed to update role", "error");
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

  const handleSeedDemoKnowledge = async () => {
    try {
      setIsSeedingDemo(true);
      const doc = await api.seedDemoKnowledge();
      showToast("Enterprise Knowledge Ready", `Loaded '${doc.title}' with 5 vector chunks.`, "success");
      await loadDocuments();
      await loadUsage();
    } catch (err: unknown) {
      showToast("Seeding Failed", (err as Error).message || "Failed to load demo document", "error");
    } finally {
      setIsSeedingDemo(false);
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

  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  // Document Chunks Inspection state (Sections 8 & 9)
  const [selectedDocumentChunks, setSelectedDocumentChunks] = useState<DocumentChunksResponse | null>(null);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [showChunksModal, setShowChunksModal] = useState(false);
  const [chunkSearchQuery, setChunkSearchQuery] = useState("");
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<SourceCitation | null>(null);

  useEffect(() => {
    const handleOpenPalette = () => setIsCommandPaletteOpen(true);
    window.addEventListener("open-command-palette", handleOpenPalette);
    return () => window.removeEventListener("open-command-palette", handleOpenPalette);
  }, []);

  const handleDownloadDocument = async (docId: string) => {
    try {
      setDownloadingDocId(docId);
      const res = await api.getDocumentDownloadUrl(docId);
      let targetUrl = res.download_url;
      if (!targetUrl.startsWith("http")) {
        const token = api.getToken();
        const base = api.getApiBaseUrl();
        targetUrl = `${base.replace(/\/api\/v1\/?$/, "")}${targetUrl}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
      }
      window.open(targetUrl, "_blank");
    } catch (err: unknown) {
      showToast("Operation Notice", (err as Error).message || "Failed to generate document download URL", "error");
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleInspectChunks = async (docId: string) => {
    try {
      setIsLoadingChunks(true);
      setShowChunksModal(true);
      setChunkSearchQuery("");
      const res = await api.getDocumentChunks(docId);
      setSelectedDocumentChunks(res);
    } catch (err: unknown) {
      showToast("Operation Notice", (err as Error).message || "Failed to load document chunks", "error");
      setShowChunksModal(false);
    } finally {
      setIsLoadingChunks(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document and its chunk vectors?")) return;
    try {
      await api.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err: unknown) {
      showToast("Operation Notice", (err as Error).message || "Failed to delete document", "error");
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
      showToast("Operation Notice", (err as Error).message || "Failed to load thread", "error");
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
      showToast("Operation Notice", (err as Error).message || "Failed to delete thread", "error");
    }
  };

  const handleSendChat = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = (customQuery || inputQuery).trim();
    if (!query || isQuerying) return;
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
          onDlpShield: (dlp) => {
            if (dlp.is_masked) {
              setActiveDlpEvent({
                isMasked: true,
                categories: dlp.categories,
                count: dlp.entity_count,
                summary: dlp.summary,
              });
            }
          },
          onEvaluation: (evalData: RAGEvalData) => {
            setChatMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.sender === "assistant") {
                copy[copy.length - 1] = {
                  ...last,
                  evaluation: evalData,
                };
              }
              return copy;
            });
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
      }, currentSessionId || undefined, selectedDocIds.length > 0 ? selectedDocIds : undefined);
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
      showToast("Operation Notice", (err as Error).message || "Failed to create API key", "error");
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
      showToast("Operation Notice", (err as Error).message || "Failed to revoke API key", "error");
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
      {/* Top Floating Glass Island (Navbar) - Fully Mobile Responsive */}
      <header className="h-16 border-b border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#090d18]/75 backdrop-blur-2xl px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors duration-300">
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Brand Mark with Bytherix EAM Neural Quantum Logo */}
          <BytherixEAMLogo size="sm" showText={true} />

          <div className="h-4 w-px bg-slate-300 dark:bg-white/10 mx-0.5 sm:mx-1.5 hidden md:block" />

          {/* Active Tenant Capsule */}
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-[11px] sm:text-xs text-slate-700 dark:text-slate-300" title={`Tenant: ${organizationId || 'Workspace'}`}>
            <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="font-mono font-semibold text-slate-900 dark:text-white truncate max-w-[55px] sm:max-w-[90px] md:max-w-none">
              {organizationId ? `${organizationId.slice(0, 6)}...` : "Tenant"}
            </span>
          </div>

          {/* Role Badge - Compact & Clean */}
          <div className="hidden min-[420px]:flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping shrink-0" />
            <span className="truncate max-w-[65px] sm:max-w-none">
              {role ? role.replace("organization_", "") : "owner"}
            </span>
          </div>

          {/* AI Token Quota & Compute Velocity Meter with Warning & Exceeded Alerts (Tablet & Desktop) (Section 6.3) */}
          {usage && (
            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(true)}
              className={`hidden sm:flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-mono shrink-0 transition-all cursor-pointer ${
                usage.is_quota_exceeded
                  ? "bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-300 shadow-sm animate-pulse"
                  : (usage.is_quota_warning || (usage.percentage_used ?? 0) >= 80)
                  ? "bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 shadow-sm"
                  : "bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:border-blue-500/30"
              }`}
              title={`Monthly AI token budget: ${usage.tokens_used.toLocaleString()} / ${usage.token_allowance.toLocaleString()} tokens (${usage.percentage_used ?? 0}% used). Click to upgrade.`}
            >
              {usage.is_quota_exceeded ? (
                <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0 animate-bounce" />
              ) : (usage.is_quota_warning || (usage.percentage_used ?? 0) >= 80) ? (
                <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
              ) : (
                <Zap className="w-3 h-3 text-amber-500 shrink-0 animate-pulse" />
              )}
              <span className="text-slate-500 dark:text-slate-400 hidden lg:inline">Quota:</span>
              <span className={`font-bold ${usage.is_quota_exceeded ? "text-rose-700 dark:text-rose-300" : (usage.is_quota_warning || (usage.percentage_used ?? 0) >= 80) ? "text-amber-800 dark:text-amber-200" : "text-slate-800 dark:text-slate-200"}`}>
                {(usage.tokens_used).toLocaleString()} / {(usage.token_allowance).toLocaleString()}
              </span>
              {usage.is_quota_exceeded && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-600 text-white uppercase tracking-wider">
                  Exceeded
                </span>
              )}
              {!usage.is_quota_exceeded && (usage.is_quota_warning || (usage.percentage_used ?? 0) >= 80) && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white uppercase tracking-wider">
                  80%+
                </span>
              )}
              <div className="w-10 sm:w-14 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden shrink-0">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    usage.is_quota_exceeded
                      ? "bg-rose-500"
                      : (usage.is_quota_warning || (usage.percentage_used ?? 0) >= 80)
                      ? "bg-amber-500"
                      : "bg-gradient-to-r from-blue-500 to-indigo-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(8, (usage.tokens_used / (usage.token_allowance || 1)) * 100))}%` }}
                />
              </div>
            </button>
          )}
        </div>

        {/* Right Nav Actions - Profile Visible Everywhere */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Global Command Palette Trigger (Ctrl+K / ⌘K) */}
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-200/80 dark:border-white/[0.08] transition-colors cursor-pointer"
            title="Search or execute command (Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-[11px] font-sans">Search</span>
            <kbd className="text-[9px] bg-white dark:bg-white/10 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10 font-bold">
              ⌘K
            </kbd>
          </button>

          {/* User Identity Capsule with Email (Always visible on mobile & desktop) */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shrink-0">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-[9px] sm:text-[10px] shrink-0 shadow-sm">
              {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : user?.email ? user.email.slice(0, 2).toUpperCase() : "U"}
            </div>
            <div className="text-left leading-tight hidden xs:block min-[360px]:block">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-900 dark:text-white truncate max-w-[70px] sm:max-w-[110px] md:max-w-[150px]" title={user?.full_name || "User"}>
                {user?.full_name || "Rustam"}
              </p>
              <p className="text-[8px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[70px] sm:max-w-[110px] md:max-w-[150px]" title={user?.email || ""}>
                {user?.email || "rustam@bytherix.com"}
              </p>
            </div>
          </div>

          {/* Cosmic Night Sky Theme Toggle */}
          <div className="shrink-0 scale-90 sm:scale-100">
            <CosmicThemeToggle />
          </div>

          {/* Logout */}
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            title="Sign out"
            className="p-1.5 sm:p-2 rounded-full bg-slate-100 dark:bg-white/[0.05] hover:bg-red-500/10 border border-slate-200 dark:border-white/10 hover:border-red-500/30 text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Mobile-Exclusive AI Token Quota Ticker Bar with Warning Alerting (< sm screens) (Section 6.3) */}
      {usage && (
        <div
          onClick={() => setIsUpgradeModalOpen(true)}
          className={`sm:hidden w-full px-3.5 py-1.5 border-b backdrop-blur-xl flex items-center justify-between text-[11px] font-mono sticky top-16 z-30 shadow-xs cursor-pointer ${
            usage.is_quota_exceeded
              ? "bg-rose-500/15 border-rose-500/30 text-rose-800 dark:text-rose-200"
              : (usage.is_quota_warning || (usage.percentage_used ?? 0) >= 80)
              ? "bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-200"
              : "bg-slate-100/95 dark:bg-[#0c1220]/95 border-slate-200 dark:border-white/[0.08]"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {usage.is_quota_exceeded ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 animate-bounce" />
            ) : (usage.is_quota_warning || (usage.percentage_used ?? 0) >= 80) ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
            )}
            <span className="font-sans font-bold text-[10px] uppercase tracking-wider">Quota:</span>
            <span className="font-bold truncate">
              {(usage.tokens_used).toLocaleString()} / {(usage.token_allowance).toLocaleString()}
            </span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full border ${
              usage.is_quota_exceeded
                ? "bg-rose-500 text-white border-rose-600"
                : (usage.is_quota_warning || (usage.percentage_used ?? 0) >= 80)
                ? "bg-amber-500 text-white border-amber-600"
                : "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20"
            }`}>
              {usage.is_quota_exceeded ? "EXCEEDED" : `${usage.percentage_used ?? Math.round((usage.tokens_used / (usage.token_allowance || 1)) * 100)}%`}
            </span>
          </div>
          <div className="w-16 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden shrink-0 ml-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usage.is_quota_exceeded
                  ? "bg-rose-500"
                  : (usage.is_quota_warning || (usage.percentage_used ?? 0) >= 80)
                  ? "bg-amber-500"
                  : "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(8, (usage.tokens_used / (usage.token_allowance || 1)) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Workspace Stage */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-48 sm:pb-56 space-y-6 sm:space-y-8">

        {/* Real-Time Live Notification Toast Banner */}
        {liveAlert && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-4 duration-300 ${
            liveAlert.type === "approval_required" || liveAlert.type === "warning"
              ? "bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-200"
              : liveAlert.type === "document_failed" || liveAlert.type === "error"
              ? "bg-red-500/15 border-red-500/40 text-red-900 dark:text-red-200"
              : "bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-200"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                liveAlert.type === "approval_required" || liveAlert.type === "warning"
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                  : liveAlert.type === "document_failed" || liveAlert.type === "error"
                  ? "bg-red-500/20 text-red-600 dark:text-red-400"
                  : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              }`}>
                {liveAlert.type === "approval_required" || liveAlert.type === "warning" ? (
                  <AlertTriangle className="w-4 h-4 animate-bounce" />
                ) : liveAlert.type === "document_failed" || liveAlert.type === "error" ? (
                  <X className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">{liveAlert.title}</h4>
                <p className="text-xs opacity-90">{liveAlert.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {liveAlert.type === "approval_required" && (
                <button
                  onClick={() => {
                    setActiveTab("agents");
                    setLiveAlert(null);
                  }}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-colors"
                >
                  Review Now
                </button>
              )}
              <button
                onClick={() => setLiveAlert(null)}
                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Real-Time Token Quota Warning & Exceeded Banner (Section 6.3) */}
        {usage && (usage.is_quota_exceeded || usage.is_quota_warning || (usage.percentage_used ?? 0) >= 80) && (
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg backdrop-blur-xl ${
            usage.is_quota_exceeded
              ? "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200"
              : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
          }`}>
            <div className="flex items-start sm:items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                usage.is_quota_exceeded ? "bg-rose-500/20 text-rose-600 dark:text-rose-400" : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
              }`}>
                <AlertTriangle className={`w-4 h-4 ${usage.is_quota_exceeded ? "animate-bounce" : ""}`} />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  {usage.is_quota_exceeded ? "Token Quota Exceeded (Inference Blocked)" : "Token Quota Alert (80%+ Consumed)"}
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                    usage.is_quota_exceeded ? "bg-rose-600 text-white" : "bg-amber-600 text-white"
                  }`}>
                    {usage.percentage_used}%
                  </span>
                </h4>
                <p className="text-xs opacity-90 mt-0.5">
                  {usage.is_quota_exceeded
                    ? `You have reached ${usage.tokens_used.toLocaleString()} / ${usage.token_allowance.toLocaleString()} monthly tokens. AI chat and RAG execution are temporarily blocked.`
                    : `You have consumed ${usage.tokens_used.toLocaleString()} of your ${usage.token_allowance.toLocaleString()} tokens (${usage.percentage_used}%). Upgrade before reaching 100% to avoid downtime.`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(true)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 shadow-sm ${
                usage.is_quota_exceeded
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20"
                  : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20"
              }`}
            >
              Upgrade Subscription
            </button>
          </div>
        )}

                {/* TAB 1: DOCUMENTS HUB (Enterprise Precision Anti-Slop Redesign) */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 dark:bg-indigo-500/15 border border-blue-500/20 dark:border-indigo-500/30 text-[11px] font-mono font-bold text-blue-600 dark:text-indigo-400 mb-1">
                <Database className="w-3 h-3" />
                <span>KNOWLEDGE INGESTION ENGINE</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Enterprise Knowledge Library
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                Grounded PDF ingestion with 1536-dimensional pgvector embeddings and cryptographic SHA-256 deduplication.
              </p>
            </div>

            {/* Precision Ingestion Dropzone */}
            {canUploadDocs ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative group rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden p-6 sm:p-9 text-center ${
                  isDragging
                    ? "border-blue-500 dark:border-indigo-400 bg-blue-50/80 dark:bg-indigo-950/25 scale-[0.99]"
                    : "border-slate-300/80 dark:border-white/15 hover:border-slate-400 dark:hover:border-white/30 bg-white/90 dark:bg-[#0c1222]/80 backdrop-blur-md hover:bg-white dark:hover:bg-[#0c1222]"
                }`}
                style={{
                  boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.06)",
                }}
              >
                {/* Subtle top spotlight glow on hover */}
                <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-36 bg-gradient-to-b from-blue-500/10 dark:from-indigo-500/15 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <input
                  type="file"
                  accept="application/pdf"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-105 ${
                      isDragging
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110"
                        : isUploading
                        ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 animate-pulse"
                        : "bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {isUploading ? (
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-600 dark:text-indigo-400" />
                    ) : (
                      <UploadCloud className="w-5 h-5" />
                    )}
                  </div>

                  {isDragging ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        Release to start ingestion
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Header will be validated and queued for chunk vectorization
                      </p>
                    </div>
                  ) : isUploading ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-blue-600 dark:text-indigo-400">
                        Ingesting and validating %PDF- header...
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Generating 1536-dimensional vector embeddings via pgvector
                      </p>
                    </div>
                  ) : documents.length >= 5 ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                        Plan Quota Reached (5/5 Documents)
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Free tier limit reached. Remove an existing document below to ingest a new one.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Drop enterprise PDF here, or <span className="text-blue-600 dark:text-indigo-400 underline decoration-indigo-400/40 underline-offset-4">browse files</span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Strict <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">%PDF-</span> magic-byte validation with SHA-256 deduplication
                      </p>
                    </div>
                  )}

                  {/* Micro specification chips */}
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4 pt-4 border-t border-slate-200/60 dark:border-white/[0.06] text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06]">
                      PDF format
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06]">
                      Max 10 MB
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06]">
                      1536-dim pgvector
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06]">
                      SHA-256 Verified
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card-depth-3d p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-indigo-500/10 border border-blue-500/20 dark:border-indigo-500/20 flex items-center justify-center text-blue-600 dark:text-indigo-400 shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Read-Only Knowledge Vault
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Your role ({role?.replace(/_/g, " ") || "viewer"}) is granted read-only inspection access to verified tenant assets.
                    </p>
                  </div>
                </div>
                <span className="self-start sm:self-center text-[10px] font-mono px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold uppercase tracking-wider">
                  Auditor Mode
                </span>
              </div>
            )}

            {uploadError && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Document Library Ledger */}
            <div className="card-depth-3d p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-indigo-500/10 border border-blue-500/20 dark:border-indigo-500/20 flex items-center justify-center text-blue-600 dark:text-indigo-400">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Ingested Knowledge Assets
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.06]">
                      {documents.length} / 5
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canUploadDocs && (
                    <button
                      type="button"
                      disabled={isSeedingDemo}
                      onClick={handleSeedDemoKnowledge}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold text-xs border border-indigo-500/20 transition-all cursor-pointer active:scale-95"
                      title="Seed authoritative Bytherix EAM architecture PDF"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isSeedingDemo ? "animate-spin" : ""}`} />
                      <span>{isSeedingDemo ? "Seeding Spec..." : "⚡ Seed Demo Spec"}</span>
                    </button>
                  )}
                  <button
                    onClick={loadDocuments}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                    title="Refresh document library"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {documents.length === 0 ? (
                <div className="p-8 sm:p-12 text-center text-slate-500 space-y-4 rounded-xl border border-dashed border-slate-200 dark:border-white/[0.06] bg-slate-50/30 dark:bg-white/[0.01]">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">No documents in your tenant library</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      Drop an enterprise PDF above, or instantly seed the authoritative Bytherix technical specification.
                    </p>
                  </div>
                  {canUploadDocs && (
                    <button
                      type="button"
                      disabled={isSeedingDemo}
                      onClick={handleSeedDemoKnowledge}
                      className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer w-full sm:w-auto"
                    >
                      <Sparkles className={`w-4 h-4 ${isSeedingDemo ? "animate-spin" : ""}`} />
                      <span>{isSeedingDemo ? "Seeding & Indexing 5 Chunks..." : "⚡ 1-Click Load Enterprise Demo Knowledge"}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="group p-3.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] hover:bg-slate-100/80 dark:hover:bg-white/[0.045] border border-slate-200/80 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-200"
                      style={{
                        boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.04)",
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 dark:bg-indigo-500/10 border border-blue-500/20 dark:border-indigo-500/20 flex items-center justify-center text-blue-600 dark:text-indigo-400 shrink-0">
                          <FileCheck2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {doc.title || doc.filename}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300">
                              {(doc.file_size_bytes / 1024).toFixed(1)} KB
                            </span>
                            <span>•</span>
                            <span>{doc.page_count ? `${doc.page_count} pages` : "Queued"}</span>
                            {doc.checksum && (
                              <>
                                <span>•</span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                  <Hash className="w-3 h-3 text-slate-400" />
                                  <span>{doc.checksum.slice(0, 10)}...</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-white/[0.06]">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                            doc.status === "indexed"
                              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                              : doc.status === "processing"
                              ? "bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 animate-pulse"
                              : "bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              doc.status === "indexed"
                                ? "bg-emerald-500"
                                : doc.status === "processing"
                                ? "bg-amber-500 animate-ping"
                                : "bg-blue-500"
                            }`}
                          />
                          <span>{doc.status === "indexed" ? "Ready" : doc.status}</span>
                        </span>

                        {/* Action buttons group with subtle hairline border */}
                        <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-white/[0.04] p-1 rounded-lg border border-slate-200/60 dark:border-white/[0.06]">
                          {/* Inspect Chunks & Vectors */}
                          <button
                            onClick={() => handleInspectChunks(doc.id)}
                            title="Inspect Extracted Chunks & Vector Metadata"
                            className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-white dark:hover:bg-white/[0.08] transition-colors"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>

                          {/* Pre-signed S3 / MinIO / Local Download */}
                          <button
                            onClick={() => handleDownloadDocument(doc.id)}
                            disabled={downloadingDocId === doc.id}
                            title="Download / View Authentic PDF"
                            className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-white dark:hover:bg-white/[0.08] transition-colors disabled:opacity-50"
                          >
                            {downloadingDocId === doc.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {isOwnerOrAdmin && (
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              title="Delete document"
                              className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-white/[0.08] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RAG CHUNKS & VECTOR INSPECTION MODAL */}
            {showChunksModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
                <div
                  className="w-full max-w-3xl max-h-[85vh] rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/[0.1] shadow-2xl flex flex-col overflow-hidden"
                  style={{
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
                  }}
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-white/[0.08]">
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                          {selectedDocumentChunks?.document_title || "Document Chunks"}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          {selectedDocumentChunks?.total_chunks ?? 0} Chunks
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono truncate">
                        {selectedDocumentChunks?.filename} &bull; 1536-dimensional pgvector embeddings
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowChunksModal(false);
                        setSelectedDocumentChunks(null);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search text within chunks..."
                        value={chunkSearchQuery}
                        onChange={(e) => setChunkSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#080d1a] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>
                  </div>

                  {/* Chunks List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoadingChunks ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                        <span className="text-xs font-mono">Loading chunk vectors...</span>
                      </div>
                    ) : selectedDocumentChunks?.chunks && selectedDocumentChunks.chunks.length > 0 ? (
                      selectedDocumentChunks.chunks
                        .filter(
                          (c) =>
                            !chunkSearchQuery ||
                            c.content.toLowerCase().includes(chunkSearchQuery.toLowerCase())
                        )
                        .map((chunk) => {
                          const isCopied = copiedChunkId === chunk.id;
                          return (
                            <div
                              key={chunk.id}
                              className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-[#0f172a]/60 space-y-2 hover:border-indigo-500/30 transition-all"
                              style={{
                                boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.04)",
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                                    Chunk #{chunk.chunk_index + 1}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.05]">
                                    Page {chunk.page_number}
                                  </span>
                                  <span className="text-[11px] font-mono text-slate-400">
                                    ~{chunk.token_count} tokens
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                    1536-dim Vector Indexed
                                  </span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(chunk.content);
                                      setCopiedChunkId(chunk.id);
                                      setTimeout(() => setCopiedChunkId(null), 1500);
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    title="Copy chunk text"
                                  >
                                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap bg-slate-50 dark:bg-black/20 p-2.5 rounded-lg border border-slate-100 dark:border-white/[0.04]">
                                {chunk.content}
                              </p>
                            </div>
                          );
                        })
                    ) : (
                      <div className="py-12 text-center text-xs text-slate-400 font-mono">
                        No chunks found for this document.
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-3 border-t border-slate-100 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] flex justify-end">
                    <button
                      onClick={() => {
                        setShowChunksModal(false);
                        setSelectedDocumentChunks(null);
                      }}
                      className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-white/[0.08] text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-white/[0.12] transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RAG AI CHATROOM (Precision Perplexity-Tier Redesign) */}
        {activeTab === "chat" && (
          <div
            className="card-depth-3d relative flex flex-col md:flex-row h-[580px] sm:h-[640px] lg:h-[680px] mb-8 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/[0.08]"
            style={{
              boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
            }}
          >
            {/* 1. Desktop Left Sidebar: Past Conversations */}
            <div className="hidden md:flex flex-col w-64 border-r border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#070b14] shrink-0">
              <div className="p-3.5 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-2">
                <FlowButton
                  onClick={handleNewThread}
                  icon="plus"
                  className="flex-1 shadow-sm"
                  title="Start fresh thread"
                >
                  New Thread
                </FlowButton>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <div className="px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                  <span>Conversation History</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400">
                    {chatSessions.length}
                  </span>
                </div>

                {isSessionsLoading ? (
                  <div className="p-4 text-center text-xs text-slate-400 font-mono">Loading threads...</div>
                ) : chatSessions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic">No saved threads yet</div>
                ) : (
                  chatSessions.map((session) => {
                    const isSelected = session.id === currentSessionId;
                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSelectSession(session.id)}
                        className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs select-none transition-all duration-150 border-l-2 outline-none ${
                          isSelected
                            ? "bg-indigo-50/80 dark:bg-white/[0.06] text-indigo-700 dark:text-indigo-300 font-semibold border-l-indigo-600 dark:border-l-indigo-400 border-y-transparent border-r-transparent shadow-xs"
                            : "border-l-transparent border-y-transparent border-r-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="truncate pr-3 flex-1">
                          <p className="truncate font-medium">{session.title}</p>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                            {session.message_count} messages
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSession(e, session.id)}
                          title="Delete thread"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all cursor-pointer"
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
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setIsMobileDrawerOpen(false)}
                />
                <div className="relative w-72 max-w-[80%] h-full bg-white dark:bg-[#070b14] border-r border-slate-200 dark:border-white/10 flex flex-col shadow-2xl z-40">
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
                    <FlowButton
                      onClick={() => {
                        handleNewThread();
                        setIsMobileDrawerOpen(false);
                      }}
                      icon="plus"
                      className="w-full shadow-sm"
                      title="Start fresh thread"
                    >
                      New Thread
                    </FlowButton>
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
                            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs select-none transition-colors duration-150 border outline-none ${
                              isSelected
                                ? "bg-indigo-50 dark:bg-white/[0.08] text-indigo-700 dark:text-indigo-300 font-semibold border-indigo-200 dark:border-indigo-500/30"
                                : "border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                            }`}
                          >
                            <div className="truncate pr-2 flex-1">
                              <p className="truncate font-medium">{session.title}</p>
                              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
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
            <div className="flex-1 flex flex-col min-w-0 h-full bg-white/60 dark:bg-[#090d18]/60">
              {/* Chat Header Bar - Mobile First & Anti-Clash Layout */}
              <div className="p-2.5 sm:p-3.5 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-2 bg-slate-50/80 dark:bg-[#090d18]/80 backdrop-blur-md shrink-0 relative z-30">
                {/* Left: Thread Title & Mobile Drawer Toggle - Guaranteed Never Crushed */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Mobile Thread Drawer Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsMobileDrawerOpen(true)}
                    className="md:hidden flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-200/70 dark:bg-white/[0.06] text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors shrink-0"
                    title="Open conversations drawer"
                  >
                    <HistoryIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="font-mono text-[10px]">{chatSessions.length}</span>
                  </button>

                  <div className="hidden sm:flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 truncate">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white truncate">
                      Grounded Knowledge QA
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {currentSessionId
                        ? chatSessions.find((s) => s.id === currentSessionId)?.title || "Active Thread"
                        : "New Thread"}
                    </p>
                  </div>
                </div>

                {/* Right: Action Pills - Fully Responsive & Non-Overlapping */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Document Scope Filter Dropdown (Section 8.2) */}
                  <DocumentScopeSelector
                    documents={documents}
                    selectedDocIds={selectedDocIds}
                    onToggleDoc={handleToggleDocScope}
                    onSelectAll={handleSelectAllDocScope}
                    onClearAll={handleClearDocScope}
                  />

                  {/* Real-time DLP Shield Status Pill */}
                  <button
                    type="button"
                    onClick={() => setIsDlpModalOpen(true)}
                    className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-mono font-semibold border transition-all duration-200 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-500/30 shadow-xs active:scale-95 cursor-pointer shrink-0"
                    title="Bytherix DLP Shield: Active zero-leak enforcement. Click to inspect."
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">DLP Shield</span>
                    <span className="hidden md:inline font-normal text-emerald-600 dark:text-emerald-400/80">&bull; Enforcing</span>
                  </button>

                  {/* Model spec pill (Visible only on Large screens >= 1200px) */}
                  <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] shrink-0">
                    <Bot className="w-3 h-3 text-indigo-500" />
                    <span>GPT-4o-mini &bull; 1536-dim</span>
                  </span>

                  {/* Hybrid Retrieval Badge (Visible only on Extra Large screens) */}
                  <span className="hidden 2xl:inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-mono font-medium border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.04] shrink-0">
                    Hybrid Retrieval
                  </span>

                  {/* Quick New Thread on mobile */}
                  <button
                    onClick={handleNewThread}
                    title="Start fresh thread"
                    className="md:hidden p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Message Scrollable Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-500">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Ask your knowledge library</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm">
                      Answers are strictly grounded in your ingested documents with verbatim source citations.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg pt-3 text-left">
                      <button
                        type="button"
                        onClick={() => handleSendChat(undefined, "What are the core technical requirements for Bytherix EAM?")}
                        className="p-3.5 rounded-xl bg-white/80 dark:bg-white/[0.03] hover:bg-indigo-50/80 dark:hover:bg-indigo-950/30 border border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-500/40 text-left transition-all group cursor-pointer"
                        style={{
                          boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-between">
                          <span>Technical Architecture</span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          &quot;What are the core technical requirements for Bytherix EAM?&quot;
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendChat(undefined, "What are the subscription plans and quotas?")}
                        className="p-3.5 rounded-xl bg-white/80 dark:bg-white/[0.03] hover:bg-indigo-50/80 dark:hover:bg-indigo-950/30 border border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-500/40 text-left transition-all group cursor-pointer"
                        style={{
                          boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-between">
                          <span>Plans & Quotas</span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          &quot;What are the subscription plans and quotas?&quot;
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendChat(undefined, "How does the MLOps model promotion and rollback workflow operate?")}
                        className="p-3.5 rounded-xl bg-white/80 dark:bg-white/[0.03] hover:bg-indigo-50/80 dark:hover:bg-indigo-950/30 border border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-500/40 text-left transition-all group cursor-pointer"
                        style={{
                          boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-between">
                          <span>MLOps Governance</span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          &quot;How does MLOps model promotion & rollback work?&quot;
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendChat(undefined, "Explain the human-in-the-loop agent authorization gate.")}
                        className="p-3.5 rounded-xl bg-white/80 dark:bg-white/[0.03] hover:bg-indigo-50/80 dark:hover:bg-indigo-950/30 border border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-500/40 text-left transition-all group cursor-pointer"
                        style={{
                          boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-between">
                          <span>Governed Agents</span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          &quot;Explain human-in-the-loop agent authorization.&quot;
                        </p>
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
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20 border border-white/20 rounded-tr-sm"
                            : "bg-white dark:bg-[#0d1322] backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] text-slate-900 dark:text-slate-200 rounded-tl-sm"
                        }`}
                        style={
                          msg.sender !== "user"
                            ? { boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)" }
                            : undefined
                        }
                      >
                        {msg.sender === "user" ? (
                          <p className="whitespace-pre-wrap font-medium">{msg.text}</p>
                        ) : msg.text ? (
                          <div className="space-y-1.5 text-slate-800 dark:text-slate-200">
                            <MarkdownAnswer
                              content={msg.text}
                              isStreaming={msg.isStreaming}
                              onCitationClick={(tag) => {
                                const match = msg.sources?.find(
                                  (s) =>
                                    tag.toLowerCase().includes(s.document_title.toLowerCase()) ||
                                    tag.includes(String(s.page_number))
                                );
                                if (match) setSelectedCitation(match);
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 font-mono">
                            <div className="w-3.5 h-3.5 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
                            <span className="font-medium animate-pulse">Consulting 1536-dim vector index & streaming grounded answer...</span>
                          </div>
                        )}

                        {/* RAG Triad & Hallucination Scoreboard */}
                        {msg.evaluation && (
                          <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-white/[0.08]">
                            <RAGScoreboardBadge evaluation={msg.evaluation} />
                          </div>
                        )}

                        {/* Perplexity-style Citations section */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/[0.08] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                <FileText className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                Grounded Sources ({msg.sources.length})
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
                                  onClick={() => setSelectedCitation(src)}
                                  className="p-2.5 rounded-xl text-[11px] text-slate-800 dark:text-slate-300 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] hover:border-indigo-500/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all cursor-pointer group"
                                  title="Click to inspect citation in slide-over drawer"
                                >
                                  <div className="flex items-center justify-between font-medium text-slate-600 dark:text-slate-400 mb-1">
                                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[220px]">
                                      {src.document_title || "Document"}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-[10px] font-semibold border border-indigo-500/20">
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

                        {/* Assistant Message Quick Action Bar (Copy & Metadata) */}
                        {msg.sender === "assistant" && msg.text && !msg.isStreaming && (
                          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.05] flex items-center justify-between text-[10.5px] font-mono text-slate-400 dark:text-slate-500 select-none">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(msg.text);
                                setCopiedMessageIdx(idx);
                                setTimeout(() => setCopiedMessageIdx(null), 2000);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                              title="Copy response text"
                            >
                              {copiedMessageIdx === idx ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span className="text-emerald-500 font-bold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1">
                                <Cpu className="w-3 h-3 text-indigo-500" />
                                <span>{msg.model || "gpt-4o-mini"}</span>
                              </span>
                              <span>&bull;</span>
                              <span>~{Math.max(1, Math.round(msg.text.length / 4))} tokens</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* 4. Anchored Input Console */}
              <form
                onSubmit={handleSendChat}
                className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/90 dark:bg-[#070b14]/90 backdrop-blur-md shrink-0"
              >
                {/* Active Document Scope Filter Pill */}
                {selectedDocIds.length > 0 && (
                  <div className="mb-2.5 px-3 py-1.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-500/30 text-xs flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-2 min-w-0">
                      <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="truncate text-slate-700 dark:text-slate-300">
                        Targeted RAG Scope: <strong className="font-semibold text-indigo-700 dark:text-indigo-300">{selectedDocIds.length}</strong> of {documents.filter(d => d.status.toLowerCase() === 'ready').length} document(s) active
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearDocScope}
                      className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      <span>Reset to All</span>
                    </button>
                  </div>
                )}

                {/* Real-time DLP Redaction Alert Banner */}
                {activeDlpEvent && activeDlpEvent.isMasked && (
                  <div className="mb-2.5 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-200 text-xs flex items-center justify-between animate-in fade-in shadow-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="truncate font-medium">{activeDlpEvent.summary}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => setIsDlpModalOpen(true)}
                        className="text-[11px] font-mono font-bold text-amber-800 dark:text-amber-300 underline hover:text-slate-900 dark:hover:text-white"
                      >
                        Inspect Shield
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDlpEvent(null)}
                        className="p-1 rounded text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={inputQuery}
                      onChange={(e) => setInputQuery(e.target.value)}
                      placeholder="Ask a question about your uploaded documents..."
                      className="w-full pl-4 pr-10 py-2.5 sm:py-3 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-inner"
                    />
                    {inputQuery && (
                      <button
                        type="button"
                        onClick={() => setInputQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                        title="Clear input"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isQuerying || !inputQuery.trim()}
                    className="shrink-0 flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-500/20 transition-all active:scale-95 cursor-pointer"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2 px-1 text-[10px] font-mono text-slate-400 dark:text-slate-500 select-none">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.2 rounded bg-slate-200/80 dark:bg-white/10 font-bold text-slate-600 dark:text-slate-300">↵</kbd> send
                    <span className="mx-1">&bull;</span>
                    <kbd className="px-1 py-0.2 rounded bg-slate-200/80 dark:bg-white/10 font-bold text-slate-600 dark:text-slate-300">Shift+↵</kbd> newline
                  </span>
                  <span className="hidden sm:inline text-indigo-600 dark:text-indigo-400 font-semibold">
                    Strictly grounded in enterprise documents
                  </span>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "agents" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 dark:border-indigo-500/30 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                <Bot className="w-3.5 h-3.5" />
                <span>GOVERNED AGENT ORCHESTRATION</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Governed Agent Workflows
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                Allowlisted tools, bounded step budgets, and deterministic human-in-the-loop authorization gates.
              </p>
            </div>

            {/* Workflow Catalog Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    className={`card-depth-3d relative p-5 rounded-2xl cursor-pointer outline-none focus:outline-none select-none transition-all duration-200 group border flex flex-col justify-between ${
                      isSelected
                        ? "!border-indigo-500/80 ring-2 ring-indigo-500/30 !bg-indigo-50/80 dark:!bg-indigo-950/30 shadow-lg shadow-indigo-500/10"
                        : "border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20 bg-white/70 dark:bg-white/[0.015]"
                    }`}
                    style={{
                      boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                            isSelected ? "text-indigo-700 dark:text-indigo-300" : "text-indigo-600 dark:text-indigo-400"
                          }`}>
                            {wf.category}
                          </span>
                          {wf.has_approval_gate && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Human Gate
                            </span>
                          )}
                        </div>

                        {/* Selected / Active Indicator */}
                        {isSelected ? (
                          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-600 text-white shadow-sm shadow-indigo-600/40 shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                            <span>Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shrink-0 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                            <span>Select</span>
                          </div>
                        )}
                      </div>

                      <h3 className={`text-sm mb-1.5 transition-colors ${
                        isSelected
                          ? "font-extrabold text-indigo-950 dark:text-white"
                          : "font-bold text-slate-900 dark:text-white"
                      }`}>
                        {wfName}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">{wf.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.06] flex flex-wrap gap-1.5">
                      {wf.allowed_tools.map((t, tIdx) => (
                        <span
                          key={tIdx}
                          className={`px-2 py-0.5 rounded-md text-[9px] font-mono border transition-colors ${
                            isSelected
                              ? "bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800/60"
                              : "bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-white/[0.06]"
                          }`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Launch Console Form */}
            <form
              onSubmit={handleLaunchAgent}
              className="card-depth-3d p-4 sm:p-5 rounded-2xl space-y-3 bg-white/80 dark:bg-[#070b14]/80 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08]"
              style={{
                boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.06)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Terminal className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Target Objective: {selectedWfName}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]">
                  Step Budget: 5 Max
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  required
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  placeholder="Enter objective for the agent (e.g., Audit knowledge base and verify token usage)..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                />
                <button
                  type="submit"
                  disabled={isAgentExecuting || !agentPrompt.trim()}
                  className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isAgentExecuting ? "Executing Workflow..." : "Launch Governed Agent"}</span>
                </button>
              </div>
            </form>

            {/* Dual-Pane Execution Trace & History Monitor */}
            <div
              className="card-depth-3d flex flex-col md:flex-row h-[600px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/[0.08]"
              style={{
                boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
              }}
            >
              {/* Left Column: Execution History */}
              <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#070b14] flex flex-col shrink-0">
                <div className="p-3.5 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Execution Audit Log ({executions.length})
                  </span>
                  <button onClick={loadAgentData} className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer" title="Refresh executions">
                    <RefreshCw className="w-3.5 h-3.5" />
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
                          className={`p-3 rounded-xl cursor-pointer text-xs select-none transition-all duration-150 border-l-2 outline-none ${
                            isSelected
                              ? "bg-indigo-50/80 dark:bg-white/[0.06] text-indigo-700 dark:text-indigo-300 font-semibold border-l-indigo-600 dark:border-l-indigo-400 border-y-transparent border-r-transparent shadow-xs"
                              : "border-l-transparent border-y-transparent border-r-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-white/[0.03]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold truncate text-[11px]">{e.workflow_name}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                                e.status === "completed"
                                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                  : e.status === "pending_approval"
                                  ? "bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 animate-pulse"
                                  : "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
                              }`}
                            >
                              <span className={`w-1 h-1 rounded-full ${
                                e.status === "completed" ? "bg-emerald-500" : e.status === "pending_approval" ? "bg-amber-500" : "bg-red-500"
                              }`} />
                              <span>{e.status}</span>
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
              <div className="flex-1 flex flex-col min-w-0 bg-white/70 dark:bg-[#090d18]/70 overflow-y-auto p-4 sm:p-6 space-y-4">
                {!selectedExecution ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
                    <Bot className="w-10 h-10 text-indigo-400/50" />
                    <p className="text-xs font-mono">Select or launch a workflow to view its governed execution trace.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Header bar of trace */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{selectedExecution.workflow_name}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                              selectedExecution.status === "completed"
                                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                : selectedExecution.status === "pending_approval"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 animate-pulse border border-amber-500/30"
                                : "bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400"
                            }`}
                          >
                            {selectedExecution.status}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">&ldquo;{selectedExecution.input_prompt}&rdquo;</p>
                      </div>
                      <span className="text-xs font-mono text-slate-400">{selectedExecution.total_steps} steps executed</span>
                    </div>

                    {/* Human-In-The-Loop Approval Gate Banner */}
                    {selectedExecution.status === "pending_approval" && (
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 shadow-lg shadow-amber-500/5">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <h5 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                              Human-In-The-Loop Authorization Gate
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
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve & Execute</span>
                          </button>
                          <button
                            type="button"
                            disabled={isApproving}
                            onClick={() => handleProcessApproval(false)}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-red-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step-by-Step Execution Trace Timeline */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Agent Reasoning & Tool Step Log
                      </span>
                      {selectedExecution.traces.map((trace) => (
                        <div
                          key={trace.id}
                          className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] space-y-2 text-xs"
                          style={{
                            boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.04)",
                          }}
                        >
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">Step {trace.step_number}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                                trace.status === "completed"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : trace.status === "pending_approval"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                  : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
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
                            <div className="p-2.5 rounded-lg bg-slate-100/80 dark:bg-black/40 border border-slate-200/60 dark:border-white/[0.04] font-mono text-[11px] space-y-1">
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
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Finalized Workflow Result
                        </span>
                        <div className="whitespace-pre-wrap leading-relaxed font-sans">{selectedExecution.final_output}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: MLOPS MODEL REGISTRY & DEPLOYMENTS (SECTION 9 & 14) */}
        {activeTab === "models" && (
          !canAccessModels ? (
            <div className="card-depth-3d p-8 text-center space-y-3 max-w-lg mx-auto my-12">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                MLOps Model Registry Restricted
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Access to the MLOps Model Registry and deployment lifecycle is restricted strictly to AI/ML Engineers, Developers, and Administrators per Section 3.1. Your current role is <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{role || "viewer"}</span>.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("documents")}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
              >
                Return to Documents
              </button>
            </div>
          ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>MLOps Model Registry & Deployments</span>
                  <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                  Versioned model catalog with deployment lifecycle states (draft → staging → production → archived) and latency/accuracy telemetry.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => loadModelsData()}
                  disabled={isModelLoading}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-black/30 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all disabled:opacity-50"
                  title="Refresh catalog"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isModelLoading ? "animate-spin text-indigo-500" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                {canRegisterModels && (
                  <button
                    onClick={() => setShowNewModelModal(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Register Model</span>
                  </button>
                )}
              </div>
            </div>

            {/* Register Model Modal */}
            {showNewModelModal && (
              <div className="card-depth-3d p-5 sm:p-6 border-indigo-500/30 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-xl rounded-2xl space-y-4 shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-500" />
                    <span>Register New Model Architecture</span>
                  </h3>
                  <button
                    onClick={() => {
                      setShowNewModelModal(false);
                      setIsTaskDropdownOpen(false);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateNewModel} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Model Name</label>
                      <input
                        type="text"
                        required
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        placeholder="e.g. customer-sentiment-llama3"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#080d1a] border border-slate-200 dark:border-white/15 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                      />
                    </div>

                    <div className="space-y-1 relative" ref={taskDropdownRef}>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Task Type</label>
                      <button
                        type="button"
                        onClick={() => setIsTaskDropdownOpen(!isTaskDropdownOpen)}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#080d1a] border border-slate-200 dark:border-white/15 text-xs font-semibold text-slate-900 dark:text-white hover:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-left"
                      >
                        <span>
                          {TASK_TYPE_OPTIONS.find((t) => t.value === newModelTask)?.label || "Select Task Type"}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isTaskDropdownOpen ? "rotate-180 text-indigo-500" : ""}`} />
                      </button>

                      {isTaskDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 p-1.5 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/15 shadow-2xl space-y-0.5">
                          {TASK_TYPE_OPTIONS.map((opt) => {
                            const isSelected = newModelTask === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setNewModelTask(opt.value);
                                  setIsTaskDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                                  isSelected
                                    ? "bg-indigo-600 text-white font-bold"
                                    : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-indigo-600 dark:hover:text-indigo-400"
                                }`}
                              >
                                <span>{opt.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Description</label>
                    <input
                      type="text"
                      value={newModelDesc}
                      onChange={(e) => setNewModelDesc(e.target.value)}
                      placeholder="e.g. Fine-tuned model on internal support dataset with 8k context window"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#080d1a] border border-slate-200 dark:border-white/15 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewModelModal(false);
                        setIsTaskDropdownOpen(false);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingModel || !newModelName.trim()}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 shadow-md shadow-indigo-600/30 active:scale-95 transition-all"
                    >
                      {isCreatingModel ? "Registering..." : "Confirm Registration"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Model Catalog Cards Grid or Empty State */}
            {models.length === 0 ? (
              <div className="card-depth-3d p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto my-8 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-500 shadow-inner">
                  <Cpu className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    No Models Registered Yet
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    This organization does not have any AI models registered in its MLOps catalog.
                  </p>
                </div>
                {canRegisterModels && (
                  <button
                    type="button"
                    onClick={() => setShowNewModelModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Register First Model</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {models.map((m) => {
                  const isSelected = selectedModelId === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleSelectModel(m.id)}
                      className={`card-depth-3d relative p-4 rounded-2xl cursor-pointer outline-none focus:outline-none select-none transition-colors duration-150 group border ${
                        isSelected
                          ? "!border-indigo-600 dark:!border-indigo-500 ring-2 ring-indigo-600/30 dark:ring-indigo-500/40 !bg-indigo-50/90 dark:!bg-indigo-950/40 shadow-lg shadow-indigo-500/15"
                          : "border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          {m.task_type}
                        </span>

                        {isSelected ? (
                          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-sm shadow-indigo-600/40 shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                            <span>Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shrink-0 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                            <span>Select</span>
                          </div>
                        )}
                      </div>

                      <h3 className={`text-sm mb-1 transition-colors ${isSelected ? "font-extrabold text-indigo-950 dark:text-white" : "font-bold text-slate-900 dark:text-white"}`}>
                        {m.name}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 line-clamp-2 leading-relaxed">
                        {m.description || "Enterprise deployed model."}
                      </p>

                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          {m.active_version_name ? `Prod: ${m.active_version_name}` : "No active release"}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                          {m.total_versions} {m.total_versions === 1 ? "version" : "versions"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dual-Pane Lifecycle History & Prediction Station */}
            {selectedModel && (
              <div className="card-depth-3d flex flex-col lg:flex-row rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10">
                {/* Left Column: Version History & State Machine */}
                <div className="w-full lg:w-1/2 p-5 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 space-y-4">
                  {/* Timeline Header */}
                  <div className="pb-3 border-b border-slate-200 dark:border-white/10 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                            Version Lifecycle Timeline
                          </h4>
                          
                        </div>
                        <p className="text-xs text-slate-500">
                          Model: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedModel.name}</span> • {selectedModel.versions.length} {selectedModel.versions.length === 1 ? "release" : "releases"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowNewVersionModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all shrink-0 whitespace-nowrap"
                        title="Add a new release candidate version to this model"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Version</span>
                      </button>
                    </div>
                  </div>

                  {/* Create Version Modal */}
                  {showNewVersionModal && (
                    <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-xl shadow-xl space-y-2.5">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-white/10">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Release Candidate for {selectedModel.name}</span>
                        </h5>
                        <button onClick={() => setShowNewVersionModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <form onSubmit={handleCreateNewVersion} className="space-y-2.5 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Version Tag</label>
                            <input
                              type="text"
                              required
                              value={newVersionTag}
                              onChange={(e) => setNewVersionTag(e.target.value)}
                              placeholder="e.g. v1.2.0"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#080d1a] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Benchmark Acc (%)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={newVersionAccuracy}
                              onChange={(e) => setNewVersionAccuracy(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#080d1a] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Latency p95 (ms)</label>
                            <input
                              type="number"
                              value={newVersionLatency}
                              onChange={(e) => setNewVersionLatency(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#080d1a] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowNewVersionModal(false)}
                            className="px-3 py-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isCreatingVersion || !newVersionTag.trim()}
                            className="px-3.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-40"
                          >
                            {isCreatingVersion ? "Creating..." : "Save Candidate"}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {selectedModel.versions.map((ver, index) => {
                      const isProd = ver.lifecycle_stage === "production" || ver.id === selectedModel.active_version_id;
                      const isStaging = ver.lifecycle_stage === "staging";
                      const activeIndex = selectedModel.versions.findIndex(
                        (v) => v.id === selectedModel.active_version_id || v.lifecycle_stage === "production"
                      );
                      const isOlderThanActive = activeIndex !== -1 && index > activeIndex;

                      return (
                        <div
                          key={ver.id}
                          className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-all ${
                            isProd
                              ? "bg-emerald-500/10 border-emerald-500/30"
                              : isStaging
                              ? "bg-amber-500/10 border-amber-500/30"
                              : "bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/10"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                                {ver.version}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  isProd
                                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                                    : isStaging
                                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                                    : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                {ver.lifecycle_stage}
                              </span>
                            </div>

                            {/* Action Button - EXACTLY ONE context-aware button per card */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isProd ? (
                                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>Active Prod</span>
                                </span>
                              ) : canManageModels ? (
                                isStaging ? (
                                  isOlderThanActive ? (
                                    <button
                                      type="button"
                                      disabled={isPromoting}
                                      onClick={() => handleRollbackVersion(ver.id)}
                                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-500/30 transition-all active:scale-95"
                                      title="Revert active production deployment to this prior stable version"
                                    >
                                      Rollback to This
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={isPromoting}
                                      onClick={() => handlePromoteVersion(ver.id, "production")}
                                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm active:scale-95 transition-all"
                                      title="Promote this validated candidate release to active production"
                                    >
                                      Promote to Prod
                                    </button>
                                  )
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isPromoting}
                                    onClick={() => handlePromoteVersion(ver.id, "staging")}
                                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
                                    title="Stage this draft candidate for pre-production evaluation"
                                  >
                                    Stage Candidate
                                  </button>
                                )
                              ) : (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.04] text-slate-500 border border-slate-200 dark:border-white/[0.06] capitalize">
                                  {ver.lifecycle_stage}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Telemetry Metrics */}
                          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-100 dark:bg-black/30 p-2 rounded-lg">
                            <div>
                              <span className="text-slate-500">Benchmark Acc: </span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {ver.accuracy_score ? `${(ver.accuracy_score * 100).toFixed(1)}%` : "N/A"}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">p95 Latency: </span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {ver.latency_p95_ms ? `${ver.latency_p95_ms}ms` : "N/A"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <span>SHA: {ver.artifact_checksum.slice(0, 10)}...</span>
                            {ver.promoted_by && <span>By: {ver.promoted_by}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column: Prediction Station & Inference Console */}
                <div className="w-full lg:w-1/2 p-5 bg-white dark:bg-[#0d1322] space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Prediction Request Lifecycle
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      Active: {selectedModel.active_version_id ? "Production Route" : "Unrouted"}
                    </span>
                  </div>

                  <form onSubmit={handlePredict} className="space-y-3">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Input Payload / Prompt
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={predictPrompt}
                      onChange={(e) => setPredictPrompt(e.target.value)}
                      placeholder={`Enter prompt for ${selectedModel.name} (e.g. Generate executive summary or classification)...`}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">Meters tokens against organization quota</span>
                      <button
                        type="submit"
                        disabled={isPredicting || !predictPrompt.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-indigo-500/20 active:scale-95 transition-all shrink-0"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isPredicting ? "Running Inference..." : "Run Inference"}</span>
                      </button>
                    </div>
                  </form>

                  {/* Prediction Output Result */}
                  {predictionResult && (
                    <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 space-y-3 text-xs">
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Inference Response (200 OK)</span>
                        </span>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                          <span>{predictionResult.latency_ms} ms</span>
                          <span>•</span>
                          <span>{predictionResult.tokens_consumed} tokens</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950 dark:bg-black/90 border border-slate-800 dark:border-white/10 font-mono text-xs text-emerald-300 dark:text-emerald-300 whitespace-pre-wrap leading-relaxed shadow-lg">
                        {predictionResult.prediction}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          )
        )}

        {/* TAB 3: API KEYS & DEVELOPER PORTAL (Strict RBAC Guard) */}
        {activeTab === "apikeys" && (
          !canCreateApiKeys ? (
            <div className="card-depth-3d p-8 text-center space-y-3 max-w-lg mx-auto my-12">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Developer Credentials Restricted
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Machine access keys and developer API tools are reserved for organization administrators and developers. Your current role is <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{role || "viewer"}</span>.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("documents")}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
              >
                Return to Documents
              </button>
            </div>
          ) : (
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

            {/* Generate Key Form (Restricted to Key-Issuing Roles) */}
            {canCreateApiKeys ? (
              <form
                onSubmit={handleCreateApiKey}
                className="card-depth-3d p-4 sm:p-5 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Key Description / Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g. CI/CD Ingestion Pipeline"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Permission Scopes (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={newKeyScopes}
                      onChange={(e) => setNewKeyScopes(e.target.value)}
                      placeholder="docs:read, docs:write, chat:query"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-200/60 dark:border-white/[0.06]">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    High-entropy secrets prefixed with <code className="font-mono text-indigo-600 dark:text-indigo-400">bx_live_</code>. SHA-256 hashed at rest.
                  </p>
                  <button
                    type="submit"
                    disabled={isCreatingKey || !newKeyName.trim()}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-indigo-500/20 active:scale-95 transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isCreatingKey ? "Generating Key..." : "Generate Key"}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Machine Access Credentials Vault
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Your assigned role ({role?.replace(/_/g, " ") || "viewer"}) is restricted to auditing active organization credentials.
                    </p>
                  </div>
                </div>
                <span className="self-start sm:self-center text-[10px] font-mono px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold uppercase tracking-wider">
                  Auditor Mode
                </span>
              </div>
            )}

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
                      data-testid="api-key-row"
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
                        isOwnerOrAdmin ? (
                          <button
                            onClick={() => handleRevokeKey(k.id)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors font-medium"
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold">
                            Active
                          </span>
                        )
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Interactive Developer API Portal & SDK Hub */}
            <DeveloperApiPortal
              apiKeys={apiKeys}
              token={token}
              createdRawKey={createdRawKey}
            />
          </div>
          )
        )}

        {/* TAB: ENTERPRISE AUDIT & COMPLIANCE TRAIL (Section 10 & 13) */}
        {activeTab === "audit" && (
          !canViewAudit ? (
            <div className="card-depth-3d p-8 text-center space-y-3 max-w-lg mx-auto my-12">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Audit Trail Restricted
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Immutable compliance and activity audit logs are restricted strictly to organization administrators and owners. Your current role is <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{role || "viewer"}</span>.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("documents")}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
              >
                Return to Documents
              </button>
            </div>
          ) : (
          <div className="space-y-6 pb-20">
            <div className="text-center space-y-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2">
                <span>Enterprise Audit & Observability</span>
                <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                Immutable SOC 2 & ISO 27001 audit trail and live Prometheus telemetry metrics.
              </p>
            </div>

            {/* Sub-view Switcher: Audit Trail vs Prometheus Observability */}
            <div className="flex items-center justify-center">
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-white/[0.08] shadow-inner">
                <button
                  type="button"
                  onClick={() => setAuditSubView("logs")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    auditSubView === "logs"
                      ? "bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Compliance Trail
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuditSubView("telemetry");
                    loadTelemetryData();
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    auditSubView === "telemetry"
                      ? "bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                  Live Observability (Prometheus)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuditSubView("dlq");
                    loadDlqData();
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    auditSubView === "dlq"
                      ? "bg-white dark:bg-rose-600 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <AlertTriangle className={`w-3.5 h-3.5 ${dlqTotal > 0 ? "text-rose-500 animate-pulse" : "text-amber-500"}`} />
                  <span>Dead-Letter Queue (DLQ)</span>
                  {dlqTotal > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-600 dark:text-rose-300 font-bold border border-rose-500/30">
                      {dlqTotal}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {auditSubView === "logs" ? (
              <>
            {/* Telemetry Gauge Cards with 3D Tactile Glare */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <TiltCard3D maxTilt={9} className="card-depth-3d p-4 sm:p-5 space-y-1 rounded-2xl cursor-default">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  Total Audit Events
                </span>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {auditStats?.total_events ?? 0}
                </p>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                  Immutable Ledgers
                </p>
              </TiltCard3D>

              <TiltCard3D maxTilt={9} className="card-depth-3d p-4 sm:p-5 space-y-1 rounded-2xl cursor-default">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                  Routine Operations
                </span>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {auditStats?.info_count ?? 0}
                </p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                  Info Level Logs
                </p>
              </TiltCard3D>

              <TiltCard3D maxTilt={9} className="card-depth-3d p-4 sm:p-5 space-y-1 rounded-2xl cursor-default">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Security Warnings
                </span>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {auditStats?.warning_count ?? 0}
                </p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  API & Access Changes
                </p>
              </TiltCard3D>

              <TiltCard3D maxTilt={9} className="card-depth-3d p-4 sm:p-5 space-y-1 rounded-2xl cursor-default">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                  Critical Incidents
                </span>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {auditStats?.critical_count ?? 0}
                </p>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                  Requires Triage
                </p>
              </TiltCard3D>
            </div>

            {/* Audit Compliance Verification Toast / Banner (Section 9.2 & 10.4) */}
            {auditExportNotification && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg shadow-emerald-500/5 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Audit Export Generated: {auditExportNotification.filename}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                        {auditExportNotification.format} ({auditExportNotification.recordCount} records)
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        SOC 2 Type II / Section 9.2 Compliant
                      </span>
                    </div>
                    {auditExportNotification.checksum && (
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                        <span className="text-slate-400 dark:text-slate-500">SHA-256 Digest:</span>
                        <span className="truncate max-w-[220px] sm:max-w-md bg-white/60 dark:bg-black/40 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10 select-all">
                          {auditExportNotification.checksum}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(auditExportNotification.checksum);
                            setCopiedChecksum(true);
                            setTimeout(() => setCopiedChecksum(false), 2000);
                          }}
                          className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-1"
                          title="Copy SHA-256 Checksum"
                        >
                          {copiedChecksum ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAuditExportNotification(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors self-end md:self-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Action Toolbar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 rounded-2xl bg-white/70 dark:bg-[#0c1222]/70 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl">
              {/* Filter Pills (Severity + Date Range) */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Severity Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Severity:
                  </span>
                  {(
                    [
                      { id: "", label: "All" },
                      { id: "info", label: "Info" },
                      { id: "warning", label: "Warning" },
                      { id: "critical", label: "Critical" },
                    ] as const
                  ).map((s) => {
                    const isSel = auditSeverityFilter === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setAuditSeverityFilter(s.id);
                          setAuditPage(1);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
                          isSel
                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                            : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.12]"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>

                {/* Date Range Preset Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none pl-1 sm:border-l sm:border-slate-200 sm:dark:border-white/10 sm:pl-3">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Range:
                  </span>
                  {(
                    [
                      { id: "all", label: "All Time" },
                      { id: "24h", label: "24h" },
                      { id: "7d", label: "7 Days" },
                      { id: "30d", label: "30 Days" },
                    ] as const
                  ).map((preset) => {
                    const isSel = auditDatePreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setAuditDatePreset(preset.id);
                          setAuditPage(1);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
                          isSel
                            ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                            : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.12]"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search & Actions */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="relative flex-1 sm:w-48 min-w-[150px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    placeholder="Search action or actor..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <button
                  type="button"
                  onClick={loadAuditData}
                  disabled={isLoadingAudit}
                  title="Refresh Audit Logs"
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingAudit ? "animate-spin text-indigo-500" : ""}`} />
                </button>

                <button
                  type="button"
                  onClick={() => handleExportAuditLogs("csv")}
                  disabled={isExportingAudit}
                  title="Export filtered audit logs as RFC 4180 CSV"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-sm shadow-indigo-500/30 disabled:opacity-50 flex items-center gap-1.5 shrink-0 transition-all"
                >
                  <Download className={`w-3.5 h-3.5 ${isExportingAudit && exportingFormat === "csv" ? "animate-bounce" : ""}`} />
                  <span>{isExportingAudit && exportingFormat === "csv" ? "Exporting..." : "Export CSV"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportAuditLogs("json")}
                  disabled={isExportingAudit}
                  title="Export filtered audit logs for SIEM & automated compliance ingestion"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/60 shadow-sm disabled:opacity-50 flex items-center gap-1.5 shrink-0 transition-all"
                >
                  <FileJson className={`w-3.5 h-3.5 ${isExportingAudit && exportingFormat === "json" ? "animate-spin" : ""}`} />
                  <span>{isExportingAudit && exportingFormat === "json" ? "Exporting..." : "Export JSON (SIEM)"}</span>
                </button>
              </div>
            </div>

            {/* Audit Logs Table / Stream */}
            <div className="card-depth-3d overflow-hidden rounded-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-4">Timestamp (UTC)</th>
                      <th className="py-3 px-3">Severity</th>
                      <th className="py-3 px-4">Action Event</th>
                      <th className="py-3 px-3">Resource</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05] text-xs">
                    {isLoadingAudit ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-500 mb-2" />
                          <span>Streaming audit event ledger...</span>
                        </td>
                      </tr>
                    ) : auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                          <ShieldCheck className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                          <p className="font-semibold">No audit events found</p>
                          <p className="text-xs text-slate-400">Events will record automatically as operations occur.</p>
                        </td>
                      </tr>
                    ) : (
                      auditLogs
                        .filter((log) => {
                          if (!auditSearchQuery.trim()) return true;
                          const q = auditSearchQuery.toLowerCase();
                          return (
                            log.action.toLowerCase().includes(q) ||
                            log.actor_email.toLowerCase().includes(q) ||
                            log.resource_type.toLowerCase().includes(q) ||
                            (log.resource_id && log.resource_id.toLowerCase().includes(q))
                          );
                        })
                        .map((log) => {
                          const dateObj = new Date(log.created_at);
                          const dateStr = !isNaN(dateObj.getTime())
                            ? dateObj.toISOString().replace("T", " ").slice(0, 19)
                            : log.created_at;

                          return (
                            <tr
                              key={log.id}
                              className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                            >
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {dateStr}
                              </td>

                              <td className="py-3 px-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                    log.severity === "critical"
                                      ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                                      : log.severity === "warning"
                                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                      : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
                                  }`}
                                >
                                  {log.severity}
                                </span>
                              </td>

                              <td className="py-3 px-4">
                                <div className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                                  {log.action}
                                </div>
                              </td>

                              <td className="py-3 px-3 whitespace-nowrap">
                                <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300">
                                  {log.resource_type}
                                </span>
                              </td>

                              <td className="py-3 px-4">
                                <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                                  {log.actor_email}
                                </div>
                                <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                  {log.ip_address}
                                </div>
                              </td>

                              <td className="py-3 px-3 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => setInspectingAuditLog(log)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Inspect</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer / Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.01] text-xs text-slate-600 dark:text-slate-400">
                <div>
                  Showing{" "}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {auditTotal === 0 ? 0 : (auditPage - 1) * auditLimit + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {Math.min(auditPage * auditLimit, auditTotal)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {auditTotal}
                  </span>{" "}
                  events
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    disabled={auditPage <= 1}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-white/[0.1] transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-mono text-[11px]">
                    Page {auditPage} of {Math.max(1, Math.ceil(auditTotal / auditLimit))}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAuditPage((p) => p + 1)}
                    disabled={auditPage * auditLimit >= auditTotal}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-white/[0.1] transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* Inspect Modal Drawer */}
            {inspectingAuditLog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="card-depth-3d w-full max-w-xl p-6 space-y-4 relative">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Audit Event Inspector
                        </h4>
                        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {inspectingAuditLog.id}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInspectingAuditLog(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Metadata Summary Grid */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Action</span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {inspectingAuditLog.action}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Severity</span>
                      <span className="font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        {inspectingAuditLog.severity}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Actor</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {inspectingAuditLog.actor_email}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Client IP</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {inspectingAuditLog.ip_address}
                      </span>
                    </div>
                  </div>

                  {/* JSON Payload Details */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Terminal className="w-3.5 h-3.5 text-indigo-500" />
                        Event Payload Details (JSON)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(inspectingAuditLog.details);
                          setCopiedAuditJson(true);
                          setTimeout(() => setCopiedAuditJson(false), 2000);
                        }}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        {copiedAuditJson ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy JSON</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="p-3.5 rounded-xl bg-slate-950 dark:bg-black/90 text-emerald-300 font-mono text-xs overflow-x-auto max-h-56 scrollbar-none border border-slate-800">
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(inspectingAuditLog.details), null, 2);
                        } catch {
                          return inspectingAuditLog.details || "{}";
                        }
                      })()}
                    </pre>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setInspectingAuditLog(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
              </>
            ) : auditSubView === "telemetry" ? (
              /* PROMETHEUS LIVE OBSERVABILITY VIEW (Section 13 & 14.3) */
              <div className="space-y-6">
                {/* 5 Telemetry 3D Gauge Cards with SLA Latency Budget (Section 13.2) */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                  <TiltCard3D maxTilt={9} className="card-depth-3d p-4 sm:p-5 space-y-1 rounded-2xl cursor-default">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-indigo-500" />
                      p95 Latency
                    </span>
                    <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                      {telemetry?.p95_latency_ms ?? 0} <span className="text-xs font-semibold text-slate-400">ms</span>
                    </p>
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                      p50: {telemetry?.p50_latency_ms ?? 0}ms &bull; p99: {telemetry?.p99_latency_ms ?? 0}ms
                    </p>
                  </TiltCard3D>

                  <TiltCard3D maxTilt={9} className="card-depth-3d p-4 sm:p-5 space-y-1 rounded-2xl cursor-default">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                      Latency SLA Budget
                    </span>
                    <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      {telemetry?.sla_compliance_percentage ?? 100}%
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                        telemetry?.is_latency_budget_breached
                          ? "bg-rose-500/20 text-rose-500 font-bold"
                          : (telemetry?.latency_budget_status === "warning")
                          ? "bg-amber-500/20 text-amber-500 font-bold"
                          : "bg-emerald-500/20 text-emerald-500 font-bold"
                      }`}>
                        {telemetry?.is_latency_budget_breached ? "BREACHED" : telemetry?.latency_budget_status === "warning" ? "WARNING" : "HEALTHY"}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                      Target Budget: &le; {telemetry?.latency_budget_ms ?? 2000}ms
                    </p>
                  </TiltCard3D>

                  <TiltCard3D maxTilt={9} className="card-depth-3d p-4 sm:p-5 space-y-1 rounded-2xl cursor-default">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-500" />
                      Throughput
                    </span>
                    <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                      {telemetry?.requests_per_minute ?? 0} <span className="text-xs font-semibold text-slate-400">req/m</span>
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Total: {telemetry?.total_requests ?? 0} calls
                    </p>
                  </TiltCard3D>

                  <TiltCard3D maxTilt={9} className="card-depth-3d p-4 sm:p-5 space-y-1 rounded-2xl cursor-default">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-blue-500" />
                      Active In-Flight
                    </span>
                    <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      {telemetry?.active_requests ?? 0}
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </p>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                      Concurrent Requests
                    </p>
                  </TiltCard3D>

                  <TiltCard3D maxTilt={9} className="card-depth-3d p-4 sm:p-5 space-y-1 rounded-2xl cursor-default">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                      Platform Health
                    </span>
                    <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                      {Math.max(0, 100 - (telemetry?.error_rate_percentage ?? 0)).toFixed(1)}%
                    </p>
                    <p className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                      Uptime: {Math.floor((telemetry?.uptime_seconds ?? 0) / 60)}m {Math.floor((telemetry?.uptime_seconds ?? 0) % 60)}s
                    </p>
                  </TiltCard3D>
                </div>

                {/* Toolbar: Refresh + Prometheus Exporter Link */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/70 dark:bg-[#0c1222]/70 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl">
                  {/* Status Breakdown Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <BarChart3 className="w-3.5 h-3.5" /> Status Breakdown:
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                      2xx OK: {telemetry?.status_breakdown["2xx"] ?? 0}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                      4xx Client: {telemetry?.status_breakdown["4xx"] ?? 0}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                      5xx Server: {telemetry?.status_breakdown["5xx"] ?? 0}
                    </span>
                  </div>

                  {/* Actions: Refresh & Open /metrics */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={loadTelemetryData}
                      disabled={isLoadingTelemetry}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTelemetry ? "animate-spin text-indigo-500" : ""}`} />
                      Refresh
                    </button>
                    <a
                      href={`${api.getBaseUrl()}/metrics`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View /metrics
                    </a>
                  </div>
                </div>

                {/* Top Endpoints Table & Prometheus Info */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Top Endpoints */}
                  <div className="lg:col-span-2 rounded-2xl bg-white/70 dark:bg-[#0c1222]/70 border border-slate-200/80 dark:border-white/[0.08] p-5 backdrop-blur-xl space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-500" />
                      High-Volume Endpoints
                    </h3>
                    <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                      {telemetry?.top_endpoints && telemetry.top_endpoints.length > 0 ? (
                        telemetry.top_endpoints.map((ep, idx) => (
                          <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                            <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[280px] sm:max-w-md">
                              {ep.endpoint}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400">
                              {ep.requests} requests
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="py-4 text-xs text-slate-400 text-center">No endpoint traffic recorded yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Prometheus Scraper Config Box */}
                  <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-500/20 p-5 text-white space-y-3">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-indigo-300">
                      <Terminal className="w-4 h-4" />
                      Prometheus Exporter
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      External Prometheus servers can scrape standard v0.0.4 metrics directly from the host.
                    </p>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 font-mono text-[11px] text-emerald-300 space-y-1">
                      <p className="text-slate-400 text-[10px]"># Live Scrape Command</p>
                      <p>curl -s {api.getBaseUrl()}/metrics</p>
                    </div>
                    <div className="text-[11px] text-slate-400 space-y-1">
                      <p>&bull; Metric Types: Counters, Histograms, Gauges</p>
                      <p>&bull; Buckets: 5ms &rarr; 10s (+Inf)</p>
                      <p>&bull; Scrape Target: <code>GET /metrics</code></p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* DEAD-LETTER QUEUE (DLQ) VIEW (Section 11.3 & 14) */
              <div className="space-y-6">
                {/* Action Alert Banner */}
                {dlqActionMessage && (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-md ${
                      dlqActionMessage.type === "success"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {dlqActionMessage.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      )}
                      <span>{dlqActionMessage.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDlqActionMessage(null)}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* DLQ 4 Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <TiltCard3D maxTilt={9} className="card-depth-3d p-4 sm:p-5 space-y-1 rounded-2xl cursor-default">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      Total DLQ Tasks
                    </span>
                    <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                      {dlqTotal}
                    </p>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                      Poison-Pill Quarantined
                    </p>
                  </TiltCard3D>

                  <TiltCard3D maxTilt={9} className="card-depth-3d p-4 sm:p-5 space-y-1 rounded-2xl cursor-default">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      Active Failures
                    </span>
                    <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                      {dlqJobs.filter((j) => j.status === "failed").length}
                    </p>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      Awaiting Re-drive / Fix
                    </p>
                  </TiltCard3D>

                  <TiltCard3D maxTilt={9} className="card-depth-3d p-4 sm:p-5 space-y-1 rounded-2xl cursor-default">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                      Re-driving
                    </span>
                    <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                      {dlqJobs.filter((j) => j.status === "retrying").length}
                    </p>
                    <p className="text-[11px] text-blue-500 font-semibold">
                      In-Flight Workers
                    </p>
                  </TiltCard3D>

                  <TiltCard3D maxTilt={9} className="card-depth-3d p-4 sm:p-5 space-y-1 rounded-2xl cursor-default">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Purged / Dismissed
                    </span>
                    <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                      {dlqJobs.filter((j) => j.status === "purged").length}
                    </p>
                    <p className="text-[11px] text-emerald-500 font-semibold">
                      Quarantine Resolved
                    </p>
                  </TiltCard3D>
                </div>

                {/* DLQ Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/70 dark:bg-[#0c1222]/70 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl">
                  {/* Status Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                      <Filter className="w-3 h-3" /> Status:
                    </span>
                    {(
                      [
                        { id: "", label: "All Tasks" },
                        { id: "failed", label: "Failed" },
                        { id: "retrying", label: "Retrying" },
                        { id: "purged", label: "Purged" },
                      ] as const
                    ).map((f) => {
                      const isSel = dlqStatusFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setDlqStatusFilter(f.id)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
                            isSel
                              ? "bg-rose-600 text-white shadow-sm shadow-rose-500/30"
                              : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.12]"
                          }`}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={loadDlqData}
                    disabled={isLoadingDlq}
                    title="Refresh DLQ"
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 transition-colors flex items-center gap-1.5 text-xs px-3 font-semibold self-end sm:self-center"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDlq ? "animate-spin text-rose-500" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {/* DLQ Table */}
                <div className="card-depth-3d overflow-hidden rounded-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <th className="py-3 px-4">Task Name</th>
                          <th className="py-3 px-3">Resource</th>
                          <th className="py-3 px-4">Error Diagnostics</th>
                          <th className="py-3 px-3 text-center">Attempts</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05] text-xs">
                        {isLoadingDlq ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400">
                              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                              Loading Dead-Letter Queue items...
                            </td>
                          </tr>
                        ) : dlqJobs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400">
                              <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                              <p className="font-semibold text-slate-700 dark:text-slate-300">
                                Dead-Letter Queue is Clean
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Zero poisoned or unhandled background jobs quarantined for this tenant.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          dlqJobs.map((job) => (
                            <tr
                              key={job.id}
                              className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                            >
                              <td className="py-3 px-4">
                                <div className="font-mono text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <Terminal className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                  <span>{job.task_name}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                                  {new Date(job.created_at).toLocaleString()}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 capitalize">
                                  {job.resource_type}
                                </span>
                                {job.resource_id && (
                                  <span className="block text-[10px] text-slate-400 font-mono truncate max-w-[100px] mt-0.5">
                                    {job.resource_id}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 max-w-xs truncate">
                                <span className="text-xs text-rose-600 dark:text-rose-400 font-mono block truncate" title={job.error_message}>
                                  {job.error_message}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5">
                                  {job.retry_count}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full capitalize ${
                                    job.status === "failed"
                                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                      : job.status === "retrying"
                                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                      : "bg-slate-100 dark:bg-white/5 text-slate-500 border border-slate-200 dark:border-white/10"
                                  }`}
                                >
                                  {job.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setInspectingDlqJob(job)}
                                    title="Inspect Error & Stack Trace"
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRetryDlqJob(job.id)}
                                    disabled={retryingJobId === job.id || job.status === "purged"}
                                    title="Re-drive Job into Pipeline"
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 flex items-center gap-1 transition-colors"
                                  >
                                    <RefreshCw className={`w-3 h-3 ${retryingJobId === job.id ? "animate-spin" : ""}`} />
                                    <span>Re-drive</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handlePurgeDlqJob(job.id)}
                                    disabled={purgingJobId === job.id || job.status === "purged"}
                                    title="Purge Task from DLQ"
                                    className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Inspect DLQ Modal / Drawer */}
                {inspectingDlqJob && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/[0.1] rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-white/[0.06] pb-3">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                            Dead-Letter Job Diagnostics
                          </h3>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            Task: {inspectingDlqJob.task_name} &bull; ID: {inspectingDlqJob.id}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInspectingDlqJob(null)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3 overflow-y-auto pr-1 flex-1 text-xs">
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Error Message
                          </span>
                          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-mono text-[11px] select-all">
                            {inspectingDlqJob.error_message}
                          </div>
                        </div>

                        {inspectingDlqJob.stack_trace && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                Python Stack Trace
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(inspectingDlqJob.stack_trace || "");
                                  setCopiedDlqTrace(true);
                                  setTimeout(() => setCopiedDlqTrace(false), 2000);
                                }}
                                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                              >
                                {copiedDlqTrace ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedDlqTrace ? "Copied" : "Copy Trace"}</span>
                              </button>
                            </div>
                            <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[10px] overflow-x-auto leading-relaxed max-h-48 border border-white/10">
                              {inspectingDlqJob.stack_trace}
                            </pre>
                          </div>
                        )}

                        {inspectingDlqJob.payload && (
                          <div>
                            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Task Payload
                            </span>
                            <pre className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-mono text-[10px] overflow-x-auto">
                              {JSON.stringify(inspectingDlqJob.payload, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handlePurgeDlqJob(inspectingDlqJob.id)}
                          disabled={purgingJobId === inspectingDlqJob.id || inspectingDlqJob.status === "purged"}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 disabled:opacity-40"
                        >
                          Purge Task
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setInspectingDlqJob(null)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
                          >
                            Close
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRetryDlqJob(inspectingDlqJob.id)}
                            disabled={retryingJobId === inspectingDlqJob.id || inspectingDlqJob.status === "purged"}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 flex items-center gap-1.5"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${retryingJobId === inspectingDlqJob.id ? "animate-spin" : ""}`} />
                            <span>Re-drive Job</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          )
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

            {/* Linear-Style Asymmetric Bento Grid (Section 7 & 16) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* HERO BENTO TILE (7 cols): Real-Time Token Telemetry Console */}
              <div className="lg:col-span-7 card-depth-3d p-5 sm:p-6 space-y-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 dark:border-white/[0.08] pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>Token Consumption Telemetry</span>
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Real-time metering across RAG queries, prompt contexts & LLM generations
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={loadUsage}
                      disabled={isUsageLoading}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/[0.08] transition-all disabled:opacity-50"
                      title="Sync live telemetry"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isUsageLoading ? "animate-spin text-indigo-500" : ""}`} />
                      <span className="hidden sm:inline">Sync</span>
                    </button>
                  </div>

                  {/* Gauge Progress Bar & Numbers */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-baseline text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-400">Monthly Quota Consumption</span>
                      <span className="font-mono text-slate-900 dark:text-white font-bold">
                        {(usage?.tokens_used ?? 0).toLocaleString()} / {(usage?.token_allowance ?? 100000).toLocaleString()} tokens ({usage?.percentage_used ?? 0}%)
                      </span>
                    </div>

                    <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-black/60 border border-slate-300 dark:border-white/[0.08] overflow-hidden p-0.5 shadow-inner">
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
                </div>

                {/* Real-Time Telemetry Sparkline Curve (Vercel / Datadog tier) */}
                <TelemetrySparkline
                  totalTokens={usage?.tokens_used ?? 31464}
                  queriesCount={usage?.queries_count ?? 55}
                />
                {/* Detailed 4-Column Sub-Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] space-y-0.5">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <Cpu className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                      <span>Prompt</span>
                    </div>
                    <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                      {(usage?.prompt_tokens ?? 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Context tokens</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] space-y-0.5">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      <span>Completion</span>
                    </div>
                    <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                      {(usage?.completion_tokens ?? 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Generated text</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] space-y-0.5">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <Layers className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      <span>Queries</span>
                    </div>
                    <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                      {(usage?.queries_count ?? 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">RAG calls</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] space-y-0.5">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <Gauge className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Headroom</span>
                    </div>
                    <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                      {Math.max(0, (usage?.token_allowance ?? 100000) - (usage?.tokens_used ?? 0)).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Remaining</p>
                  </div>
                </div>

                {/* Quota Threshold Warning Banner */}
                {(usage?.is_quota_exceeded || (usage?.percentage_used ?? 0) >= 80) && (
                  <div
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs mt-3 ${
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
                        ? "Your organization has consumed all 100,000 free tokens. Further RAG queries will be rejected with HTTP 429 until the next billing cycle."
                        : `You have consumed ${usage?.percentage_used}% of your monthly allowance.`}
                    </div>
                  </div>
                )}
              </div>

              {/* SECONDARY SIDE BENTO STACK (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {/* Bento Card 1: Subscription Tier & Document Quota */}
                <div className="card-depth-3d p-5 space-y-3 rounded-2xl flex-1 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Subscription Tier
                      </span>
                      <h4 className="text-xl font-extrabold text-slate-900 dark:text-white capitalize">
                        {usage?.plan_tier ? `${usage.plan_tier} Plan` : "Starter Free"}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active Tenant
                      </span>
                      <FlowButton
                        onClick={() => setIsUpgradeModalOpen(true)}
                        icon="zap"
                        variant="amber"
                        size="sm"
                        title="Upgrade subscription tier (Section 7.3)"
                      >
                        Upgrade
                      </FlowButton>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Document Vector Capacity</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {Math.min(documents.length, usage?.documents_limit ?? 5)} / {usage?.documents_limit ?? 5} docs
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-black/60 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (documents.length / (usage?.documents_limit ?? 5)) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-0.5">
                      <span>PDF Magic Byte Protected</span>
                      <span>{Math.round((documents.length / (usage?.documents_limit ?? 5)) * 100)}% filled</span>
                    </p>
                  </div>
                </div>

                {/* Bento Card 2: Security & Operational Health */}
                <div className="card-depth-3d p-5 space-y-3 rounded-2xl flex-1 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Operational Posture
                      </span>
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>SOC 2 & ISO 27001</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                      Multi-Tenant
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] space-y-0.5">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Circuit Breaker</span>
                      <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        CLOSED
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] space-y-0.5">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Telemetry Bus</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        Prometheus
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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
                      
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Collaborator accounts, scoped roles, and single-use invitation tokens
                    </p>
                  </div>
                </div>

                {isOwnerOrAdmin && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-all"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Invite Member</span>
                  </button>
                )}
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

                        {/* Custom Role Dropdown (Admins/Owners) or Read-Only Role Badge */}
                        <div className="w-32">
                          {isOwnerOrAdmin ? (
                            <CustomRoleDropdown
                              value={m.role}
                              disabled={m.role === "organization_owner"}
                              onChange={(newRole) => handleUpdateRole(m.id, newRole)}
                              options={ROLE_OPTIONS}
                              compact
                            />
                          ) : (
                            <span className="inline-block w-full text-center text-xs font-mono py-1 px-2 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08] capitalize">
                              {ROLE_OPTIONS.find((r) => r.value === m.role)?.label || m.role.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>

                        {/* Copy Invite Link if Invited */}
                        {isOwnerOrAdmin && m.status === "invited" && m.invitation_token && (
                          <button
                            onClick={() => {
                              const link = `${window.location.origin}/accept-invite?token=${m.invitation_token}`;
                              navigator.clipboard.writeText(link);
                              showToast("Copied", "Invitation link copied to clipboard!", "success");
                            }}
                            title="Copy Invitation Link"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/[0.08] transition-all"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Remove / Revoke Button */}
                        {isOwnerOrAdmin && m.role !== "organization_owner" && (
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
                        <span>Invitation created & email dispatched!</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        An invitation email was sent to <strong>{inviteEmail}</strong>. You can also share this direct single-use link (valid for 7 days):
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

        {/* Enterprise In-Page Micro-Footer on Management Views (Section 9.2 & SOC 2) */}
        {activeTab !== "chat" && (
          <EnterpriseFooter
            onOpenDLPShield={() => setIsDlpModalOpen(true)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          />
        )}
      </main>

      {/* Floating Rocket Dock Anchored at the Bottom */}
      {/* Raycast-Style Global Command Palette (⌘K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTab={(tab) => setActiveTab(tab)}
        onNewThread={handleNewThread}
        onSeedDemo={handleSeedDemoKnowledge}
        onToggleTheme={() => {
          const toggleBtn = document.querySelector('[data-testid="theme-toggle"]') as HTMLButtonElement;
          toggleBtn?.click();
        }}
        onOpenDLPShield={() => setIsDlpModalOpen(true)}
        onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
        documents={documents}
        onInspectDocument={(id) => handleInspectChunks(id)}
        canAccessModels={canAccessModels}
        canAccessApiKeys={canCreateApiKeys}
        canAccessAudit={canViewAudit}
        canUpgradePlan={isOwnerOrAdmin}
        canSeedDemo={canUploadDocs}
      />

      {/* Perplexity-Style Citation Inspector Drawer */}
      <CitationInspectorDrawer
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
        onInspectDocumentChunks={(id) => handleInspectChunks(id)}
        onDownloadDocument={(id) => handleDownloadDocument(id)}
      />

      <FloatingRocketDock
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        documentCount={documents.length}
        apiKeyCount={apiKeys.length}
        canAccessApiKeys={canCreateApiKeys}
        canAccessAudit={canViewAudit}
        canAccessModels={canAccessModels}
      />

      {/* Interactive Subscription Upgrade Modal (Section 7.3) */}
      <SubscriptionUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentPlanTier={usage?.plan_tier || "starter"}
        onPlanUpgraded={(newTier, newAllowance) => {
          setUsage((prev) => prev ? { ...prev, plan_tier: newTier, token_allowance: newAllowance } : null);
          loadUsage();
        }}
        showToast={showToast}
      />

      {/* Enterprise DLP Shield & PII Inspector Modal */}
      <DLPShieldModal
        isOpen={isDlpModalOpen}
        onClose={() => setIsDlpModalOpen(false)}
      />
    </div>
  );
}
