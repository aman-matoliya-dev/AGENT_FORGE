import re
from typing import Any

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150


def _split_paragraphs(text: str) -> list[str]:
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n+", text) if p.strip()]
    return paragraphs


def _merge_with_overlap(items: list[str]) -> list[str]:
    if not items:
        return []
    if len(items) == 1:
        return [items[0]]

    chunks: list[str] = []
    current: list[str] = []
    current_size = 0
    overlap_buffer: list[str] = []

    for item in items:
        item_len = len(item)
        if current and current_size + item_len > CHUNK_SIZE:
            chunk_text = "\n\n".join(current).strip()
            if chunk_text:
                chunks.append(chunk_text)
            overlap_buffer = current[-max(1, len(current) // 3):]
            current = list(overlap_buffer)
            current_size = sum(len(part) for part in current)

        current.append(item)
        current_size += item_len

    if current:
        chunk_text = "\n\n".join(current).strip()
        if chunk_text:
            chunks.append(chunk_text)

    return chunks


def chunk_pages(pages: list[dict[str, Any]], source_filename: str) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    for page in pages:
        page_number = page.get("page_number")
        page_text = page.get("text", "")
        if not page_text or not page_text.strip():
            continue

        paragraphs = _split_paragraphs(page_text)
        if not paragraphs:
            continue

        page_chunks = _merge_with_overlap(paragraphs)
        for index, chunk_text in enumerate(page_chunks):
            chunks.append({
                "chunk_id": f"{source_filename}-{page_number}-{index}",
                "chunk_index": len(chunks),
                "page_number": page_number,
                "source_filename": source_filename,
                "text": chunk_text,
            })

    if not chunks:
        raise ValueError("No chunkable text was found in the document.")
    return chunks
