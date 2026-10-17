import hashlib
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.services import db
from app.services.knowledge import knowledge_service
from app.services.vector_store import KnowledgeIndexError

COOKIE_SESSION_SECONDS = 60 * 60 * 8
MAX_SESSION_SECONDS = 60 * 60 * 24 * 30
MIN_PASSWORD_LENGTH = 12
MAX_PASSWORD_LENGTH = 1024

_password_hasher = PasswordHasher(type=Type.ID)
_EMAIL_PATTERN = re.compile(
    r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@"
    r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
    r"(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$"
)


def normalize_email(email: str) -> str:
    if not isinstance(email, str):
        raise ValueError("Enter a valid email address.")
    normalized = email.strip().lower()
    if (
        len(normalized) > 254
        or not _EMAIL_PATTERN.fullmatch(normalized)
        or len(normalized.split("@", 1)[0]) > 64
    ):
        raise ValueError("Enter a valid email address.")
    return normalized


def _validate_password(password: str) -> None:
    if not isinstance(password, str) or not (
        MIN_PASSWORD_LENGTH <= len(password) <= MAX_PASSWORD_LENGTH
    ):
        raise ValueError(
            f"Password must contain between {MIN_PASSWORD_LENGTH} and "
            f"{MAX_PASSWORD_LENGTH} characters."
        )


def hash_password(password: str) -> str:
    _validate_password(password)
    return _password_hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        _validate_password(password)
        return _password_hasher.verify(password_hash, password)
    except (ValueError, InvalidHashError, VerificationError, VerifyMismatchError):
        return False


def hash_session_token(token: str) -> str:
    if not isinstance(token, str) or not token:
        raise ValueError("A session token is required.")
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(
    user_id: str,
    lifetime_seconds: int = COOKIE_SESSION_SECONDS,
    now: datetime | None = None,
) -> tuple[str, str]:
    if not 1 <= lifetime_seconds <= MAX_SESSION_SECONDS:
        raise ValueError("Session lifetime is outside the allowed range.")
    current = now or datetime.now(timezone.utc)
    created_at = current.astimezone(timezone.utc).isoformat()
    expires_at = (
        current.astimezone(timezone.utc) + timedelta(seconds=lifetime_seconds)
    ).isoformat()
    token = secrets.token_urlsafe(32)
    session_id = str(uuid.uuid4())
    with db._connect() as connection:
        user = connection.execute(
            "SELECT id FROM users WHERE id = ? AND status = 'active'",
            (user_id,),
        ).fetchone()
        if user is None:
            raise ValueError("Active user not found.")
        connection.execute(
            "INSERT INTO sessions "
            "(id, user_id, token_hash, created_at, expires_at, revoked_at, last_used_at) "
            "VALUES (?, ?, ?, ?, ?, NULL, ?)",
            (
                session_id,
                user_id,
                hash_session_token(token),
                created_at,
                expires_at,
                created_at,
            ),
        )
    return token, expires_at


def get_session_user(
    token: str | None,
    now: datetime | None = None,
) -> dict | None:
    if not token:
        return None
    current = (now or datetime.now(timezone.utc)).astimezone(timezone.utc).isoformat()
    with db._connect() as connection:
        row = connection.execute(
            "SELECT users.id, users.email, users.display_name, users.role, users.status "
            "FROM sessions JOIN users ON users.id = sessions.user_id "
            "WHERE sessions.token_hash = ? AND sessions.revoked_at IS NULL "
            "AND sessions.expires_at > ? AND users.status = 'active'",
            (hash_session_token(token), current),
        ).fetchone()
        if row is None:
            return None
        connection.execute(
            "UPDATE sessions SET last_used_at = ? WHERE token_hash = ?",
            (current, hash_session_token(token)),
        )
        return dict(row)


def revoke_session(token: str | None, now: datetime | None = None) -> bool:
    if not token:
        return False
    revoked_at = (now or datetime.now(timezone.utc)).astimezone(timezone.utc).isoformat()
    with db._connect() as connection:
        result = connection.execute(
            "UPDATE sessions SET revoked_at = ? "
            "WHERE token_hash = ? AND revoked_at IS NULL",
            (revoked_at, hash_session_token(token)),
        )
    return result.rowcount > 0


def revoke_user_sessions(user_id: str, now: datetime | None = None) -> int:
    revoked_at = (now or datetime.now(timezone.utc)).astimezone(timezone.utc).isoformat()
    with db._connect() as connection:
        result = connection.execute(
            "UPDATE sessions SET revoked_at = ? "
            "WHERE user_id = ? AND revoked_at IS NULL",
            (revoked_at, user_id),
        )
    return result.rowcount


def bootstrap_admin(email: str, display_name: str, password: str) -> str:
    normalized_email = normalize_email(email)
    display_name = display_name.strip()
    if not display_name or len(display_name) > 100:
        raise ValueError("Display name must contain between 1 and 100 characters.")
    password_hash = hash_password(password)
    candidate_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    with db._connect() as connection:
        state = connection.execute(
            "SELECT value FROM bootstrap_state WHERE key = 'primary_admin_id'"
        ).fetchone()
        if state is not None:
            user = connection.execute(
                "SELECT id, email, password_hash, role FROM users WHERE id = ?",
                (state["value"],),
            ).fetchone()
            if (
                user is None
                or user["role"] != "admin"
                or user["email"] != normalized_email
                or not verify_password(user["password_hash"], password)
            ):
                raise RuntimeError(
                    "Administrator bootstrap was already completed."
                )
            user_id = user["id"]
        else:
            user_count = connection.execute(
                "SELECT COUNT(*) AS count FROM users"
            ).fetchone()["count"]
            if user_count:
                raise RuntimeError(
                    "Bootstrap requires an empty user table and can run only once."
                )
            connection.execute(
                "INSERT INTO bootstrap_state (key, value) "
                "VALUES ('primary_admin_id', ?)",
                (candidate_id,),
            )
            connection.execute(
                "INSERT INTO users "
                "(id, email, display_name, password_hash, role, status, "
                "created_at, updated_at, last_login_at) "
                "VALUES (?, ?, ?, ?, 'admin', 'active', ?, ?, NULL)",
                (
                    candidate_id,
                    normalized_email,
                    display_name,
                    password_hash,
                    now,
                    now,
                ),
            )
            user_id = candidate_id

        relational_migration = connection.execute(
            "SELECT value FROM bootstrap_state "
            "WHERE key = 'legacy_records_owner_migrated'"
        ).fetchone()
        if relational_migration is None:
            for table_name in ("agent_runs", "tool_runs", "saved_agents"):
                connection.execute(
                    f"UPDATE {table_name} SET owner_id = ? WHERE owner_id IS NULL",
                    (user_id,),
                )
            connection.execute(
                "INSERT INTO bootstrap_state (key, value) "
                "VALUES ('legacy_records_owner_migrated', 'true')"
            )

        knowledge_migration = connection.execute(
            "SELECT value FROM bootstrap_state "
            "WHERE key = 'legacy_knowledge_owner_migrated'"
        ).fetchone()
        knowledge_migration_needed = knowledge_migration is None

    if knowledge_migration_needed:
        try:
            knowledge_service.vector_store.assign_legacy_owner(user_id)
        except (OSError, ValueError, KnowledgeIndexError) as error:
            raise RuntimeError(
                "The administrator was created and relational records were assigned, "
                "but legacy knowledge ownership migration failed. Re-run bootstrap "
                "with the same email and password to resume."
            ) from error
        with db._connect() as connection:
            connection.execute(
                "INSERT INTO bootstrap_state (key, value) "
                "VALUES ('legacy_knowledge_owner_migrated', 'true') "
                "ON CONFLICT (key) DO NOTHING"
            )
    return user_id
