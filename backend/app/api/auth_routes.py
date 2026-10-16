import hmac
import os
import time

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field

from app.services.auth import (
    COOKIE_NAME,
    SESSION_DURATION_SECONDS,
    create_session_token,
    is_valid_session,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

LOGIN_WINDOW_SECONDS = 15 * 60
MAX_LOGIN_ATTEMPTS = 5
_login_attempts: dict[str, list[float]] = {}


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    password: str = Field(..., min_length=1, max_length=256)


def _client_key(request: Request) -> str:
    if request.client is None:
        return "unknown"
    return request.client.host


def _check_login_rate_limit(client_key: str) -> bool:
    now = time.time()
    recent = [
        attempt
        for attempt in _login_attempts.get(client_key, [])
        if now - attempt < LOGIN_WINDOW_SECONDS
    ]
    _login_attempts[client_key] = recent
    return len(recent) < MAX_LOGIN_ATTEMPTS


def _record_login_attempt(client_key: str) -> None:
    _login_attempts.setdefault(client_key, []).append(time.time())


def _configured_password() -> str:
    password = os.getenv("AGENT_FORGE_PASSWORD", "")
    if len(password) < 16:
        raise HTTPException(
            status_code=503,
            detail="Authentication is not configured correctly.",
        )
    return password


def _cookie_secure(request: Request) -> bool:
    return request.url.scheme == "https"


@router.post("/login")
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
):
    client_key = _client_key(request)

    if not _check_login_rate_limit(client_key):
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Please try again in 15 minutes.",
        )

    expected_password = _configured_password()
    _record_login_attempt(client_key)

    if not hmac.compare_digest(payload.password, expected_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect password.",
        )

    _login_attempts.pop(client_key, None)

    response.set_cookie(
        key=COOKIE_NAME,
        value=create_session_token(),
        max_age=SESSION_DURATION_SECONDS,
        httponly=True,
        secure=_cookie_secure(request),
        samesite="lax",
        path="/",
    )

    return {"success": True, "message": "Login successful."}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
    )
    return {"success": True, "message": "Logged out."}


@router.get("/session")
def check_session(request: Request):
    token = request.cookies.get(COOKIE_NAME)

    if not is_valid_session(token):
        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
        )

    return {"authenticated": True}
