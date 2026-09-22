import os
from google import genai
from google.genai import types

MODEL = "gemini-2.5-flash"  # permanent free tier — see the project's own Pricing research

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


def ask_gemini(message: str) -> str:
    client = _get_client()

    response = client.models.generate_content(
        model=MODEL,
        contents=[types.Content(role="user", parts=[types.Part.from_text(text=message)])],
        config=types.GenerateContentConfig(
            max_output_tokens=400,
            temperature=0.7,
        ),
    )

    return response.text or "Sorry, I couldn't generate a reply — try again."
