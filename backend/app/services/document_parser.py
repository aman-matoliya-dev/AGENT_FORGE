import re
from pathlib import Path
from typing import Any

from pypdf import PdfReader


def normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n +", "\n", text)
    text = re.sub(r" +\n", "\n", text)
    text = re.sub(r"\n{2,}", "\n\n", text)
    return text.strip()


def extract_text_from_txt(path: Path) -> tuple[str, list[dict[str, Any]]]:
    raw = path.read_bytes()
    for encoding in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            text = raw.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ValueError("The text file could not be decoded as UTF-8 or a reasonable fallback encoding.")
    cleaned = normalize_text(text)
    if not cleaned:
        raise ValueError("No readable text was found in the TXT file.")
    return cleaned, [{"page_number": 1, "text": cleaned}]


def extract_text_from_pdf(path: Path) -> tuple[str, list[dict[str, Any]]]:
    reader = PdfReader(str(path))
    pages: list[dict[str, Any]] = []
    extracted_pages: list[str] = []

    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        normalized = normalize_text(text)
        pages.append({"page_number": page_number, "text": normalized})
        if normalized:
            extracted_pages.append(normalized)

    if not extracted_pages:
        raise ValueError("No text could be extracted from this PDF. OCR is not implemented in Phase 3A.")

    full_text = "\n\n".join(extracted_pages)
    return full_text, pages


def extract_document_text(path: Path, file_type: str) -> tuple[str, list[dict[str, Any]]]:
    normalized_type = (file_type or "").lower().lstrip(".")
    if normalized_type == "txt":
        return extract_text_from_txt(path)
    if normalized_type == "pdf":
        return extract_text_from_pdf(path)
    raise ValueError(f"Unsupported file type: {file_type}")
