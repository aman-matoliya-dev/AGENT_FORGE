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

## Deployment configuration

Development defaults to the Vite origins on ports 5173 and 5174. In production,
set `APP_ENV=production` and `CORS_ORIGINS` to a comma-separated list of exact
frontend origins (scheme, hostname, and optional port only). Wildcards and
credentials are not enabled. The frontend must be built with an absolute
`VITE_API_BASE_URL`; see the repository-root `.env.example`.

Gemini demo requests are limited to eight per server-observed client IP per
sliding 30-minute window. Quota events are stored in `agent_forge.db`, shared by
workers using that same SQLite file. The route reads the ASGI connection client
address and does not parse forwarding headers itself. If deployed behind a proxy,
configure the ASGI server to trust only the actual proxy addresses so the client
address is meaningful.

The model receives fixed application policy through a system-instruction field.
Agent settings, user input, conversation history, tool status, and retrieved
knowledge remain in user content. This is a defense-in-depth measure, not a
guarantee against prompt injection. Runtime tools are executed before the
provider call from the validated request; retrieved content cannot invoke them.