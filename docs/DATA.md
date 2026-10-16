# Data and persistence

| Data | Location | Lifetime / notes |
|---|---|---|
| Saved agent configs, run/tool history, Gemini quota events | `backend/agent_forge.db` (SQLite) | Local persistent file. Quota events store raw server-observed client IP and timestamps; expired rows are pruned on later Gemini requests. |
| Uploaded document bytes, metadata, chunks, vectors, index | `backend/data/knowledge/` | Local files/JSON. Uploaded text and search queries are sent to Google's embedding API. |
| Conversation messages | Process memory (`backend/app/services/memory.py`) | Bounded per conversation; lost on process restart. |
| Provider credentials | Backend environment / `backend/.env` | Secret; never put in frontend variables or commit. |
| API base URL and CORS origins | `VITE_API_BASE_URL`, `APP_ENV`, `CORS_ORIGINS` | Public/non-secret deployment configuration. |

SQLite rate-limit rows retain IP addresses only as needed for the sliding-window decision, but cleanup is request-driven rather than scheduled. Treat the database as sensitive and restrict filesystem access.

SQLite is reused because the application already persists run and saved-agent data there. `BEGIN IMMEDIATE` serializes quota checks across workers sharing the same local database file; it is not a multi-host rate-limit service.
