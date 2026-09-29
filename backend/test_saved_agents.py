import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services import db


class SavedAgentApiTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path_patch = patch.object(
            db, "DB_PATH", Path(self.temp_dir.name) / "test_agents.db"
        )
        self.db_path_patch.start()
        self.client = TestClient(app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.db_path_patch.stop()
        self.temp_dir.cleanup()

    def create_payload(self):
        return {
            "name": "Study helper",
            "description": "Answers from study notes",
            "purpose": "Help me understand my course notes",
            "personality": "Patient and clear",
            "provider": "ollama",
            "model": "llama3.2:latest",
            "agentType": "study",
            "tools": ["calculator", "datetime"],
            "memory": "buffer",
            "knowledge": "rag",
            "outputStyle": "steps",
        }

    def test_empty_list_returns_empty_agents(self):
        response = self.client.get("/api/agents")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"success": True, "agents": []})

    def test_create_list_get_update_delete_and_persist(self):
        created_response = self.client.post("/api/agents", json=self.create_payload())
        self.assertEqual(created_response.status_code, 201)
        created = created_response.json()["agent"]
        agent_id = created["id"]
        self.assertEqual(created["name"], "Study helper")
        self.assertEqual(created["knowledge"], "rag")
        self.assertTrue(created["createdAt"])

        # A new SQLite connection sees the saved record.
        persisted = db.get_saved_agent(agent_id)
        self.assertEqual(persisted["model"], "llama3.2:latest")

        listed = self.client.get("/api/agents")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.json()["agents"][0]["id"], agent_id)

        fetched = self.client.get(f"/api/agents/{agent_id}")
        self.assertEqual(fetched.status_code, 200)
        self.assertEqual(fetched.json()["agent"]["provider"], "ollama")

        updated = self.client.patch(
            f"/api/agents/{agent_id}",
            json={"name": "Updated helper", "description": "New description"},
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["agent"]["name"], "Updated helper")
        self.assertEqual(updated.json()["agent"]["description"], "New description")
        self.assertEqual(updated.json()["agent"]["knowledge"], "rag")

        deleted = self.client.delete(f"/api/agents/{agent_id}")
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(self.client.get(f"/api/agents/{agent_id}").status_code, 404)

    def test_missing_agent_get_patch_delete_return_404(self):
        missing_id = "not-a-saved-agent"
        self.assertEqual(self.client.get(f"/api/agents/{missing_id}").status_code, 404)
        self.assertEqual(
            self.client.patch(f"/api/agents/{missing_id}", json={"name": "Other"}).status_code,
            404,
        )
        self.assertEqual(self.client.delete(f"/api/agents/{missing_id}").status_code, 404)

    def test_invalid_create_and_patch_are_rejected(self):
        invalid = self.create_payload()
        invalid["provider"] = "unsupported"
        self.assertEqual(self.client.post("/api/agents", json=invalid).status_code, 400)
        invalid_name = self.create_payload()
        invalid_name["name"] = "x"
        self.assertEqual(self.client.post("/api/agents", json=invalid_name).status_code, 400)

        agent_id = self.client.post(
            "/api/agents", json=self.create_payload()
        ).json()["agent"]["id"]
        invalid_patch = self.client.patch(
            f"/api/agents/{agent_id}", json={"provider": "gemini", "model": "not-supported"}
        )
        self.assertEqual(invalid_patch.status_code, 400)
        empty_patch = self.client.patch(f"/api/agents/{agent_id}", json={})
        self.assertEqual(empty_patch.status_code, 400)


if __name__ == "__main__":
    unittest.main()
