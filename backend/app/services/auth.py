
import hashlib
import hmac
import os
import time

from fastapi import HTTPException, Request

COOKIE_NAME = "agent_forge_session"
SESSION_DURATION_SECONDS = 60 * 60 * 8


def _password() -> str:
    password = os.getenv("AGENT_FORGE_PASSWORD", "")
    if len(password) < 16:
        raise RuntimeError(
            "AGENT_FORGE_PASSWORD must be set to a private password "
            "of at least 16 characters."
        )
    return password


def create_session_token() -> str:
    expires_at = str(int(time.time()) + SESSION_DURATION_SECONDS)
    signature = hmac.new(
        _password().encode("utf-8"),
        expires_at.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{expires_at}.{signature}"


def is_valid_session(token: str | None) -> bool:
    if not token:
        return False

    try:
        expires_at, supplied_signature = token.split(".", 1)
        expiry = int(expires_at)

        if expiry <= int(time.time()):
            return False

        expected_signature = hmac.new(
            _password().encode("utf-8"),
            expires_at.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(
            supplied_signature, expected_signature
        )
    except (ValueError, RuntimeError):
        return False


def require_authenticated_request(request: Request) -> None:
    token = request.cookies.get(COOKIE_NAME)

    if not is_valid_session(token):
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in.",
        )
