## Agent runtime

`POST /api/agent/run` accepts a nested, validated builder contract:

```json
{
  "message": "What time is it?",
  "config": {
    "name": "Clockwise",
    "purpose": "Answer time questions",
    "personality": "concise and friendly",
    "provider": "gemini",
    "model": "gemini-3.6-flash",
    "agentType": "general",
    "tools": ["datetime"],
    "memory": "buffer",
    "knowledge": "none",
    "outputStyle": "concise"
  }
}
```

Only Gemini and Ollama are live providers. Gemini models are allowlisted and
Ollama receives the selected model tag. Calculator and date-time are
deterministic safe tools. Notes, web search, and persistent memory are
currently unavailable and are explicitly reported rather than simulated.
RAG is supported for agents configured with knowledge mode `rag`, using the
knowledge endpoints:

- `POST /api/knowledge/upload`
- `GET /api/knowledge/documents`
- `POST /api/knowledge/search`
- `DELETE /api/knowledge/documents/{document_id}`
- `GET /api/knowledge/status`

Uploaded document text and search queries are sent to Google's embedding API.
`agentType` is metadata; analytics remain separate from runtime capabilities.