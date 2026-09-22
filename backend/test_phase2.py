import unittest

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


if __name__ == "__main__":
    unittest.main()
