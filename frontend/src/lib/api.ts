
export interface AuditLogItem {
  id: string;
  organization_id: string;
  actor_id: string | null;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  severity: "info" | "warning" | "critical";
  details: string;
  ip_address: string;
  created_at: string;
}

export interface AuditLogListResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditStats {
  total_events: number;
  info_count: number;
  warning_count: number;
  critical_count: number;
}

/**
 * Bytherix EAM Enterprise API Client
 * Connects directly to FastAPI backend at /api/v1
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_platform_operator: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
  organization_id: string;
  role: string;
}

export interface DocumentItem {
  id: string;
  organization_id: string;
  title: string;
  filename: string;
  file_size_bytes: number;
  mime_type: string;
  checksum: string;
  status: "queued" | "processing" | "indexed" | "failed" | "deleting";
  page_count: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface SourceCitation {
  document_id: string;
  document_title: string;
  page_number: number;
  chunk_index: number;
  snippet: string;
  similarity_score: number;
}

export interface ChatResponse {
  answer: string;
  sources: SourceCitation[];
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
}

export interface MessageItem {
  id: string;
  sender: "user" | "assistant";
  content: string;
  sources: SourceCitation[];
  model?: string;
  created_at: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  allowed_tools: string[];
  has_approval_gate: boolean;
}

export interface AgentStepTraceItem {
  id: string;
  step_number: number;
  thought: string | null;
  tool_name: string | null;
  tool_input: string | null;
  tool_output: string | null;
  status: string;
  requires_approval: boolean;
  created_at: string;
}

export interface AgentExecutionSummary {
  id: string;
  workflow_name: string;
  status: "running" | "pending_approval" | "completed" | "failed" | "rejected";
  input_prompt: string;
  total_steps: number;
  has_pending_approval: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentExecutionDetail {
  id: string;
  workflow_name: string;
  status: "running" | "pending_approval" | "completed" | "failed" | "rejected";
  input_prompt: string;
  final_output: string | null;
  total_steps: number;
  pending_tool_name: string | null;
  pending_tool_args: string | null;
  traces: AgentStepTraceItem[];
  created_at: string;
  updated_at: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  message_count: number;
  updated_at: string;
  created_at: string;
}


export interface RegisteredModelSummary {
  id: string;
  name: string;
  description?: string;
  task_type: string;
  active_version_id?: string;
  active_version_name?: string;
  total_versions: number;
  created_at: string;
}

export interface ModelVersionDetail {
  id: string;
  registered_model_id: string;
  version: string;
  lifecycle_stage: string;
  artifact_checksum: string;
  input_schema: string;
  output_schema: string;
  parameters: string;
  training_data_ref?: string;
  accuracy_score?: number;
  latency_p95_ms?: number;
  promoted_by?: string;
  promoted_at?: string;
  created_at: string;
}

export interface RegisteredModelDetail {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  task_type: string;
  active_version_id?: string;
  created_at: string;
  versions: ModelVersionDetail[];
}

export interface PredictionResult {
  model_name: string;
  version: string;
  prediction: string;
  latency_ms: number;
  tokens_consumed: number;
  lifecycle_stage: string;
}

export interface SessionDetail {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: MessageItem[];
}

export interface UsageSummary {
  organization_id: string;
  plan_tier: string;
  token_allowance: number;
  tokens_used: number;
  prompt_tokens: number;
  completion_tokens: number;
  queries_count: number;
  percentage_used: number;
  documents_count: number;
  documents_limit: number;
  is_quota_exceeded: boolean;
}

export interface MembershipItem {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  status: string;
  user_email: string | null;
  user_full_name: string | null;
  invitation_token: string | null;
  created_at: string;
}

export interface ApiKeyItem {
  id: string;
  organization_id: string;
  name: string;
  prefix: string;
  scopes: string;
  is_revoked: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  raw_key?: string;
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("bytherix_token");
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMsg = `Request failed (${res.status})`;
      try {
        const errorData = await res.json();
        errorMsg = errorData.error?.message || errorData.detail || errorMsg;
      } catch {
        // use default error message
      }
      throw new Error(errorMsg);
    }

    return res.json() as Promise<T>;
  }

  // Auth endpoints
  async signup(data: { email: string; password: string; full_name: string; organization_name: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string; organization_id?: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Document endpoints
  async listDocuments(): Promise<DocumentItem[]> {
    return this.request<DocumentItem[]>("/documents");
  }

  async uploadDocument(file: File, title?: string): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append("file", file);
    if (title) formData.append("title", title);

    return this.request<DocumentItem>("/documents", {
      method: "POST",
      body: formData,
    });
  }

  async deleteDocument(documentId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/documents/${documentId}`, {
      method: "DELETE",
    });
  }

  // Chat / RAG endpoints
  async chatQuery(question: string, topK: number = 3, sessionId?: string): Promise<ChatResponse> {
    return this.request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({ question, top_k: topK, session_id: sessionId }),
    });
  }

  async listChatSessions(): Promise<SessionSummary[]> {
    return this.request<SessionSummary[]>("/chat/sessions");
  }

  async getChatSession(sessionId: string): Promise<SessionDetail> {
    return this.request<SessionDetail>(`/chat/sessions/${sessionId}`);
  }

  async deleteChatSession(sessionId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/chat/sessions/${sessionId}`, {
      method: "DELETE",
    });
  }

  async chatQueryStream(
    question: string,
    topK: number = 3,
    callbacks: {
      onToken: (token: string) => void;
      onCitations: (citations: SourceCitation[]) => void;
      onDone: (metrics: { prompt_tokens: number; completion_tokens: number; total_tokens: number; model: string; session_id?: string }) => void;
      onSession?: (meta: { session_id: string; title: string }) => void;
      onError?: (error: string) => void;
    },
    sessionId?: string
  ): Promise<void> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify({ question, top_k: topK, session_id: sessionId }),
    });

    if (!res.ok) {
      let errorMsg = `Streaming request failed (${res.status})`;
      try {
        const errorData = await res.json();
        errorMsg = errorData.error?.message || errorData.detail || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    if (!res.body) {
      throw new Error("No response body received from server");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const jsonStr = trimmed.slice(6).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === "token") {
              callbacks.onToken(parsed.token);
            } else if (parsed.type === "citations") {
              callbacks.onCitations(parsed.data);
            } else if (parsed.type === "session") {
              if (callbacks.onSession) callbacks.onSession(parsed);
            } else if (parsed.type === "done") {
              callbacks.onDone(parsed);
            } else if (parsed.type === "error") {
              if (callbacks.onError) callbacks.onError(parsed.error);
            }
          } catch (e) {
            console.error("SSE parse error", e, jsonStr);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // Governed Agent Workflows (Section 8.4 & 11)
  async listWorkflows(): Promise<WorkflowDefinition[]> {
    return this.request<WorkflowDefinition[]>("/agents/workflows");
  }

  async startAgentExecution(workflow_name: string, input_prompt: string): Promise<AgentExecutionDetail> {
    return this.request<AgentExecutionDetail>("/agents/executions", {
      method: "POST",
      body: JSON.stringify({ workflow_name, input_prompt }),
    });
  }

  async listAgentExecutions(): Promise<AgentExecutionSummary[]> {
    return this.request<AgentExecutionSummary[]>("/agents/executions");
  }

  async getAgentExecution(executionId: string): Promise<AgentExecutionDetail> {
    return this.request<AgentExecutionDetail>(`/agents/executions/${executionId}`);
  }

  async approveAgentAction(executionId: string, approve: boolean, reason?: string): Promise<AgentExecutionDetail> {
    return this.request<AgentExecutionDetail>(`/agents/executions/${executionId}/approval`, {
      method: "POST",
      body: JSON.stringify({ approve, reason }),
    });
  }

  // API Key endpoints
  async listApiKeys(): Promise<ApiKeyItem[]> {
    return this.request<ApiKeyItem[]>("/api-keys");
  }

  async createApiKey(name: string, scopes: string): Promise<ApiKeyItem> {
    return this.request<ApiKeyItem>("/api-keys", {
      method: "POST",
      body: JSON.stringify({ name, scopes }),
    });
  }

  async revokeApiKey(keyId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api-keys/${keyId}`, {
      method: "DELETE",
    });
  }

  // Usage & Quota endpoints (Section 7.4 & 10.2)
  async getUsage(): Promise<UsageSummary> {
    return this.request<UsageSummary>("/usage");
  }

  // Member & Organization endpoints (Section 7.1 & 10.2)
  async listMembers(orgId: string): Promise<MembershipItem[]> {
    return this.request<MembershipItem[]>(`/organizations/${orgId}/members`);
  }

  async inviteMember(orgId: string, email: string, role: string): Promise<MembershipItem> {
    return this.request<MembershipItem>(`/organizations/${orgId}/members/invite`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
  }

  async removeMember(orgId: string, membershipId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/organizations/${orgId}/members/${membershipId}`, {
      method: "DELETE",
    });
  }

  async updateMemberRole(orgId: string, membershipId: string, role: string): Promise<MembershipItem> {
    return this.request<MembershipItem>(`/organizations/${orgId}/members/${membershipId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  }

  async acceptInvite(token: string, password: string, fullName: string): Promise<{ message: string; email: string; organization_id: string }> {
    return this.request<{ message: string; email: string; organization_id: string }>("/organizations/accept-invite", {
      method: "POST",
      body: JSON.stringify({ token, password, full_name: fullName }),
    });
  }

  // MLOps Model Registry & Deployment endpoints (Section 9 & 16.1 #4)
  async listModels(): Promise<RegisteredModelSummary[]> {
    return this.request<RegisteredModelSummary[]>("/models");
  }

  async getModel(modelId: string): Promise<RegisteredModelDetail> {
    return this.request<RegisteredModelDetail>(`/models/${modelId}`);
  }

  async registerModel(name: string, description?: string, task_type: string = "text-generation"): Promise<RegisteredModelDetail> {
    return this.request<RegisteredModelDetail>("/models", {
      method: "POST",
      body: JSON.stringify({ name, description, task_type }),
    });
  }

  async createModelVersion(modelId: string, version: string, parameters?: string, accuracy_score?: number, latency_p95_ms?: number): Promise<ModelVersionDetail> {
    return this.request<ModelVersionDetail>(`/models/${modelId}/versions`, {
      method: "POST",
      body: JSON.stringify({ version, parameters, accuracy_score, latency_p95_ms }),
    });
  }

  async promoteModelVersion(versionId: string, target_stage: string): Promise<ModelVersionDetail> {
    return this.request<ModelVersionDetail>(`/models/versions/${versionId}/promote`, {
      method: "POST",
      body: JSON.stringify({ target_stage }),
    });
  }

  async rollbackModel(modelId: string, targetVersionId: string): Promise<ModelVersionDetail> {
    return this.request<ModelVersionDetail>(`/models/${modelId}/rollback/${targetVersionId}`, {
      method: "POST",
    });
  }

  async predictModel(modelName: string, prompt: string, version?: string): Promise<PredictionResult> {
    return this.request<PredictionResult>(`/models/${modelName}/predict`, {
      method: "POST",
      body: JSON.stringify({ prompt, version }),
    });
  }

  // Audit & Compliance Trail (Section 10 & 13)
  async listAuditLogs(params?: {
    action?: string;
    severity?: string;
    resource_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogListResponse> {
    const query = new URLSearchParams();
    if (params?.action) query.set("action", params.action);
    if (params?.severity) query.set("severity", params.severity);
    if (params?.resource_type) query.set("resource_type", params.resource_type);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    const qs = query.toString();
    return this.request<AuditLogListResponse>(`/audit-logs${qs ? `?${qs}` : ""}`);
  }

  async getAuditStats(): Promise<AuditStats> {
    return this.request<AuditStats>("/audit-logs/stats");
  }

  async exportAuditLogsCsv(): Promise<Blob> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE_URL}/audit-logs/export`, {
      headers,
    });
    if (!res.ok) {
      throw new Error(`Failed to export audit logs: ${res.statusText}`);
    }
    return res.blob();
  }
}

export const api = new ApiClient();
