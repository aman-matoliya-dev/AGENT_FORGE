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
sliding 30-minute window. Quota events use the configured relational database;
PostgreSQL deployments serialize per-IP updates with transaction-scoped advisory
locks. The route reads the ASGI connection client address and does not parse
forwarding headers itself. If deployed behind a proxy, configure the ASGI server
to trust only the actual proxy addresses so the client address is meaningful.

The model receives fixed application policy through a system-instruction field.
Agent settings, user input, conversation history, tool status, and retrieved
knowledge remain in user content. This is a defense-in-depth measure, not a
guarantee against prompt injection. Runtime tools are executed before the
provider call from the validated request; retrieved content cannot invoke them.

## Database foundation and migration

The backend uses one SQLAlchemy database layer for SQLite and PostgreSQL. When
`DATABASE_URL` is unset, local development uses `backend/agent_forge.db`.
For team deployment, set `DATABASE_URL` to a PostgreSQL URL using the psycopg
driver, for example:

```text
postgresql+psycopg://<user>:<password>@<host>:5432/<database>
```

Supply the real value through a secret environment or deployment secret store;
do not place production credentials in `.env.example` or commit them. Install
backend dependencies with `python -m pip install -r requirements.txt`.

The versioned schema currently includes the existing run, tool, saved-agent,
and rate-limit tables; `users`, `sessions`, `audit_logs`, and one-time
`bootstrap_state`; and nullable `owner_id` foreign keys on existing runs, tool
events, and saved agents. Schema version 1 preserves and extends legacy
execution history. Version 2 adds the account/session foundation and ownership
columns. Migrations are additive and transactional; there is intentionally no
destructive down migration.

Check or apply migrations from the `backend` directory:

```powershell
python -m app.services.migrations version
python -m app.services.migrations upgrade
```

Development startup applies pending migrations. Production startup only checks
the schema version and refuses to start if it is behind; apply migrations as
an explicit deployment step after an approved backup. This phase has not
applied a production migration.

After migrating an empty/new deployment, create the initial administrator
using the controlled, server-side prompt:

```powershell
python -m app.bootstrap_admin
```

The password is entered through a masked prompt and hashed using Argon2id. The
command can create the primary admin only once and does not expose an HTTP
administrator-registration endpoint. Public account registration and
authentication routes are not part of this data-foundation phase.

When the bootstrap runs against a legacy database, it assigns existing
ownerless `agent_runs`, `tool_runs`, and `saved_agents` rows to the primary
administrator in one database transaction. Existing knowledge documents are
assigned in the JSON index and each document's metadata file using atomic file
replacements; existing owner assignments are preserved. Bootstrap records
completion markers so later runs do not claim newly-created ownerless rows.
If knowledge-file migration fails after database ownership is committed, the
command reports the partial state; rerun it with the same admin email and
password to resume. Do not expose a partially upgraded deployment before the
later authentication and authorization phases are complete.

### Backup and rollback

Before migration, take a consistent database backup and back up the
`backend/data/knowledge` directory. For a local SQLite database, use SQLite's
backup API from the `backend` directory:

```powershell
python -c "import sqlite3; source=sqlite3.connect('agent_forge.db'); target=sqlite3.connect('agent_forge.before-auth.db'); source.backup(target); target.close(); source.close()"
```

For PostgreSQL, use the deployment's managed snapshot or `pg_dump` into a
backup location outside the repository, without putting a credential-bearing
URL into shell history. Test that the backup can be restored before applying
the migration. If rollback is needed, stop the application, restore both the
database backup and the matching knowledge directory (or point the application
at a restored database), verify the schema version, and then restart. The
migrations do not delete or rewrite legacy business rows; ownership is added
through nullable columns and an explicit bootstrap assignment.