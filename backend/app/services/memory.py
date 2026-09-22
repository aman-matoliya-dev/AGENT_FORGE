"""Small provider-neutral conversation store for the Phase 2 runtime."""

from collections import defaultdict
from threading import Lock

MAX_MESSAGES = 20
_conversations: dict[str, list[dict[str, str]]] = defaultdict(list)
_lock = Lock()


def history(conversation_id: str | None, mode: str) -> list[dict[str, str]]:
    if not conversation_id or mode == "none":
        return []
    with _lock:
        return list(_conversations.get(conversation_id, []))[-MAX_MESSAGES:]


def append(conversation_id: str | None, mode: str, *messages: dict[str, str]) -> None:
    if not conversation_id or mode == "none":
        return
    with _lock:
        _conversations[conversation_id].extend(messages)
        _conversations[conversation_id] = _conversations[conversation_id][-MAX_MESSAGES:]


def clear() -> None:
    with _lock:
        _conversations.clear()
