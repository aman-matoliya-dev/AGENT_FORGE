# Architecture

## Request path

- React/Vite pages call the typed API client in `src/utils/api.ts`.
- FastAPI in `backend/app/main.py` mounts agent, saved-agent, and knowledge routers.
- `POST /api/agent/run` validates an `AgentRequest` and `AgentConfig`, rate-limits Gemini, records execution metadata, and calls `Agent.run_with_metadata`.
- The agent runs supported deterministic tools before calling Gemini or Ollama. Conversation memory is a bounded in-process dictionary.
- RAG uses `KnowledgeService` to embed the query through Gemini, search local vectors, and attach relevant excerpts and source metadata.
- Gemini receives application policy through `system_instruction`; Ollama receives a `system` message. Profile, conversation, user, tool-status, and retrieved content is sent as user content.

## Persistence and integrations

- SQLite at `backend/agent_forge.db` stores saved agents, execution/tool history, and timestamped Gemini quota events.
- Knowledge files, metadata, chunks, and vectors are stored under `backend/data/knowledge/` as local files and JSON. Embedding calls use Google's API.
- Gemini is the remote generation/embedding provider; Ollama is called at the configured backend URL (default `127.0.0.1:11434`).
- Conversation memory is process-local and resets on restart.

## Trust boundaries

Browser input, saved agent settings, conversation history, and uploaded/retrieved document text are untrusted. CORS is a browser policy, not API authorization. Tool permissions come from the runtime's fixed registry and execution path, not from retrieved text or model output.
