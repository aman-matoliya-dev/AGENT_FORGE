# Handover — 2026-10-16

## Repository state

- Latest verified commit: `e6fcb7e` (`Initialize README.md with project details`). At inspection, `HEAD`, `origin/main`, `main`, and `backup/pre-public-email-cleanup` referenced this commit.
- Current branch: `agents/pasted-text-processing`. No upstream is configured for this branch.
- The worktree was clean before the task. Current changes are uncommitted and unstaged; there are no user edits from the initial state to preserve.
- No commit, push, deployment, or production change was made.

## Completed

1. Replaced Gemini's freely rotatable, process-local session-cookie quota with eight requests per observed client IP in a sliding 30-minute window. SQLite `BEGIN IMMEDIATE` serializes checks and persists across restarts/workers sharing the same database file. Cookie and client-supplied forwarding-header rotation regression-tested.
2. Moved fixed application policy into Gemini's system-instruction field and Ollama's system role. Agent settings, user input, conversation history, tool status, and retrieved knowledge remain in user content. Server code still runs the fixed tool registry before provider calls; no model-generated tool dispatch was added.
3. Production frontend builds now require a valid absolute HTTP(S) `VITE_API_BASE_URL`; development retains its localhost default. Production backend configuration requires `APP_ENV=production` and specific `CORS_ORIGINS`, with no wildcard origins or credentialed CORS.
4. Added focused regression tests and this compact documentation set.

## Verification results

- From `backend/`: `python -m unittest discover -p "test*.py"` — **52 tests passed**.
- From repository root: `npx tsc --noEmit` — **passed**.
- With `VITE_API_BASE_URL=https://api.example.invalid`: `npm run build` — **passed**, 2,339 modules; generated `dist/index.html` 1,635.44 kB (449.10 kB gzip).
- Production build with `VITE_API_BASE_URL` unset — **expected failure**, clear `VITE_API_BASE_URL must be set for production builds.` message.
- Production build with `VITE_API_BASE_URL=ftp://example.invalid` — **expected failure**, clear absolute HTTP(S) URL message.
- `git diff --check` — **passed** on the final worktree, including this handover.
- `npm ci` restored existing lockfile dependencies (no manifest changes). It reported **3 high severity vulnerabilities**; details were not audited or fixed as part of this scoped change.
- The backend emitted expected error logs during tests that deliberately simulate provider and corrupted-index failures; the suite still passed.

## Findings and limitations

- **Confirmed and fixed:** the old quota trusted an arbitrary session cookie and process-local storage, so callers could rotate cookie IDs; restarts and separate workers did not share counts.
- **Confirmed and fixed:** a production frontend could silently target each visitor's localhost, and backend CORS was hardcoded to development origins.
- **Confirmed weakness, mitigated but not eliminated:** policy, user-controlled profile text, and retrieved text previously shared one provider user message. Role separation improves the trust boundary, but prompt injection cannot be ruled out. Current tools are deterministic and server-executed; retrieved/model text cannot grant them.
- **Still exposed:** API routes have no authentication or per-user data ownership. Any reachable caller may access saved-agent, run-history, and shared knowledge endpoints. CORS is not authorization.
- **Quota limits:** IP identity is not a durable user identity and can be evaded by distributed clients or network changes. Trusted reverse-proxy configuration is required for meaningful `request.client.host` values. SQLite coordination is limited to processes sharing one local database file.
- Rate events contain raw client IPs and expired rows are removed on a later Gemini request, not by a scheduled cleanup process.
- Provider calls were mocked; no live Gemini/Ollama, real deployment, comprehensive PDF extraction, automated accessibility, multi-host storage, or load test was performed.
- npm's 3 high-severity audit summary is unverified; use a separate dependency audit/remediation task before public deployment.

## Data and failure model

- Run/history/saved-agent/quota state: `backend/agent_forge.db` (SQLite).
- Knowledge artifacts: `backend/data/knowledge/` (local documents and JSON metadata/chunks/vectors); embeddings use Google's API.
- Conversation memory: bounded process-local dictionary, lost on restart.
- Quota DB errors fail the request rather than allowing a request. There is no dedicated quota alerting. Monitor backend logs and SQLite health.

## Rollback and protected areas

Review `git status -sb` and `git diff` first. If rolling back, restore only this task's reviewed tracked paths and remove only its new untracked `.env.example`, tests, and `docs/` files; preserve any later user edits. Do not use a broad reset or delete local databases, uploaded documents, or secrets. The added SQLite table is additive and can safely remain.

Do not touch `backend/.env`, `backend/agent_forge.db`, or `backend/data/knowledge/` during routine rollback or documentation work. Do not expose the API as a public multi-tenant service based solely on this quota/CORS hardening.

## Exact next task

Design and implement authentication plus per-owner authorization and knowledge isolation for the currently unauthenticated API before any public multi-tenant deployment. First decide the identity provider and ownership/data migration strategy; do not improvise a production auth architecture in this handover.

## AI identity

AI model identity: unknown. Tool environment: Copilot SDK in VS Code.
