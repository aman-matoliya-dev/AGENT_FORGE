import os
import re
from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterator

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Connection, Engine, URL
from sqlalchemy.pool import NullPool, StaticPool


class QueryResult:
    def __init__(self, result: Any):
        self._result = result

    def fetchone(self):
        return self._result.mappings().fetchone()

    def fetchall(self):
        return self._result.mappings().fetchall()

    @property
    def rowcount(self) -> int:
        return self._result.rowcount


class DatabaseConnection:
    def __init__(self, connection: Connection):
        self._connection = connection

    def execute(self, statement: str, parameters: Any = ()) -> QueryResult:
        if isinstance(parameters, dict):
            query = text(statement)
            values = parameters
        else:
            values = tuple(parameters or ())
            if statement.count("?") != len(values):
                raise ValueError("SQL parameter count does not match placeholders.")
            placeholders = iter(f"p{index}" for index in range(len(values)))
            query_text = re.sub(r"\?", lambda _match: f":{next(placeholders)}", statement)
            query = text(query_text)
            values = {f"p{index}": value for index, value in enumerate(values)}
        return QueryResult(self._connection.execute(query, values))


def configured_database_url(default_path: Path) -> str:
    configured = os.getenv("DATABASE_URL", "").strip()
    if configured:
        if configured.startswith("postgres://"):
            return configured.replace("postgres://", "postgresql+psycopg://", 1)
        if configured.startswith("postgresql://"):
            return configured.replace("postgresql://", "postgresql+psycopg://", 1)
        if not configured.startswith(("sqlite:", "postgresql+psycopg://")):
            raise RuntimeError(
                "DATABASE_URL must use SQLite or PostgreSQL with the psycopg driver."
            )
        return configured
    return URL.create("sqlite", database=str(default_path)).render_as_string(
        hide_password=False
    )


@lru_cache(maxsize=32)
def engine_for(database_url: str) -> Engine:
    sqlite_memory = database_url in {"sqlite://", "sqlite:///:memory:"}
    engine = create_engine(
        database_url,
        pool_pre_ping=True,
        poolclass=(
            StaticPool
            if sqlite_memory
            else NullPool
            if database_url.startswith("sqlite:")
            else None
        ),
        connect_args=(
            {"timeout": 30, "check_same_thread": False}
            if sqlite_memory
            else {"timeout": 30}
            if database_url.startswith("sqlite:")
            else {}
        ),
        hide_parameters=True,
    )
    if engine.dialect.name == "sqlite":
        @event.listens_for(engine, "connect")
        def enable_sqlite_foreign_keys(connection, _record):
            connection.isolation_level = None
            cursor = connection.cursor()
            cursor.execute("PRAGMA foreign_keys = ON")
            cursor.execute("PRAGMA busy_timeout = 30000")
            cursor.close()

        @event.listens_for(engine, "begin")
        def begin_sqlite_transaction(connection):
            connection.exec_driver_sql("BEGIN")
    elif engine.dialect.name != "postgresql":
        engine.dispose()
        raise RuntimeError("DATABASE_URL must select SQLite or PostgreSQL.")
    return engine


@contextmanager
def transaction(database_url: str) -> Iterator[Connection]:
    engine = engine_for(database_url)
    with engine.begin() as connection:
        yield connection
