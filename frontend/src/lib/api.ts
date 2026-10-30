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
  async chatQuery(question: string, topK: number = 3): Promise<ChatResponse> {
    return this.request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({ question, top_k: topK }),
    });
  }

  async chatQueryStream(
    question: string,
    topK: number = 3,
    callbacks: {
      onToken: (token: string) => void;
      onCitations: (citations: SourceCitation[]) => void;
      onDone: (metrics: { prompt_tokens: number; completion_tokens: number; total_tokens: number; model: string }) => void;
      onError?: (error: string) => void;
    }
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
      body: JSON.stringify({ question, top_k: topK }),
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
}

export const api = new ApiClient();
