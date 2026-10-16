# Decision log

## 2026-10-16 — Persist Gemini quota by observed client IP

The old cookie identifier could be freely rotated and the process-local counter reset at restart or differ across workers. The quota now uses the connection client IP and SQLite `BEGIN IMMEDIATE` transactions. This reuses existing persistence and needs no dependency. Alternatives are account authentication or a shared Redis/database service; those provide stronger identity or multi-host coordination but require architecture and deployment decisions. SQLite is appropriate only for workers sharing one file.

## 2026-10-16 — Separate policy from untrusted model input

Fixed policy now uses provider system-instruction channels; profile values, user/history text, tool status, and retrieved knowledge remain in user content. Delimiters alone were rejected as a security boundary. This improves role separation but cannot guarantee that a model will resist prompt injection. Actual tool authority remains in deterministic server code.

## 2026-10-16 — Fail closed for production URLs and CORS

The browser no longer falls back to localhost in production, and the backend requires exact production CORS origins. A dev-only localhost default is retained. Wildcards and credentialed CORS were rejected because deployment origins should be explicit; no hosting URL is assumed.

## Verification approach

Security boundaries use mocked providers and local SQLite tests. No project content is sent to external services by the regression tests; no live Gemini/Ollama call is required.
