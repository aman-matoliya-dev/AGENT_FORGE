# Threat model notes

## Unauthenticated public paths

Agent, history, saved-agent, and knowledge endpoints do not currently authenticate callers. A malicious caller may consume provider quota, upload/search/delete knowledge, or read stored data. The Gemini IP quota reduces simple cookie rotation but is not authorization and can be bypassed with distributed clients or network changes. Do not expose as a multi-tenant service before adding authentication, authorization, and per-owner storage.

## Prompt injection and tools

Uploaded/retrieved text and user-controlled profile settings are sent as untrusted user content, separate from fixed provider system instructions. This is defense in depth; model behavior remains probabilistic. The current runtime executes only fixed deterministic calculator/date tools before the provider call and does not dispatch model-generated tool calls. Keep authorization checks in server code if future tools have side effects.

## Deployment

Production CORS requires specific origins and does not allow credentials. CORS does not block non-browser clients. Backend secrets must never enter Vite configuration. Use HTTPS and configure trusted proxy addresses before relying on a proxy-observed client IP.
