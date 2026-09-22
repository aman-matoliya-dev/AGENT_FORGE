import json
from pathlib import Path
from typing import Any

import numpy as np


class LocalVectorStore:
    def __init__(self, root_dir: str | Path | None = None):
        self.root_dir = Path(root_dir) if root_dir else Path(__file__).resolve().parents[2] / "data" / "knowledge"
        self.documents_dir = self.root_dir / "documents"
        self.vectors_dir = self.root_dir / "vectors"
        self.chunks_dir = self.root_dir / "chunks"
        self.index_path = self.root_dir / "index.json"
        for folder in (self.root_dir, self.documents_dir, self.vectors_dir, self.chunks_dir):
            folder.mkdir(parents=True, exist_ok=True)

    def _load_index(self) -> dict[str, dict[str, Any]]:
        if not self.index_path.exists():
            return {}
        try:
            content = self.index_path.read_text(encoding="utf-8")
            if not content.strip():
                return {}
            return json.loads(content)
        except json.JSONDecodeError:
            return {}

    def _write_index(self, index: dict[str, dict[str, Any]]) -> None:
        self.index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")

    def _document_meta_path(self, document_id: str) -> Path:
        return self.documents_dir / f"{document_id}.json"

    def _vector_path(self, document_id: str) -> Path:
        return self.vectors_dir / f"{document_id}.json"

    def _chunk_path(self, document_id: str) -> Path:
        return self.chunks_dir / f"{document_id}.json"

    def add_document(self, document_id: str, metadata: dict[str, Any], chunks: list[dict[str, Any]], embeddings: list[list[float]]) -> None:
        if len(chunks) != len(embeddings):
            raise ValueError("Chunk count and embedding count do not match.")

        index = self._load_index()
        index[document_id] = metadata
        self._write_index(index)
        self._document_meta_path(document_id).write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

        vector_payload = []
        for chunk, embedding in zip(chunks, embeddings):
            vector_payload.append({
                "chunkId": chunk["chunk_id"],
                "documentId": document_id,
                "filename": metadata["filename"],
                "page": chunk.get("page_number"),
                "score": 0.0,
                "text": chunk["text"],
                "embedding": embedding,
            })
        self._vector_path(document_id).write_text(json.dumps(vector_payload, ensure_ascii=False, indent=2), encoding="utf-8")

        self._chunk_path(document_id).write_text(json.dumps(chunks, ensure_ascii=False, indent=2), encoding="utf-8")

    def list_documents(self) -> list[dict[str, Any]]:
        documents = []
        for key, value in self._load_index().items():
            doc = dict(value)
            doc["documentId"] = key
            documents.append(doc)
        return sorted(documents, key=lambda item: item.get("createdAt", ""), reverse=True)

    def get_document(self, document_id: str) -> dict[str, Any] | None:
        index = self._load_index()
        return index.get(document_id)

    def search(self, query_embedding: list[float], top_k: int = 5) -> list[dict[str, Any]]:
        if not query_embedding:
            return []

        q = np.asarray(query_embedding, dtype=float)
        query_norm = np.linalg.norm(q)
        if query_norm == 0:
            return []

        scored: list[dict[str, Any]] = []
        for path in sorted(self.vectors_dir.glob("*.json")):
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
            except (TypeError, ValueError):
                continue
            for item in payload:
                vec = np.asarray(item.get("embedding") or [], dtype=float)
                if vec.size == 0:
                    continue
                doc_norm = np.linalg.norm(vec)
                if doc_norm == 0:
                    continue
                similarity = float(np.dot(q, vec) / (query_norm * doc_norm))
                scored.append({
                    "documentId": item.get("documentId"),
                    "chunkId": item.get("chunkId"),
                    "filename": item.get("filename"),
                    "page": item.get("page"),
                    "score": round(float(similarity), 6),
                    "text": item.get("text", ""),
                })

        scored.sort(key=lambda item: item["score"], reverse=True)
        return scored[:max(1, top_k)]

    def delete_document(self, document_id: str) -> bool:
        index = self._load_index()
        if document_id not in index:
            return False
        del index[document_id]
        self._write_index(index)

        for path in (
            self._document_meta_path(document_id),
            self._vector_path(document_id),
            self._chunk_path(document_id),
        ):
            if path.exists():
                path.unlink()

        for file_path in self.documents_dir.glob(f"{document_id}.*"):
            if file_path.exists():
                file_path.unlink()
        return True

    def status(self) -> dict[str, Any]:
        import os

        index = self._load_index()
        documents = len(index)
        chunks = 0
        for path in self.chunks_dir.glob("*.json"):
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
            except (TypeError, ValueError):
                continue
            chunks += len(payload)
        env_path = Path(__file__).resolve().parents[2] / ".env"
        return {
            "documents": documents,
            "chunks": chunks,
            "vectorStore": "local",
            "embeddingConfigured": bool(os.environ.get("GEMINI_API_KEY") or env_path.exists()),
        }
