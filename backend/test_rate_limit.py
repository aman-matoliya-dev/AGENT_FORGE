import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.api import agent_routes
from app.main import app
from app.services import db, rate_limit


class RateLimitTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path_patch = patch.object(
            db, "DB_PATH", Path(self.temp_dir.name) / "rate_limit_test.db"
        )
        self.db_path_patch.start()
        db.init_db()

    def tearDown(self):
        self.db_path_patch.stop()
        self.temp_dir.cleanup()

    def test_enforces_sliding_window_limit_and_reports_remaining(self):
        identity = "203.0.113.10"
        results = [
            rate_limit.is_allowed(identity, now=1000 + index)
            for index in range(rate_limit.MAX_REQUESTS_PER_WINDOW)
        ]

        self.assertEqual(
            results,
            [(True, remaining) for remaining in range(7, -1, -1)],
        )
        self.assertEqual(rate_limit.is_allowed(identity, now=1010), (False, 0))

    def test_requests_expire_at_window_boundary(self):
        identity = "203.0.113.11"
        for index in range(rate_limit.MAX_REQUESTS_PER_WINDOW):
            self.assertTrue(rate_limit.is_allowed(identity, now=1000 + index)[0])

        self.assertEqual(
            rate_limit.is_allowed(
                identity, now=1000 + rate_limit.WINDOW_SECONDS
            ),
            (True, 0),
        )
        self.assertEqual(
            rate_limit.is_allowed(
                identity, now=1000 + 2 * rate_limit.WINDOW_SECONDS
            ),
            (True, rate_limit.MAX_REQUESTS_PER_WINDOW - 1),
        )

    def test_concurrent_requests_cannot_exceed_limit(self):
        identity = "203.0.113.12"
        with ThreadPoolExecutor(max_workers=16) as executor:
            results = list(
                executor.map(
                    lambda _: rate_limit.is_allowed(identity, now=2000),
                    range(32),
                )
            )

        self.assertEqual(
            sum(allowed for allowed, _ in results),
            rate_limit.MAX_REQUESTS_PER_WINDOW,
        )
        self.assertEqual(
            sum(not allowed for allowed, _ in results),
            32 - rate_limit.MAX_REQUESTS_PER_WINDOW,
        )

    def test_rotating_client_headers_does_not_reset_quota(self):
        payload = {
            "message": "Hello",
            "config": {"name": "Rate test agent", "provider": "gemini"},
        }
        with TestClient(app) as client:
            with patch.object(
                agent_routes.Agent,
                "run_with_metadata",
                return_value=("Hello", [], [], [], None),
            ) as run:
                responses = [
                    client.post(
                        "/api/agent/run",
                        json=payload,
                        headers={
                            "Cookie": f"session_id=attacker-{index}",
                            "X-Forwarded-For": f"198.51.100.{index + 1}",
                        },
                    )
                    for index in range(rate_limit.MAX_REQUESTS_PER_WINDOW + 1)
                ]

            self.assertEqual(
                [response.status_code for response in responses],
                [200] * rate_limit.MAX_REQUESTS_PER_WINDOW + [429],
            )
            self.assertTrue(all("set-cookie" not in response.headers for response in responses))
            self.assertEqual(run.call_count, rate_limit.MAX_REQUESTS_PER_WINDOW)


if __name__ == "__main__":
    unittest.main()
