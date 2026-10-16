import sqlite3
import time
from contextlib import closing

from app.services import db

MAX_REQUESTS_PER_WINDOW = 8
WINDOW_SECONDS = 60 * 30


def is_allowed(client_ip: str, now: float | None = None) -> tuple[bool, int]:
    """Atomically enforce a sliding window for a server-observed client IP."""
    if not client_ip:
        raise ValueError("A client IP is required for rate limiting.")

    current_time = time.time() if now is None else now
    cutoff = current_time - WINDOW_SECONDS

    with closing(sqlite3.connect(db.DB_PATH, timeout=30)) as connection:
        with connection:
            connection.execute("PRAGMA busy_timeout = 30000")
            connection.execute("BEGIN IMMEDIATE")
            connection.execute(
                "DELETE FROM gemini_rate_limit_events WHERE created_at <= ?",
                (cutoff,),
            )
            count = connection.execute(
                "SELECT COUNT(*) FROM gemini_rate_limit_events "
                "WHERE client_ip = ? AND created_at > ?",
                (client_ip, cutoff),
            ).fetchone()[0]

            if count >= MAX_REQUESTS_PER_WINDOW:
                return False, 0

            connection.execute(
                "INSERT INTO gemini_rate_limit_events (client_ip, created_at) "
                "VALUES (?, ?)",
                (client_ip, current_time),
            )
            return True, MAX_REQUESTS_PER_WINDOW - count - 1