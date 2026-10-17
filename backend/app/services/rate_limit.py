import time

from app.services import db

MAX_REQUESTS_PER_WINDOW = 8
WINDOW_SECONDS = 60 * 30


def is_allowed(client_ip: str, now: float | None = None) -> tuple[bool, int]:
    """Atomically enforce a sliding window for a server-observed client IP."""
    if not client_ip:
        raise ValueError("A client IP is required for rate limiting.")

    current_time = time.time() if now is None else now
    cutoff = current_time - WINDOW_SECONDS

    with db._connect() as connection:
        if db.get_database_dialect() == "postgresql":
            connection.execute(
                "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))",
                (client_ip,),
            ).fetchone()
        connection.execute(
            "DELETE FROM gemini_rate_limit_events WHERE created_at <= ?",
            (cutoff,),
        )
        count = connection.execute(
            "SELECT COUNT(*) AS count FROM gemini_rate_limit_events "
            "WHERE client_ip = ? AND created_at > ?",
            (client_ip, cutoff),
        ).fetchone()["count"]

        if count >= MAX_REQUESTS_PER_WINDOW:
            return False, 0

        connection.execute(
            "INSERT INTO gemini_rate_limit_events (client_ip, created_at) "
            "VALUES (?, ?)",
            (client_ip, current_time),
        )
        return True, MAX_REQUESTS_PER_WINDOW - count - 1