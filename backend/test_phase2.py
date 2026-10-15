import unittest
from pydantic import ValidationError

from app.models.agent_models import AgentConfig
from app.services import memory
from app.services.tools import calculate, invoke


class Phase2RuntimeTests(unittest.TestCase):
    def setUp(self):
        memory.clear()

    def test_calculator_rejects_code(self):
        self.assertEqual(calculate("2 + 3 * 4"), "14")
        with self.assertRaises(ValueError):
            calculate("__import__('os').getcwd()")

    def test_disabled_tools_are_reported_without_execution(self):
        used, unavailable, status = invoke(["web_search", "datetime"], "hello")
        self.assertEqual(used, [])
        self.assertEqual(unavailable, ["web_search"])
        self.assertIn("No tool", status)

    def test_memory_none_and_bounded_buffer(self):
        memory.append("none", "none", {"role": "user", "content": "secret"})
        self.assertEqual(memory.history("none", "none"), [])
        for i in range(30):
            memory.append("buffer", "buffer", {"role": "user", "content": str(i)})
        history = memory.history("buffer", "buffer")
        self.assertEqual(len(history), 20)
        self.assertEqual(history[0]["content"], "10")

    def test_memory_window_keeps_ten_messages_in_storage_and_history(self):
        for start in range(0, 20, 4):
            memory.append(
                "window",
                "window",
                *[{"role": "user", "content": str(i)} for i in range(start, start + 4)],
            )
            stored = memory.history("window", "buffer")
            self.assertLessEqual(len(stored), 10)

        self.assertEqual(len(stored), 10)
        self.assertEqual(
            [message["content"] for message in memory.history("window", "window")],
            [str(i) for i in range(10, 20)],
        )

    def test_summary_memory_is_rejected(self):
        with self.assertRaises(ValidationError):
            AgentConfig(memory="summary")


if __name__ == "__main__":
    unittest.main()
