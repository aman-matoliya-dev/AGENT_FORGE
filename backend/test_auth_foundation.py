import json
import os
import tempfile
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from app.services import auth, db
from app.services.vector_store import LocalVectorStore


def _new_test_password() -> str:
    return f"Test-{uuid.uuid4().hex}-9"


class AuthFoundationTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path_patch = patch.object(
            db, "DB_PATH", Path(self.temp_dir.name) / "auth_foundation.db"
        )
        self.db_path_patch.start()
        self.url_patch = patch.dict(os.environ, {"DATABASE_URL": ""})
        self.url_patch.start()
        db.init_db()

    def tearDown(self):
        self.url_patch.stop()
        self.db_path_patch.stop()
        self.temp_dir.cleanup()

    def test_passwords_are_argon2id_hashed_and_verified(self):
        password = _new_test_password()
        password_hash = auth.hash_password(password)

        self.assertTrue(password_hash.startswith("$argon2id$"))
        self.assertNotEqual(password_hash, password)
        self.assertTrue(auth.verify_password(password_hash, password))
        self.assertFalse(auth.verify_password(password_hash, _new_test_password()))
        with self.assertRaises(ValueError):
            auth.hash_password("short")

    def test_email_normalization_and_validation(self):
        self.assertEqual(auth.normalize_email("  Admin@Example.COM "), "admin@example.com")
        with self.assertRaises(ValueError):
            auth.normalize_email("not-an-email")

    def test_bootstrap_assigns_legacy_database_and_knowledge_records_once(self):
        password = _new_test_password()
        document_id = str(uuid.uuid4())
        knowledge_root = Path(self.temp_dir.name) / "legacy-knowledge"
        store = LocalVectorStore(knowledge_root)
        store.add_document(
            document_id,
            {
                "documentId": document_id,
                "filename": "legacy.txt",
                "fileType": "txt",
                "size": 7,
                "createdAt": "2025-01-01T00:00:00+00:00",
                "chunkCount": 1,
                "status": "indexed",
            },
            [{"chunk_id": "chunk-1", "text": "legacy", "page_number": 1}],
            [[1.0, 0.0]],
        )
        with db._connect() as connection:
            connection.execute(
                "INSERT INTO agent_runs "
                "(created_at, provider, agent_name, message_length, success) "
                "VALUES (?, ?, ?, ?, ?)",
                ("2025-01-01T00:00:00+00:00", "ollama", "legacy", 12, 1),
            )
            connection.execute(
                "INSERT INTO tool_runs "
                "(created_at, conversation_id, tool_name, status, detail) "
                "VALUES (?, ?, ?, ?, ?)",
                ("2025-01-01T00:00:00+00:00", "legacy-conversation", "clock", "used", ""),
            )
            connection.execute(
                "INSERT INTO saved_agents "
                "(agent_id, name, description, config_json, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                ("legacy-agent", "Legacy agent", "", "{}", "created", "updated"),
            )

        with patch.object(auth.knowledge_service, "vector_store", store):
            user_id = auth.bootstrap_admin(
                " Admin@Example.com ", "Primary administrator", password
            )

            with db._connect() as connection:
                user = connection.execute(
                    "SELECT * FROM users WHERE id = ?", (user_id,)
                ).fetchone()
                owners = {
                    "runs": connection.execute(
                        "SELECT owner_id FROM agent_runs WHERE agent_name = 'legacy'"
                    ).fetchone()["owner_id"],
                    "tools": connection.execute(
                        "SELECT owner_id FROM tool_runs WHERE conversation_id = "
                        "'legacy-conversation'"
                    ).fetchone()["owner_id"],
                    "agents": connection.execute(
                        "SELECT owner_id FROM saved_agents WHERE agent_id = 'legacy-agent'"
                    ).fetchone()["owner_id"],
                }

            indexed_owner = store.get_document(document_id)["ownerId"]
            document_metadata = json.loads(
                (store.documents_dir / f"{document_id}.json").read_text(encoding="utf-8")
            )
            self.assertEqual(document_metadata["ownerId"], user_id)
            self.assertEqual(indexed_owner, user_id)
            self.assertEqual(owners, {key: user_id for key in owners})
            self.assertEqual(user["email"], "admin@example.com")
            self.assertEqual(user["role"], "admin")
            self.assertEqual(user["status"], "active")
            self.assertTrue(auth.verify_password(user["password_hash"], password))

            with db._connect() as connection:
                connection.execute(
                    "INSERT INTO saved_agents "
                    "(agent_id, name, description, config_json, created_at, updated_at) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    ("future-unowned", "Future", "", "{}", "created", "updated"),
                )
            self.assertEqual(
                auth.bootstrap_admin(
                    "admin@example.com",
                    "Primary administrator",
                    password,
                ),
                user_id,
            )
            with db._connect() as connection:
                later_owner = connection.execute(
                    "SELECT owner_id FROM saved_agents WHERE agent_id = 'future-unowned'"
                ).fetchone()["owner_id"]
            self.assertIsNone(later_owner)

    def test_bootstrap_rejects_a_second_administrator(self):
        password = _new_test_password()
        with patch.object(
            auth.knowledge_service,
            "vector_store",
            LocalVectorStore(Path(self.temp_dir.name) / "empty-knowledge"),
        ):
            auth.bootstrap_admin(
                "admin@example.com", "Primary administrator", password
            )
            with self.assertRaisesRegex(RuntimeError, "already completed"):
                auth.bootstrap_admin(
                    "other@example.com", "Other administrator", _new_test_password()
                )

    def test_knowledge_owner_migration_rolls_back_partial_file_changes(self):
        document_id = str(uuid.uuid4())
        store = LocalVectorStore(Path(self.temp_dir.name) / "rollback-knowledge")
        store.add_document(
            document_id,
            {
                "documentId": document_id,
                "filename": "legacy.txt",
                "fileType": "txt",
                "size": 7,
                "createdAt": "2025-01-01T00:00:00+00:00",
                "chunkCount": 1,
                "status": "indexed",
            },
            [{"chunk_id": "chunk-1", "text": "legacy", "page_number": 1}],
            [[1.0, 0.0]],
        )
        index_before = store.index_path.read_bytes()
        metadata_path = store.documents_dir / f"{document_id}.json"
        metadata_before = metadata_path.read_bytes()

        with patch.object(store, "_write_index", side_effect=OSError("write failed")):
            with self.assertRaisesRegex(OSError, "write failed"):
                store.assign_legacy_owner(str(uuid.uuid4()))

        self.assertEqual(store.index_path.read_bytes(), index_before)
        self.assertEqual(metadata_path.read_bytes(), metadata_before)

    def test_sessions_store_only_hashes_and_enforce_expiry_revocation_and_status(self):
        password = _new_test_password()
        with patch.object(
            auth.knowledge_service,
            "vector_store",
            LocalVectorStore(Path(self.temp_dir.name) / "empty-knowledge"),
        ):
            user_id = auth.bootstrap_admin(
                "admin@example.com", "Primary administrator", password
            )
        created = datetime(2025, 1, 1, tzinfo=timezone.utc)
        token, expires_at = auth.create_session(user_id, 3600, now=created)
        token_hash = auth.hash_session_token(token)
        self.assertNotEqual(token, token_hash)
        self.assertEqual(
            auth.get_session_user(token, now=created + timedelta(minutes=30))["id"],
            user_id,
        )
        self.assertIsNone(
            auth.get_session_user(token, now=created + timedelta(hours=1))
        )
        with db._connect() as connection:
            stored_hash = connection.execute(
                "SELECT token_hash FROM sessions"
            ).fetchone()["token_hash"]
        self.assertEqual(stored_hash, token_hash)
        self.assertTrue(auth.revoke_session(token, now=created + timedelta(minutes=40)))
        self.assertIsNone(auth.get_session_user(token, now=created + timedelta(minutes=41)))
        self.assertFalse(auth.revoke_session(token, now=created + timedelta(minutes=42)))
        self.assertTrue(expires_at.startswith("2025-01-01T01:00:00"))

        token, _expires_at = auth.create_session(
            user_id, 3600, now=created + timedelta(hours=2)
        )
        self.assertEqual(
            auth.revoke_user_sessions(user_id, now=created + timedelta(hours=2)),
            1,
        )
        self.assertIsNone(
            auth.get_session_user(token, now=created + timedelta(hours=2, minutes=1))
        )

        token, _expires_at = auth.create_session(
            user_id, 3600, now=created + timedelta(hours=3)
        )
        with db._connect() as connection:
            connection.execute(
                "UPDATE users SET status = 'disabled' WHERE id = ?",
                (user_id,),
            )
        self.assertIsNone(
            auth.get_session_user(token, now=created + timedelta(hours=3, minutes=1))
        )


if __name__ == "__main__":
    unittest.main()
