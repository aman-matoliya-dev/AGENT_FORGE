import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import BinaryIO

from app.services.chunker import chunk_pages
from app.services.document_parser import extract_document_text
from app.services.embedding_service import embed_texts
from app.services.vector_store import LocalVectorStore

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".txt", ".pdf"}
ALLOWED_CONTENT_TYPES = {
    ".txt": {"text/plain", "text/plain; charset=utf-8", "application/octet-stream"},
    ".pdf": {"application/pdf", "application/octet-stream"},
}


class KnowledgeService:
    def __init__(self, storage_dir: str | Path | None = None):
        self.vector_store = LocalVectorStore(storage_dir)

    def _validate_name(self, filename: str) -> str:
        if not filename or filename.strip() == "":
            raise ValueError("A filename is required.")
        suffix = Path(filename).suffix.lower()
        if suffix not in ALLOWED_EXTENSIONS:
            raise ValueError("Unsupported document type. Only .txt and .pdf files are supported.")
        return suffix

    def _validate_content_type(self, file_type: str, content_type: str | None) -> None:
        allowed = ALLOWED_CONTENT_TYPES.get(file_type.lower())
        if not allowed:
            return
        if content_type and content_type.split(";", 1)[0].strip().lower() not in allowed:
            raise ValueError(f"Unexpected content type for {file_type}: {content_type}")

    def upload_document(self, filename: str, data: bytes, content_type: str | None = None) -> dict:
        if len(data) == 0:
            raise ValueError("The uploaded file is empty.")
        if len(data) > MAX_UPLOAD_BYTES:
            raise ValueError(f"The uploaded file exceeds the {MAX_UPLOAD_BYTES / (1024 * 1024):.0f} MB size limit.")

        file_type = self._validate_name(filename)
        self._validate_content_type(file_type, content_type)

        document_id = str(uuid.uuid4())
        storage_path = self.vector_store.documents_dir / f"{document_id}{file_type}"
        storage_path.write_bytes(data)

        try:
            text, pages = extract_document_text(storage_path, file_type)
            chunks = []
            source_name = Path(filename).name
            for page in pages:
                page_text = page.get("text") or ""
                if not page_text.strip():
                    continue
                page_chunks = []
                for chunk in chunk_pages([page], source_name):
                    page_chunks.append(chunk)
                chunks.extend(page_chunks)

            if not chunks:
                raise ValueError("No readable text could be extracted from the uploaded file.")

            doc_metadata = {
                "documentId": document_id,
                "filename": Path(filename).name,
                "fileType": file_type.lstrip("."),
                "size": len(data),
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "chunkCount": len(chunks),
                "status": "indexed",
            }
            embeddings = embed_texts([chunk["text"] for chunk in chunks], task_type="RETRIEVAL_DOCUMENT")
            if len(embeddings) != len(chunks):
                raise ValueError("Embedding generation did not return a vector for every chunk.")

            final_chunks = []
            for chunk, embedding in zip(chunks, embeddings):
                final_chunk = dict(chunk)
                final_chunk["document_id"] = document_id
                final_chunk["chunk_id"] = str(uuid.uuid4())
                final_chunk["chunk_index"] = len(final_chunks)
                final_chunks.append(final_chunk)

            self.vector_store.add_document(document_id, doc_metadata, final_chunks, embeddings)
            return {
                "documentId": document_id,
                "filename": Path(filename).name,
                "fileType": file_type.lstrip("."),
                "size": len(data),
                "chunkCount": len(final_chunks),
                "status": "indexed",
            }
        except Exception:
            if storage_path.exists():
                storage_path.unlink(missing_ok=True)
            raise

    def list_documents(self) -> list[dict]:
        return self.vector_store.list_documents()

    def search(self, query: str, top_k: int = 5) -> dict:
        normalized = (query or "").strip()
        if not normalized:
            raise ValueError("The search query cannot be empty.")
        embedding = embed_texts([normalized], task_type="RETRIEVAL_QUERY")[0]
        results = self.vector_store.search(embedding, top_k=top_k)
        return {
            "success": True,
            "query": normalized,
            "results": results,
        }

    def delete_document(self, document_id: str) -> dict:
        removed = self.vector_store.delete_document(document_id)
        if not removed:
            raise FileNotFoundError(f"Document {document_id} not found.")
        return {"success": True, "documentId": document_id, "deleted": True}

    def status(self) -> dict:
        return {
            "success": True,
            **self.vector_store.status(),
        }
