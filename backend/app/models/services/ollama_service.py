import requests


OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
MODEL = "llama3.2:latest"


def ask_ollama(message: str) -> str:
    payload = {
        "model": MODEL,
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