import os
from google import genai
from google.genai import types

MODEL = "gemini-3.6-flash"

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Copy backend/.env.example to backend/.env "
                "and add your key from https://aistudio.google.com/apikey"
            )
        _client = genai.Client(api_key=api_key)
    return _client


def ask_gemini(message: str, model: str | None = None) -> str:
    client = _get_client()
    selected_model = model or MODEL
    print(f"[GEMINI] calling model={selected_model}")

    response = client.models.generate_content(
        model=selected_model,
        contents=[
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=message)]
            )
        ],
        config=types.GenerateContentConfig(
            max_output_tokens=400,
            temperature=0.7,
        ),
    )

    print(f"[GEMINI] response received model={selected_model}")

    return response.text or "Sorry, I couldn't generate a reply — try again."