import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.api import agent_routes
from app.main import app
from app.services import db


class AgentHistoryTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path_patch = patch.object(
            db, "DB_PATH", Path(self.temp_dir.name) / "history_test.db"
        )
        self.db_path_patch.start()
        self.client = TestClient(app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.db_path_patch.stop()
        self.temp_dir.cleanup()

    @staticmethod
    def request_payload():
        return {
            "message": "2 + 2",
            "config": {
                "name": "History test agent",
                "provider": "ollama",
                "model": "llama3.2:latest",
                "tools": ["calculator"],
                "memory": "none",
                "knowledge": "none",
            },
        }

    def test_run_is_recorded_and_response_contract_is_unchanged(self):
        with patch.object(
            agent_routes.Agent,
            "run_with_metadata",
            return_value=("The answer is 4.", ["calculator"], [], [], None),
        ):
            response = self.client.post("/api/agent/run", json=self.request_payload())

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["response"], "The answer is 4.")
        self.assertNotIn("runId", body)

        history = self.client.get("/api/agent/runs")
        self.assertEqual(history.status_code, 200)
        run = history.json()["runs"][0]
        self.assertEqual(run["agentName"], "History test agent")
        self.assertEqual(run["status"], "succeeded")
        self.assertEqual(run["provider"], "ollama")
        self.assertEqual(run["model"], "llama3.2:latest")
        self.assertEqual(run["toolsUsed"], ["calculator"])
        self.assertEqual(run["resultSummary"], "Completed successfully.")
        self.assertNotIn("The answer is 4.", str(run))

        detail = self.client.get(f"/api/agent/runs/{run['runId']}")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["run"], run)

    def test_provider_failure_is_recorded_without_leaking_error(self):
        with patch.object(
            agent_routes.Agent,
            "run_with_metadata",
            side_effect=RuntimeError("provider failure with sensitive diagnostic"),
        ):
            response = self.client.post("/api/agent/run", json=self.request_payload())

        self.assertEqual(response.status_code, 502)
        run = self.client.get("/api/agent/runs").json()["runs"][0]
        self.assertEqual(run["status"], "failed")
        self.assertEqual(run["errorSummary"], "The provider request failed.")
        self.assertNotIn("sensitive diagnostic", str(run))

    def test_provider_value_error_is_sanitized(self):
        with patch.object(
            agent_routes.Agent,
            "run_with_metadata",
            side_effect=ValueError("provider failure with sensitive diagnostic"),
        ):
            response = self.client.post("/api/agent/run", json=self.request_payload())

        self.assertEqual(response.status_code, 502)
        self.assertNotIn("sensitive diagnostic", response.text)
        run = self.client.get("/api/agent/runs").json()["runs"][0]
        self.assertEqual(run["status"], "failed")
        self.assertEqual(run["errorSummary"], "The provider request failed.")

    def test_unsupported_summary_memory_is_rejected_before_execution(self):
        payload = self.request_payload()
        payload["config"]["memory"] = "summary"

        with patch.object(agent_routes.Agent, "run_with_metadata") as run:
            response = self.client.post("/api/agent/run", json=payload)

        self.assertEqual(response.status_code, 400)
        self.assertIn("memory must be 'none', 'buffer', or 'window'", response.text)
        run.assert_not_called()

    def test_list_pagination_validation_and_missing_run(self):
        for index in range(3):
            db.log_run("ollama", f"Agent {index}", 10, success=True, model="llama3.2:latest")

        first = self.client.get("/api/agent/runs?limit=2&offset=0")
        self.assertEqual(first.status_code, 200)
        self.assertEqual(len(first.json()["runs"]), 2)
        self.assertTrue(first.json()["hasMore"])

        final = self.client.get("/api/agent/runs?limit=2&offset=2")
        self.assertEqual(len(final.json()["runs"]), 1)
        self.assertFalse(final.json()["hasMore"])

        self.assertEqual(self.client.get("/api/agent/runs?limit=101").status_code, 400)
        self.assertEqual(self.client.get("/api/agent/runs?limit=0").status_code, 400)
        self.assertEqual(self.client.get("/api/agent/runs?offset=-1").status_code, 400)
        self.assertEqual(self.client.get("/api/agent/runs/99999").status_code, 404)

    def test_database_initialization_migrates_existing_history(self):
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
            "INSERT INTO agent_runs (created_at, provider, agent_name, message_length, success) "
            "VALUES ('2025-01-01T00:00:00+00:00', 'ollama', 'Legacy agent', 12, 1)"
        )
        connection.commit()
        connection.close()

        with patch.object(db, "DB_PATH", legacy_path):
            db.init_db()
            migrated = db.get_run(1)

        self.assertEqual(migrated["agentName"], "Legacy agent")
        self.assertEqual(migrated["status"], "succeeded")
        self.assertEqual(migrated["completedAt"], migrated["createdAt"])
        self.assertIsNone(migrated["durationMs"])


if __name__ == "__main__":
    unittest.main()
