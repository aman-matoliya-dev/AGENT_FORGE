# Alternatives considered

- **Gemini quota:** account/session authentication or a shared Redis/managed database would provide stronger identity and multi-host coordination. They require identity, infrastructure, secret, and operational decisions not present in this demo. Existing SQLite is the smallest additive option for a single shared database file, with IP-based limitations documented.
- **RAG prompt handling:** text delimiters within one prompt were already used but do not create a trust boundary. New orchestration frameworks or content filtering would add complexity without guaranteeing model safety. Provider system-role separation was chosen as a low-dependency defense-in-depth measure; server-side tool authorization remains mandatory.
- **Production routing:** silently using localhost or wildcard CORS was rejected. Explicit build-time API URL and exact CORS origin lists are required; this makes deployment configuration an intentional step.
