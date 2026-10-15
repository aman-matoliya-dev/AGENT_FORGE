import unittest
from unittest.mock import Mock, patch

from app.services import ollama_service


class OllamaServiceTests(unittest.TestCase):
    @patch("app.services.ollama_service.requests.post")
    def test_ask_ollama_posts_message_and_returns_response(self, post):
        response = Mock()
        response.json.return_value = {"message": {"content": "Hello from Ollama."}}
        post.return_value = response

        result = ollama_service.ask_ollama("Hello", model="test-model")

        self.assertEqual(result, "Hello from Ollama.")
        post.assert_called_once_with(
            ollama_service.OLLAMA_URL,
            json={
                "model": "test-model",
                "messages": [{"role": "user", "content": "Hello"}],
                "stream": False,
                "options": {"num_predict": 256, "temperature": 0.7},
            },
            timeout=120,
        )
        response.raise_for_status.assert_called_once_with()


if __name__ == "__main__":
    unittest.main()
