import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from app.services import gemini_service


class GeminiServiceTests(unittest.TestCase):
    def test_ask_gemini_passes_policy_as_system_instruction(self):
        generate_content = Mock(return_value=SimpleNamespace(text="Safe answer."))
        client = SimpleNamespace(
            models=SimpleNamespace(generate_content=generate_content)
        )

        with patch.object(gemini_service, "_get_client", return_value=client):
            result = gemini_service.ask_gemini(
                "Untrusted reference data",
                system_instruction="Follow application policy.",
            )

        self.assertEqual(result, "Safe answer.")
        config = generate_content.call_args.kwargs["config"]
        self.assertEqual(config.system_instruction, "Follow application policy.")
        self.assertEqual(
            generate_content.call_args.kwargs["contents"][0].parts[0].text,
            "Untrusted reference data",
        )


if __name__ == "__main__":
    unittest.main()
