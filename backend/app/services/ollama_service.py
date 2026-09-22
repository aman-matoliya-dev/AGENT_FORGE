import os

import requests


OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_URL = f"{OLLAMA_BASE_URL}/api/chat"
MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:latest")


def ask_ollama(message: str, model: str | None = None) -> str:
    payload = {
        "model": model or MODEL,
        "messages": [
            {
                "role": "user",
                "content": message
            }
        ],
        "stream": False,
        "options": {
            "num_predict": 256,
            "temperature": 0.7
        }
    }

    response = requests.post(
        OLLAMA_URL,
        json=payload,
        timeout=120
    )

    response.raise_for_status()

    data = response.json()

    return data["message"]["content"]