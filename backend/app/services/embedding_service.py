import logging
import os
from typing import Sequence

from google import genai
from google.genai import types

DEFAULT_MODEL = os.environ.get("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
logger = logging.getLogger(__name__)


def _get_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Add it to backend/.env before using the knowledge foundation."
        )
    return genai.Client(api_key=api_key)


def _resolve_model() -> str:
    model = os.environ.get("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
    if not model:
        raise RuntimeError("GEMINI_EMBEDDING_MODEL must not be empty.")
    return model


def embed_text(text: str, *, task_type: str = "RETRIEVAL_DOCUMENT") -> list[float]:
    value = (text or "").strip()
    if not value:
        raise ValueError("Embedding input cannot be empty.")

    client = _get_client()
    try:
        response = client.models.embed_content(
            model=_resolve_model(),
            contents=value,
            config=types.EmbedContentConfig(task_type=task_type),
        )
    except Exception as exc:
        logger.exception("Embedding provider request failed.")
        raise RuntimeError("Embedding request failed.") from exc

    embeddings = response.embeddings or []
    if not embeddings or not embeddings[0].values:
        raise RuntimeError("The embedding response was empty.")
    return list(embeddings[0].values)


def embed_texts(texts: Sequence[str], *, task_type: str = "RETRIEVAL_DOCUMENT") -> list[list[float]]:
    cleaned = [str(item).strip() for item in texts if str(item or "").strip()]
    if not cleaned:
        return []

    client = _get_client()
    vectors = []
    for start in range(0, len(cleaned), 50):
        batch = cleaned[start:start + 50]
        try:
            response = client.models.embed_content(
                model=_resolve_model(),
                contents=batch,
                config=types.EmbedContentConfig(task_type=task_type),
            )
        except Exception as exc:
            logger.exception("Embedding provider request failed.")
            raise RuntimeError("Embedding request failed.") from exc

        embeddings = response.embeddings or []
        if len(embeddings) != len(batch):
            raise RuntimeError("The embedding response did not include one vector per input text.")
        vectors.extend(list(item.values or []) for item in embeddings)

    if len(vectors) != len(cleaned):
        raise RuntimeError("The embedding response did not include one vector per input text.")
    return vectors
