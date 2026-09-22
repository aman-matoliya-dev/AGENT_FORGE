import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent.parent / "agent_forge.db"


@contextmanager
def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS agent_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                provider TEXT NOT NULL,
                agent_name TEXT NOT NULL,
                message_length INTEGER NOT NULL,
                success INTEGER NOT NULL,
                error_type TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tool_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                conversation_id TEXT,
                tool_name TEXT NOT NULL,
                status TEXT NOT NULL,
                detail TEXT
            )
        """)


def log_run(provider: str, agent_name: str, message_length: int, success: bool, error_type: str | None = None) -> None:
    with _connect() as conn:
        conn.execute(
            "INSERT INTO agent_runs (created_at, provider, agent_name, message_length, success, error_type) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (datetime.now(timezone.utc).isoformat(), provider, agent_name, message_length, int(success), error_type),
        )


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