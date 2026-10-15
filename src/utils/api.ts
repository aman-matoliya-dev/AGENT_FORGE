// const API_BASE_URL = "http://127.0.0.1:8000";

// export async function testBackend() {
//   const response = await fetch(`${API_BASE_URL}/api/test`);

//   if (!response.ok) {
//     throw new Error("Backend request failed");
//   }

//   return response.json();
// }


// export interface AgentRequest {
//   message: string;
//   name?: string;
//   personality?: string;
// }


// export interface AgentResponse {
//   success: boolean;
//   agent: string;
//   response: string;
// }


// export async function runAgent(
//   request: AgentRequest
// ): Promise<AgentResponse> {
//   const response = await fetch(`${API_BASE_URL}/api/agent/run`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(request),
//   });

//   if (!response.ok) {
//     const errorData = await response.json().catch(() => null);

//     throw new Error(
//       errorData?.detail || "Agent request failed"
//     );
//   }

//   return response.json();
// }













// In production this MUST be set via VITE_API_BASE_URL at build time, pointing to
// the deployed backend. Without it, a production build silently falls back to
// localhost:8000 and every real visitor's browser tries (and fails) to reach
// their OWN machine instead of your server.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function testBackend() {
  const response = await fetch(`${API_BASE_URL}/api/test`);

  if (!response.ok) {
    throw new Error("Backend request failed");
  }

  return response.json();
}


export interface AgentRequest {
  message: string;
  config: AgentConfig;
  conversationId?: string;
}

export interface AgentConfig {
  name: string;
  purpose?: string;
  personality?: string;
  provider: "gemini" | "ollama";
  model?: string;
  agentType?: string;
  tools?: string[];
  memory?: "buffer" | "window" | "summary";
  knowledge?: "none" | "rag";
  outputStyle?: "concise" | "detailed" | "steps";
}

export interface AgentResponse {
  success: boolean;
  agent: string;
  response: string;
  config?: AgentConfig;
  unavailable?: string[];
  conversationId?: string;
  provider?: string;
  model?: string;
  toolsUsed?: string[];
  memory?: string;
  metadata?: {
    provider: string;
    model: string;
    conversationId: string;
    toolsUsed: string[];
    memory: string;
    knowledge: string;
    knowledgeUsed: boolean;
    sources: KnowledgeSource[];
    knowledgeError?: string;
    agentType: string;
  };
  knowledge?: "none" | "rag";
  knowledgeUsed?: boolean;
  sources?: KnowledgeSource[];
}

export interface ExecutionRun {
  runId: number;
  agentName: string;
  createdAt: string;
  completedAt: string | null;
  status: "running" | "succeeded" | "failed";
  provider: string;
  model: string | null;
  durationMs: number | null;
  resultSummary: string | null;
  errorSummary: string | null;
  toolsUsed: string[];
  messageLength: number;
}

export interface ExecutionRunList {
  success: boolean;
  runs: ExecutionRun[];
  limit: number;
  offset: number;
  hasMore: boolean;
}

export async function listExecutionRuns(limit = 25, offset = 0): Promise<ExecutionRunList> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return requestJson<ExecutionRunList>(`/api/agent/runs?${params}`, "Failed to load execution history.");
}

export async function getExecutionRun(runId: number): Promise<ExecutionRun> {
  const data = await requestJson<{ success: boolean; run: ExecutionRun }>(`/api/agent/runs/${runId}`, "Failed to load execution details.");
  return data.run;
}

export interface KnowledgeSource {
  documentId?: string;
  chunkId?: string;
  filename: string;
  page?: number;
  score?: number;
}

export interface SavedAgent {
  id: string;
  name: string;
  description: string;
  purpose: string;
  personality: string;
  provider: "gemini" | "ollama";
  model: string | null;
  agentType: string;
  tools: string[];
  memory: "none" | "buffer" | "window" | "summary";
  knowledge: "none" | "rag";
  outputStyle: "concise" | "detailed" | "steps";
  createdAt: string;
  updatedAt: string;
}

export type SavedAgentInput = Omit<SavedAgent, "id" | "createdAt" | "updatedAt">;
export type SavedAgentUpdate = Partial<SavedAgentInput>;

async function apiError(response: Response, fallback: string): Promise<Error> {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return new Error(data.detail);
  } catch {
    // Non-JSON error bodies use the caller's fallback.
  }
  return new Error(fallback);
}

async function requestJson<T>(path: string, fallback: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) throw await apiError(response, fallback);
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function listSavedAgents(): Promise<SavedAgent[]> {
  const data = await requestJson<{ success: boolean; agents: SavedAgent[] }>("/api/agents", "Failed to load saved agents.");
  return data.agents;
}

export async function getSavedAgent(agentId: string): Promise<SavedAgent> {
  const data = await requestJson<{ success: boolean; agent: SavedAgent }>(`/api/agents/${encodeURIComponent(agentId)}`, "Failed to load this agent.");
  return data.agent;
}

export async function createSavedAgent(agent: SavedAgentInput): Promise<SavedAgent> {
  const data = await requestJson<{ success: boolean; agent: SavedAgent }>("/api/agents", "Failed to save agent.", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(agent),
  });
  return data.agent;
}

export async function updateSavedAgent(agentId: string, changes: SavedAgentUpdate): Promise<SavedAgent> {
  const data = await requestJson<{ success: boolean; agent: SavedAgent }>(`/api/agents/${encodeURIComponent(agentId)}`, "Failed to update agent.", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
  return data.agent;
}

export async function deleteSavedAgent(agentId: string): Promise<void> {
  await requestJson<void>(`/api/agents/${encodeURIComponent(agentId)}`, "Failed to delete agent.", {
    method: "DELETE",
  });
}

export interface KnowledgeDocument {
  documentId: string;
  filename: string;
  fileType: string;
  size: number;
  chunkCount: number;
  status: string;
  createdAt?: string;
}

export interface KnowledgeSearchResult {
  documentId: string;
  chunkId: string;
  filename: string;
  page?: number;
  score: number;
  text: string;
}

export async function uploadKnowledgeDocument(file: File) {
  const formData = new FormData();
  formData.append('file', file, file.name);

  return requestJson<{ success: boolean; document: { documentId: string; filename: string; fileType: string; size: number; chunkCount: number; status: string } }>(
    '/api/knowledge/upload',
    'Knowledge upload failed',
    {
      method: 'POST',
      body: formData,
    },
  );
}

export async function listKnowledgeDocuments(): Promise<{ success: boolean; documents: KnowledgeDocument[] }> {
  const response = await fetch(`${API_BASE_URL}/api/knowledge/documents`);
  if (!response.ok) {
    throw new Error('Failed to load knowledge documents');
  }
  return response.json();
}

export async function searchKnowledge(query: string, topK = 5): Promise<{ success: boolean; query: string; results: KnowledgeSearchResult[] }> {
  return requestJson<{ success: boolean; query: string; results: KnowledgeSearchResult[] }>(
    '/api/knowledge/search',
    'Knowledge search failed',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, topK }),
    },
  );
}

export async function deleteKnowledgeDocument(documentId: string) {
  return requestJson<{ success: boolean; documentId: string; deleted: boolean }>(
    `/api/knowledge/documents/${documentId}`,
    'Knowledge document deletion failed',
    {
      method: 'DELETE',
    },
  );
}

export async function getKnowledgeStatus(): Promise<{ success: boolean; documents: number; chunks: number; vectorStore: string; embeddingConfigured: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/knowledge/status`);
  if (!response.ok) {
    throw new Error('Failed to load knowledge status');
  }
  return response.json();
}

export async function runAgent(
  request: AgentRequest
): Promise<AgentResponse> {
  return requestJson<AgentResponse>("/api/agent/run", "Agent request failed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
}