import json
from collections.abc import Mapping
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.services import database, migrations

DB_PATH = Path(__file__).resolve().parent.parent.parent / "agent_forge.db"


def get_database_url() -> str:
    return database.configured_database_url(DB_PATH)


def get_database_dialect() -> str:
    return database.engine_for(get_database_url()).dialect.name


@contextmanager
def _connect():
    with database.transaction(get_database_url()) as connection:
        yield database.DatabaseConnection(connection)


def init_db() -> None:
    migrations.upgrade_schema(get_database_url())


def require_current_schema() -> None:
    migrations.require_current_schema(get_database_url())


def start_run(
    provider: str,
    model: str | None,
    agent_name: str,
    message_length: int,
) -> int:
    created_at = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        row = conn.execute(
            "INSERT INTO agent_runs "
            "(created_at, provider, agent_name, message_length, success, error_type, model) "
            "VALUES (?, ?, ?, ?, 0, NULL, ?) RETURNING id",
            (created_at, provider, agent_name, message_length, model),
        ).fetchone()
        return int(row["id"])


def finish_run(
    run_id: int,
    success: bool,
    duration_ms: int,
    error_type: str | None = None,
    tools_used: list[str] | None = None,
) -> None:
    completed_at = datetime.now(timezone.utc).isoformat()
    summary = "Completed successfully." if success else None
    with _connect() as conn:
        conn.execute(
            "UPDATE agent_runs SET success = ?, error_type = ?, completed_at = ?, "
            "duration_ms = ?, result_summary = ?, tools_json = ? WHERE id = ?",
            (
                int(success),
                error_type,
                completed_at,
                max(0, duration_ms),
                summary,
                json.dumps(tools_used or []),
                run_id,
            ),
        )


def log_run(
    provider: str,
    agent_name: str,
    message_length: int,
    success: bool,
    error_type: str | None = None,
    model: str | None = None,
) -> None:
    run_id = start_run(provider, model, agent_name, message_length)
    finish_run(
        run_id,
        success,
        duration_ms=0,
        error_type=error_type,
    )


def _run_from_row(row: Mapping[str, Any]) -> dict:
    status = "running" if row["completed_at"] is None else ("succeeded" if row["success"] else "failed")
    return {
        "runId": row["id"],
        "agentName": row["agent_name"],
        "createdAt": row["created_at"],
        "completedAt": row["completed_at"],
        "status": status,
        "provider": row["provider"],
        "model": row["model"],
        "durationMs": row["duration_ms"],
        "resultSummary": row["result_summary"],
        "errorSummary": (
            "Request was rate limited."
            if row["error_type"] == "rate_limited"
            else "The provider request failed."
            if row["error_type"] == "provider_error"
            else "The request could not be completed."
            if row["error_type"] and row["error_type"] != "running"
            else None
        ),
        "toolsUsed": json.loads(row["tools_json"] or "[]"),
        "messageLength": row["message_length"],
    }


def list_runs(limit: int = 25, offset: int = 0) -> tuple[list[dict], bool]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM agent_runs ORDER BY id DESC LIMIT ? OFFSET ?",
            (limit + 1, offset),
        ).fetchall()
    has_more = len(rows) > limit
    return [_run_from_row(row) for row in rows[:limit]], has_more


def get_run(run_id: int) -> dict | None:
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM agent_runs WHERE id = ?", (run_id,)
        ).fetchone()
    return _run_from_row(row) if row else None


def get_stats() -> dict:
    with _connect() as conn:
        total = conn.execute("SELECT COUNT(*) AS n FROM agent_runs").fetchone()["n"]
        by_provider = conn.execute(
            "SELECT provider, COUNT(*) AS n FROM agent_runs GROUP BY provider"
        ).fetchall()
        success_rate_row = conn.execute(
            "SELECT AVG(success) AS rate FROM agent_runs"
        ).fetchone()

        return {
            "total_runs": total,
            "by_provider": {row["provider"]: row["n"] for row in by_provider},
            "success_rate": round((success_rate_row["rate"] or 0) * 100, 1),
        }


def log_tool(conversation_id: str | None, tool_name: str, status: str, detail: str = "") -> None:
    with _connect() as conn:
        conn.execute(
            "INSERT INTO tool_runs (created_at, conversation_id, tool_name, status, detail) VALUES (?, ?, ?, ?, ?)",
            (datetime.now(timezone.utc).isoformat(), conversation_id, tool_name, status, detail),
        )


def _saved_agent_from_row(row: Mapping[str, Any]) -> dict:
    config = json.loads(row["config_json"])
    return {
        "id": row["agent_id"],
        **config,
        "description": row["description"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def create_saved_agent(agent_id: str, description: str, config: dict) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    config_json = json.dumps(config, ensure_ascii=False)
    with _connect() as conn:
        conn.execute(
            "INSERT INTO saved_agents (agent_id, name, description, config_json, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (agent_id, config["name"], description, config_json, now, now),
        )
        row = conn.execute(
            "SELECT * FROM saved_agents WHERE agent_id = ?", (agent_id,)
        ).fetchone()
    return _saved_agent_from_row(row)


def list_saved_agents() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM saved_agents ORDER BY created_at DESC, agent_id"
        ).fetchall()
    return [_saved_agent_from_row(row) for row in rows]


def get_saved_agent(agent_id: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM saved_agents WHERE agent_id = ?", (agent_id,)
        ).fetchone()
    return _saved_agent_from_row(row) if row else None


def update_saved_agent(agent_id: str, description: str, config: dict) -> dict | None:
    now = datetime.now(timezone.utc).isoformat()
    config_json = json.dumps(config, ensure_ascii=False)
    with _connect() as conn:
        cursor = conn.execute(
            "UPDATE saved_agents SET name = ?, description = ?, config_json = ?, updated_at = ? "
            "WHERE agent_id = ?",
            (config["name"], description, config_json, now, agent_id),
        )
        if cursor.rowcount == 0:
            return None
        row = conn.execute(
            "SELECT * FROM saved_agents WHERE agent_id = ?", (agent_id,)
        ).fetchone()
    return _saved_agent_from_row(row)


def delete_saved_agent(agent_id: str) -> bool:
    with _connect() as conn:
        cursor = conn.execute(
            "DELETE FROM saved_agents WHERE agent_id = ?", (agent_id,)
        )
    return cursor.rowcount > 0