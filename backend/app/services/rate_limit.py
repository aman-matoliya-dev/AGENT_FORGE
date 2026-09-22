import time
from collections import defaultdict
from threading import Lock

_requests: dict[str, list[float]] = defaultdict(list)
_lock = Lock()

MAX_REQUESTS_PER_WINDOW = 8
WINDOW_SECONDS = 60 * 30


def is_allowed(session_id: str) -> tuple[bool, int]:
    now = time.time()
    with _lock:
        timestamps = _requests[session_id]
        timestamps[:] = [t for t in timestamps if now - t < WINDOW_SECONDS]

        if len(timestamps) >= MAX_REQUESTS_PER_WINDOW:
            return False, 0

        timestamps.append(now)
        return True, MAX_REQUESTS_PER_WINDOW - len(timestamps)