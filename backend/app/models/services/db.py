"""
Lightweight anonymous logging — no accounts, no user identifiers, just enough
to prove the backend has a real database and to see real usage patterns.

Uses stdlib sqlite3 rather than an ORM: the schema is small and unlikely to
grow much, so SQLAlchemy would be more ceremony than value here. Revisit if
this ever needs joins across multiple tables.
"""

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
                provider TEXT NOT NULL,          -- 'ollama' | 'gemini'
                agent_name TEXT NOT NULL,
                message_length INTEGER NOT NULL, -- length only, never the message itself
                success INTEGER NOT NULL,        -- 1 | 0
                error_type TEXT                  -- short label, e.g. 'rate_limited', 'provider_error'
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
