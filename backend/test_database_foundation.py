import os
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from sqlalchemy.exc import OperationalError

from app.services import database, db, migrations


class DatabaseFoundationTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path_patch = patch.object(
            db, "DB_PATH", Path(self.temp_dir.name) / "foundation.db"
        )
        self.db_path_patch.start()
        self.url_patch = patch.dict(os.environ, {"DATABASE_URL": ""})
        self.url_patch.start()

    def tearDown(self):
        self.url_patch.stop()
        self.db_path_patch.stop()
        self.temp_dir.cleanup()

    def test_upgrade_creates_versioned_auth_schema_and_is_idempotent(self):
        self.assertEqual(migrations.upgrade_schema(db.get_database_url()), 2)
        self.assertEqual(migrations.upgrade_schema(db.get_database_url()), 2)
        with db._connect() as connection:
            users = connection.execute(
                "SELECT COUNT(*) AS count FROM users"
            ).fetchone()["count"]
            version = connection.execute(
                "SELECT MAX(version) AS version FROM schema_migrations"
            ).fetchone()["version"]
            owner_columns = {
                row["name"]
                for row in connection.execute("PRAGMA table_info(saved_agents)").fetchall()
            }
        self.assertEqual(users, 0)
        self.assertEqual(version, 2)
        self.assertIn("owner_id", owner_columns)

    def test_production_schema_check_does_not_apply_migrations(self):
        with self.assertRaisesRegex(RuntimeError, "Run the documented migration"):
            migrations.require_current_schema(db.get_database_url())
        self.assertEqual(migrations.get_schema_version(db.get_database_url()), 0)

        migrations.upgrade_schema(db.get_database_url())
        migrations.require_current_schema(db.get_database_url())

    def test_upgrade_preserves_legacy_records_and_leaves_owners_unassigned(self):
        legacy_path = Path(self.temp_dir.name) / "legacy.db"
        connection = sqlite3.connect(legacy_path)
        connection.execute("""
            CREATE TABLE agent_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                provider TEXT NOT NULL,
                agent_name TEXT NOT NULL,
                message_length INTEGER NOT NULL,
                success INTEGER NOT NULL,
                error_type TEXT
            )
        """)
        connection.execute(
            "INSERT INTO agent_runs "
            "(created_at, provider, agent_name, message_length, success) "
            "VALUES (?, ?, ?, ?, ?)",
            ("2025-01-01T00:00:00+00:00", "ollama", "old agent", 9, 1),
        )
        connection.execute("""
            CREATE TABLE saved_agents (
                agent_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                config_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        connection.execute(
            "INSERT INTO saved_agents VALUES (?, ?, ?, ?, ?, ?)",
            ("legacy-agent", "Old agent", "", "{}", "created", "updated"),
        )
        connection.commit()
        connection.close()

        with patch.object(db, "DB_PATH", legacy_path):
            self.assertEqual(migrations.upgrade_schema(db.get_database_url()), 2)
            with db._connect() as migrated:
                run = migrated.execute(
                    "SELECT * FROM agent_runs WHERE id = 1"
                ).fetchone()
                saved = migrated.execute(
                    "SELECT * FROM saved_agents WHERE agent_id = ?",
                    ("legacy-agent",),
                ).fetchone()

        self.assertEqual(run["agent_name"], "old agent")
        self.assertEqual(run["completed_at"], run["created_at"])
        self.assertIsNone(run["owner_id"])
        self.assertEqual(saved["name"], "Old agent")
        self.assertIsNone(saved["owner_id"])

    def test_failed_legacy_migration_rolls_back_new_schema_changes(self):
        broken_path = Path(self.temp_dir.name) / "broken.db"
        connection = sqlite3.connect(broken_path)
        connection.execute("CREATE TABLE agent_runs (id INTEGER PRIMARY KEY)")
        connection.commit()
        connection.close()

        with patch.object(db, "DB_PATH", broken_path):
            with self.assertRaises(OperationalError):
                migrations.upgrade_schema(db.get_database_url())
            connection = sqlite3.connect(broken_path)
            try:
                tables = {
                    row[0]
                    for row in connection.execute(
                        "SELECT name FROM sqlite_master WHERE type = 'table'"
                    )
                }
                columns = {
                    row[1]
                    for row in connection.execute("PRAGMA table_info(agent_runs)")
                }
            finally:
                connection.close()

        self.assertEqual(tables, {"agent_runs"})
        self.assertEqual(columns, {"id"})

    def test_postgresql_database_url_selects_psycopg_engine_without_connecting(self):
        with patch.dict(
            os.environ,
            {"DATABASE_URL": "postgresql://agent@localhost/agent_forge"},
        ):
            url = db.get_database_url()
        engine = database.engine_for(url)
        self.assertEqual(engine.dialect.name, "postgresql")
        self.assertEqual(engine.dialect.driver, "psycopg")
        engine.dispose()


if __name__ == "__main__":
    unittest.main()
