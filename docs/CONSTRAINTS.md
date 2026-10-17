# Project constraints

- Backend API routes currently have no user authentication or per-document authorization. Do not treat CORS or the Gemini quota as access control; do not expose this demo as a multi-tenant service without an explicit auth/data-isolation design.
- Gemini API keys and other provider secrets stay on the backend. `VITE_*` values are public build-time configuration, never secrets.
- Production frontend builds require an absolute `VITE_API_BASE_URL`. Production backend startup requires explicit `APP_ENV=production` and exact `CORS_ORIGINS`.
- CORS does not use wildcards or credentials. Do not trust arbitrary forwarded client-IP headers for rate-limit identity.
- The Gemini quota is eight requests per observed IP in a sliding 30-minute window. It is abuse friction for a demo, not identity, billing, or a distributed denial-of-service defense.
- The quota is shared only by workers using the same SQLite file. Do not claim cross-host enforcement without a shared store.
- Retrieved files and conversation/user text are untrusted. Runtime tools remain a fixed allowlisted deterministic registry; model-generated text does not authorize actions.
- Keep `backend/.env`, local databases, uploaded documents, and vector artifacts out of version control. Example files must contain placeholders only.
- Do not commit, push, deploy, alter production infrastructure, or remove user data without explicit approval.
