# Assumptions and unverified items

- The SQLite database file is local and shared by all worker processes that need the same quota. Multi-host coordination is not provided.
- `request.client.host` is usable as the client identity only when the ASGI server's proxy trust configuration is correct. The route does not parse forwarded headers itself; trusted ASGI proxy middleware may populate this field.
- The API has no authentication or owner boundaries. It is assumed to remain a demo/trusted deployment until that is addressed.
- Provider role separation is supported by current Gemini and Ollama request interfaces, but it cannot guarantee resistance to all prompt injection.
- Production hostnames, TLS termination, hosting provider, data-retention obligations, and backup/restore procedures are not known or verified.
- No live provider, production deployment, comprehensive PDF, accessibility, or load test was performed.
- AI model identity: unknown. Execution environment: Copilot SDK in VS Code.
