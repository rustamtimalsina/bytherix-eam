"use client";

import React, { useState } from "react";
import { 
  Copy, 
  Check, 
  ExternalLink, 
  Terminal, 
  Layers, 
  Sparkles, 
  BookOpen, 
  KeyRound,
  FileCode,
  Zap
} from "lucide-react";
import { BytherixEAMLogo } from "./BytherixEAMLogo";

interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  scopes: string;
  is_revoked: boolean;
}

interface DeveloperApiPortalProps {
  apiKeys: ApiKeyItem[];
  token: string | null;
  createdRawKey: string | null;
}

type Language = "curl" | "python" | "typescript";
type EndpointKey = "chat" | "dlp_scan" | "documents" | "usage" | "models";

interface EndpointMeta {
  key: EndpointKey;
  method: "POST" | "GET";
  path: string;
  title: string;
  description: string;
  category: string;
  badge: string;
}

const ENDPOINTS: EndpointMeta[] = [
  {
    key: "chat",
    method: "POST",
    path: "/api/v1/chat",
    title: "Grounded Knowledge RAG QA",
    description: "Hybrid vector + lexical document QA with DLP Shield PII redaction and real-time RAG Triad faithfulness scoring.",
    category: "AI & Retrieval",
    badge: "SOC 2 Grounded"
  },
  {
    key: "dlp_scan",
    method: "POST",
    path: "/api/v1/security/dlp/scan",
    title: "Zero-Leak DLP Shield Scanner",
    description: "Pre-LLM security interception that redacts API keys, card numbers (Luhn), DB URIs, passwords, and PII.",
    category: "Security & DLP",
    badge: "8 Rule Engines"
  },
  {
    key: "documents",
    method: "GET",
    path: "/api/v1/documents",
    title: "Document Ingestion Catalogue",
    description: "List uploaded knowledge documents, indexing lifecycle statuses, page counts, and pgvector chunk stats.",
    category: "Enterprise Ingestion",
    badge: "pgvector"
  },
  {
    key: "usage",
    method: "GET",
    path: "/api/v1/usage",
    title: "Usage Metering & Quotas",
    description: "Real-time organization token consumption, document limits, and quota enforcement boundary metrics.",
    category: "Metering & SaaS",
    badge: "Usage Bounds"
  },
  {
    key: "models",
    method: "GET",
    path: "/api/v1/models",
    title: "MLOps Model Governance Registry",
    description: "Registered machine-learning models, version lineages, staging promotion gates, and evaluation stats.",
    category: "MLOps & Governance",
    badge: "MLflow Lineage"
  }
];

export const DeveloperApiPortal: React.FC<DeveloperApiPortalProps> = ({
  apiKeys,
  token,
  createdRawKey
}) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointKey>("chat");
  const [selectedLang, setSelectedLang] = useState<Language>("curl");
  const [authMode, setAuthMode] = useState<"apikey" | "bearer">("apikey");
  const [copied, setCopied] = useState(false);

  // Active key or fallback placeholder
  const activeKeyPlaceholder = authMode === "bearer" && token
    ? `Bearer ${token.slice(0, 24)}...`
    : (createdRawKey 
        ? createdRawKey 
        : (apiKeys.find(k => !k.is_revoked)?.prefix ? `${apiKeys.find(k => !k.is_revoked)?.prefix}...` : "bx_live_your_api_key_here"));

  const authHeaderName = authMode === "bearer" ? "Authorization" : "X-API-Key";

  const endpoint = ENDPOINTS.find(e => e.key === selectedEndpoint) || ENDPOINTS[0];
  const apiBase = "http://localhost:8000";

  // Generate runnable code snippets
  const getSnippet = (): string => {
    switch (selectedEndpoint) {
      case "chat":
        if (selectedLang === "curl") {
          return `curl -X POST "${apiBase}/api/v1/chat" \\
  -H "Content-Type: application/json" \\
  -H "${authHeaderName}: ${activeKeyPlaceholder}" \\
  -d '{
    "question": "What are the core technical requirements for Bytherix EAM?",
    "top_k": 3
  }'`;
        } else if (selectedLang === "python") {
          return `import requests

url = "${apiBase}/api/v1/chat"
headers = {
    "Content-Type": "application/json",
    authHeaderName: activeKeyPlaceholder
}
payload = {
    "question": "What are the core technical requirements for Bytherix EAM?",
    "top_k": 3
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()

print("Answer:", data.get("answer"))
print("Grounding Score:", data.get("rag_evaluation", {}).get("faithfulness_score"))
print("DLP Interceptions:", data.get("dlp_shield", {}).get("entities_detected"))`;
        } else {
          return `import fetch from 'node-fetch';

const response = await fetch("${apiBase}/api/v1/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    authHeaderName: activeKeyPlaceholder
  },
  body: JSON.stringify({
    question: "What are the core technical requirements for Bytherix EAM?",
    top_k: 3
  })
});

const data = await response.json();
console.log("Grounded Answer:", data.answer);
console.log("RAG Triad Faithfulness:", data.rag_evaluation?.faithfulness_score);`;
        }

      case "dlp_scan":
        if (selectedLang === "curl") {
          return `curl -X POST "${apiBase}/api/v1/security/dlp/scan" \\
  -H "Content-Type: application/json" \\
  -H "${authHeaderName}: ${activeKeyPlaceholder}" \\
  -d '{
    "text": "OpenAI key sk-live9876543210abcdef9876543210 and internal db postgresql://admin:pass@db.bytherix.net:5432/core"
  }'`;
        } else if (selectedLang === "python") {
          return `import requests

url = "${apiBase}/api/v1/security/dlp/scan"
headers = {
    "Content-Type": "application/json",
    authHeaderName: activeKeyPlaceholder
}
payload = {
    "text": "AWS key AKIAIOSFODNN7EXAMPLE and card 4532 0151 1283 0366"
}

res = requests.post(url, json=payload, headers=headers)
result = res.json()

print("Sanitized Text:", result.get("masked_text"))
print("Redacted Entities:", result.get("entities_detected"))`;
        } else {
          return `const res = await fetch("${apiBase}/api/v1/security/dlp/scan", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    authHeaderName: activeKeyPlaceholder
  },
  body: JSON.stringify({
    text: "Contact devops@bytherix.com or verify API key sk-live9876543210abcdef9876543210"
  })
});

const { masked_text, entities_detected } = await res.json();
console.log("Safe Prompt:", masked_text);`;
        }

      case "documents":
        if (selectedLang === "curl") {
          return `curl -X GET "${apiBase}/api/v1/documents" \\
  -H "${authHeaderName}: ${activeKeyPlaceholder}"`;
        } else if (selectedLang === "python") {
          return `import requests

res = requests.get(
    "${apiBase}/api/v1/documents",
    headers={authHeaderName: activeKeyPlaceholder}
)
documents = res.json()
for doc in documents:
    print(f"[{doc['status']}] {doc['title']} ({doc['page_count']} pages)")`;
        } else {
          return `const res = await fetch("${apiBase}/api/v1/documents", {
  headers: { authHeaderName: activeKeyPlaceholder }
});
const docs = await res.json();
console.log("Documents Ingested:", docs.length);`;
        }

      case "usage":
        if (selectedLang === "curl") {
          return `curl -X GET "${apiBase}/api/v1/usage" \\
  -H "${authHeaderName}: ${activeKeyPlaceholder}"`;
        } else if (selectedLang === "python") {
          return `import requests

res = requests.get(
    "${apiBase}/api/v1/usage",
    headers={authHeaderName: activeKeyPlaceholder}
)
usage = res.json()
print("RAG Tokens Consumed:", usage.get("tokens_consumed"))
print("Monthly Limit:", usage.get("monthly_token_limit"))`;
        } else {
          return `const res = await fetch("${apiBase}/api/v1/usage", {
  headers: { authHeaderName: activeKeyPlaceholder }
});
const usage = await res.json();
console.log("Usage Summary:", usage);`;
        }

      case "models":
        if (selectedLang === "curl") {
          return `curl -X GET "${apiBase}/api/v1/models" \\
  -H "${authHeaderName}: ${activeKeyPlaceholder}"`;
        } else if (selectedLang === "python") {
          return `import requests

res = requests.get(
    "${apiBase}/api/v1/models",
    headers={authHeaderName: activeKeyPlaceholder}
)
models = res.json()
for m in models:
    print(f"Model {m['name']} (v{m['version']}) -> State: {m['lifecycle_state']}")`;
        } else {
          return `const res = await fetch("${apiBase}/api/v1/models", {
  headers: { authHeaderName: activeKeyPlaceholder }
});
const models = await res.json();
console.log("ML Models in Registry:", models);`;
        }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card-depth-3d p-6 space-y-6 border-indigo-500/20 bg-gradient-to-br from-slate-900/60 via-slate-900/30 to-indigo-950/20">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200/60 dark:border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 p-2 shrink-0">
            <BytherixEAMLogo className="w-full h-full text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                Developer API Portal & SDK Hub
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                OpenAPI 3.1
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Automate enterprise knowledge retrieval, DLP redactions, and MLOps lifecycle from your CLI or pipelines.
            </p>
          </div>
        </div>

        {/* Action Buttons for Swagger and ReDoc */}
        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href="http://localhost:8000/api/v1/redoc"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-white/10 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>ReDoc Spec</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>

          <a
            href="http://localhost:8000/api/v1/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Launch Branded Swagger Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Main Grid: Endpoint Selector & Interactive Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Endpoints Menu */}
        <div className="lg:col-span-5 space-y-2">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Core API Endpoints</span>
            </span>
            <span className="text-[10px] text-slate-400">Click to load code</span>
          </div>

          <div className="space-y-1.5">
            {ENDPOINTS.map((e) => {
              const isSelected = selectedEndpoint === e.key;
              return (
                <button
                  key={e.key}
                  onClick={() => setSelectedEndpoint(e.key)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                    isSelected
                      ? "bg-indigo-600/15 border-indigo-500/40 shadow-sm shadow-indigo-500/10 text-slate-900 dark:text-white"
                      : "bg-slate-100/60 dark:bg-white/[0.02] border-slate-200/70 dark:border-white/[0.06] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] font-extrabold px-2 py-0.5 rounded ${
                      e.method === "POST"
                        ? "bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30"
                        : "bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/30"
                    }`}
                  >
                    {e.method}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold truncate text-slate-900 dark:text-white">
                        {e.title}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 shrink-0">
                        {e.badge}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 truncate mt-0.5">
                      {e.path}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Authentication Mode Selector Box */}
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                <span>Authentication Header</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-black/60 p-0.5 rounded-lg border border-slate-300/50 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setAuthMode("apikey")}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${authMode === "apikey" ? "bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-700 dark:hover:text-white"}`}
                >
                  X-API-Key
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("bearer")}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${authMode === "bearer" ? "bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-700 dark:hover:text-white"}`}
                >
                  Bearer JWT
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Using <code className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">{authHeaderName}</code> in code snippets above. Machine keys bypass user sessions for microservices and CLI.
            </p>
          </div>
        </div>

        {/* Right Column: Code Snippet Viewer */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          {/* Language Switcher Tabs */}
          <div className="flex items-center justify-between bg-slate-200/80 dark:bg-black/50 p-1 rounded-xl border border-slate-300/60 dark:border-white/10">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedLang("curl")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedLang === "curl"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                <span>cURL</span>
              </button>
              <button
                onClick={() => setSelectedLang("python")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedLang === "python"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-blue-500" />
                <span>Python</span>
              </button>
              <button
                onClick={() => setSelectedLang("typescript")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedLang === "typescript"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>TypeScript</span>
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-500/20 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy Code"}</span>
            </button>
          </div>

          {/* Code Window */}
          <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-slate-200 overflow-x-auto shadow-inner flex-1 min-h-[260px]">
            <div className="flex items-center justify-between text-[10px] text-slate-500 pb-2 mb-3 border-b border-slate-800/80">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
                <span className="font-sans font-medium text-slate-400 ml-1">{endpoint.title}</span>
              </span>
              <span>{selectedLang.toUpperCase()}</span>
            </div>
            <pre className="text-slate-300 leading-relaxed selection:bg-indigo-500/40 selection:text-white whitespace-pre-wrap">
              {getSnippet()}
            </pre>
          </div>

          {/* Endpoint Details Card */}
          <div className="p-3.5 rounded-xl bg-slate-100/60 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] text-xs flex items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-900 dark:text-white">{endpoint.title}</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{endpoint.description}</p>
            </div>
            <a
              href={`http://localhost:8000/api/v1/docs#/${endpoint.category}/${endpoint.method.toLowerCase()}_${endpoint.path.replace(/\//g, "_")}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Swagger Spec</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
