# Failure behavior and detection

- Provider generation failures return HTTP 502 with generic text; execution history stores a safe error summary. Logs include a server-side exception record, but no live-provider timeout behavior has been verified.
- RAG failures can leave a generation request running without knowledge; response metadata reports knowledge retrieval as unavailable. Knowledge index corruption and persistence failures return controlled HTTP errors in the existing routes.
- Quota database errors are not converted into an allowed request: SQLite errors fail the request. Monitor backend error logs and SQLite availability; no dedicated quota metrics/alerting exists.
- SQLite and local JSON/vector files are single-host persistence. Disk loss, permissions, corruption, or concurrent multi-host writes can affect availability. Keep backups and test restoration.
- Conversation memory is in process and resets at restart; it is not durable.

Detection today is limited to HTTP errors, execution history, backend logs, and local health checks. There is no production telemetry, alerting, or deployment smoke-test evidence.
