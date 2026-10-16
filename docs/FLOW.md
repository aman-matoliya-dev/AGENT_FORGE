# Agent request flow

1. The builder in `src/pages/Builder.tsx` calls `runAgent` from `src/utils/api.ts`, which sends JSON to `POST /api/agent/run`.
2. FastAPI validates the body. For Gemini, `request.client.host` is used as the quota key; the route does not parse client cookies or forwarding headers. An ASGI server may populate the client address from a trusted proxy, so deployment proxy trust must be restricted. SQLite serializes quota checks in a write transaction.
3. The route starts an execution-history record and constructs `Agent` from the validated config.
4. `Agent._prepare_request` runs only configured deterministic tools against the current user message, reads bounded conversation history, and optionally retrieves bounded relevant chunks.
5. Fixed policy is sent through Gemini's `system_instruction` or Ollama's `system` role. User-controlled agent settings, conversation history, runtime status, retrieved excerpts, and the current request stay in user content.
6. The selected provider generates a response. The route stores success/failure metadata and returns the response, tool metadata, and knowledge citations.

Provider failures are mapped to a generic 502 response and safe execution-history summary. Knowledge retrieval failures are reported as a generic metadata flag/message rather than exposing provider diagnostics.
