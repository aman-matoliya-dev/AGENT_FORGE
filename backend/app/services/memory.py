"""Small provider-neutral conversation store for the Phase 2 runtime."""

from collections import defaultdict
from threading import Lock

MAX_MESSAGES = 20
WINDOW_MESSAGES = 10
_conversations: dict[str, list[dict[str, str]]] = defaultdict(list)
_lock = Lock()


def history(conversation_id: str | None, mode: str) -> list[dict[str, str]]:
    if not conversation_id or mode == "none":
        return []
    with _lock:
        limit = WINDOW_MESSAGES if mode == "window" else MAX_MESSAGES
        return list(_conversations.get(conversation_id, []))[-limit:]


def append(conversation_id: str | None, mode: str, *messages: dict[str, str]) -> None:
    if not conversation_id or mode == "none":
        return
    with _lock:
        limit = WINDOW_MESSAGES if mode == "window" else MAX_MESSAGES
        _conversations[conversation_id].extend(messages)
        _conversations[conversation_id] = _conversations[conversation_id][-limit:]


def clear() -> None:
    with _lock:
        _conversations.clear()
