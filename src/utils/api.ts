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

export interface KnowledgeSource {
  documentId?: string;
  chunkId?: string;
  filename: string;
  page?: number;
  score?: number;
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

  const response = await fetch(`${API_BASE_URL}/api/knowledge/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || 'Knowledge upload failed');
  }

  return response.json();
}

export async function listKnowledgeDocuments(): Promise<{ success: boolean; documents: KnowledgeDocument[] }> {
  const response = await fetch(`${API_BASE_URL}/api/knowledge/documents`);
  if (!response.ok) {
    throw new Error('Failed to load knowledge documents');
  }
  return response.json();
}

export async function searchKnowledge(query: string, topK = 5): Promise<{ success: boolean; query: string; results: KnowledgeSearchResult[] }> {
  const response = await fetch(`${API_BASE_URL}/api/knowledge/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, topK }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || 'Knowledge search failed');
  }

  return response.json();
}

export async function deleteKnowledgeDocument(documentId: string) {
  const response = await fetch(`${API_BASE_URL}/api/knowledge/documents/${documentId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || 'Knowledge document deletion failed');
  }

  return response.json();
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
  const response = await fetch(`${API_BASE_URL}/api/agent/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Agent request failed"
    );
  }

  return response.json();
}