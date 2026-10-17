import json
import tempfile
import uuid
from threading import RLock
from pathlib import Path
from typing import Any

import numpy as np

_index_lock = RLock()


class KnowledgeIndexError(RuntimeError):
    pass


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
            index = json.loads(content)
            if not isinstance(index, dict) or any(
                not isinstance(metadata, dict) for metadata in index.values()
            ):
                raise KnowledgeIndexError("Knowledge index has an invalid structure.")
            return index
        except json.JSONDecodeError as exc:
            raise KnowledgeIndexError("Knowledge index contains invalid JSON.") from exc

    def _write_index(self, index: dict[str, dict[str, Any]]) -> None:
        temporary_path = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=self.root_dir,
                delete=False,
            ) as temporary_file:
                temporary_path = Path(temporary_file.name)
                temporary_file.write(json.dumps(index, ensure_ascii=False, indent=2))
            temporary_path.replace(self.index_path)
        except Exception:
            if temporary_path is not None:
                try:
                    temporary_path.unlink(missing_ok=True)
                except OSError:
                    pass
            raise

    def _document_meta_path(self, document_id: str) -> Path:
        return self.documents_dir / f"{document_id}.json"

    def _vector_path(self, document_id: str) -> Path:
        return self.vectors_dir / f"{document_id}.json"

    def _chunk_path(self, document_id: str) -> Path:
        return self.chunks_dir / f"{document_id}.json"

    def add_document(self, document_id: str, metadata: dict[str, Any], chunks: list[dict[str, Any]], embeddings: list[list[float]]) -> None:
        if len(chunks) != len(embeddings):
            raise ValueError("Chunk count and embedding count do not match.")

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
        artifacts = (
            (self._document_meta_path(document_id), json.dumps(metadata, ensure_ascii=False, indent=2)),
            (self._vector_path(document_id), json.dumps(vector_payload, ensure_ascii=False, indent=2)),
            (self._chunk_path(document_id), json.dumps(chunks, ensure_ascii=False, indent=2)),
        )
        with _index_lock:
            index = self._load_index()
            if document_id in index or any(path.exists() for path, _ in artifacts):
                raise FileExistsError(f"Knowledge document already exists: {document_id}")

            written_paths: list[Path] = []
            try:
                for path, content in artifacts:
                    written_paths.append(path)
                    path.write_text(content, encoding="utf-8")

                index[document_id] = metadata
                self._write_index(index)
            except Exception:
                for path in written_paths:
                    try:
                        path.unlink(missing_ok=True)
                    except OSError:
                        pass
                raise

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

    def assign_legacy_owner(self, owner_id: str) -> int:
        try:
            normalized_owner_id = str(uuid.UUID(owner_id))
        except (AttributeError, ValueError) as error:
            raise ValueError("A valid owner ID is required.") from error

        with _index_lock:
            index = self._load_index()
            updated_index = {key: dict(value) for key, value in index.items()}
            metadata_updates: dict[Path, dict[str, Any]] = {}
            index_changed = False
            updated_count = 0

            for document_id, indexed_metadata in updated_index.items():
                metadata_path = self._document_meta_path(document_id)
                if not metadata_path.is_file():
                    raise KnowledgeIndexError(
                        "A legacy knowledge document is missing its metadata file."
                    )
                try:
                    file_metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
                except (OSError, json.JSONDecodeError) as error:
                    raise KnowledgeIndexError(
                        "A legacy knowledge document has unreadable metadata."
                    ) from error
                if not isinstance(file_metadata, dict):
                    raise KnowledgeIndexError(
                        "A legacy knowledge document has invalid metadata."
                    )

                indexed_owner = indexed_metadata.get("ownerId")
                file_owner = file_metadata.get("ownerId")
                if indexed_owner and file_owner and indexed_owner != file_owner:
                    raise KnowledgeIndexError(
                        "Legacy knowledge ownership metadata is inconsistent."
                    )
                existing_owner = indexed_owner or file_owner
                if existing_owner:
                    if indexed_owner is None:
                        indexed_metadata["ownerId"] = existing_owner
                        index_changed = True
                    file_changed = False
                    if file_owner is None:
                        file_metadata["ownerId"] = existing_owner
                        file_changed = True
                    if file_changed:
                        metadata_updates[metadata_path] = file_metadata
                    if file_changed or indexed_owner is None:
                        updated_count += 1
                    continue
                else:
                    indexed_metadata["ownerId"] = normalized_owner_id
                    file_metadata["ownerId"] = normalized_owner_id
                    metadata_updates[metadata_path] = file_metadata
                    index_changed = True
                    updated_count += 1

            if not metadata_updates and not index_changed:
                return 0

            paths = ([self.index_path] if index_changed else []) + list(metadata_updates)
            originals = {
                path: path.read_bytes() if path.exists() else None
                for path in paths
            }
            try:
                for path, metadata in metadata_updates.items():
                    self._write_json_file(path, metadata)
                if index_changed:
                    self._write_index(updated_index)
            except Exception as error:
                rollback_failures = []
                for path, original in originals.items():
                    try:
                        if original is None:
                            path.unlink(missing_ok=True)
                        else:
                            self._write_bytes_atomically(path, original)
                    except OSError as rollback_error:
                        rollback_failures.append(rollback_error)
                if rollback_failures:
                    raise KnowledgeIndexError(
                        "Knowledge ownership migration failed and rollback was incomplete."
                    ) from error
                raise
            return updated_count

    def _write_json_file(self, path: Path, payload: dict[str, Any]) -> None:
        self._write_bytes_atomically(
            path,
            json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8"),
        )

    def _write_bytes_atomically(self, path: Path, content: bytes) -> None:
        temporary_path = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="wb",
                dir=path.parent,
                delete=False,
            ) as temporary_file:
                temporary_path = Path(temporary_file.name)
                temporary_file.write(content)
            temporary_path.replace(path)
        except Exception:
            if temporary_path is not None:
                try:
                    temporary_path.unlink(missing_ok=True)
                except OSError:
                    pass
            raise

    def search(self, query_embedding: list[float], top_k: int = 5) -> list[dict[str, Any]]:
        if not query_embedding:
            return []

        q = np.asarray(query_embedding, dtype=float)
        query_norm = np.linalg.norm(q)
        if query_norm == 0:
            return []

        indexed_document_ids = self._load_index()
        scored: list[dict[str, Any]] = []
        for path in sorted(self.vectors_dir.glob("*.json")):
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, TypeError, ValueError):
                continue
            if not isinstance(payload, list):
                continue
            for item in payload:
                if not isinstance(item, dict):
                    continue
                document_id = item.get("documentId")
                if not isinstance(document_id, str):
                    continue
                metadata = indexed_document_ids.get(document_id)
                if metadata is None or metadata.get("status", "indexed") != "indexed":
                    continue
                try:
                    vec = np.asarray(item.get("embedding") or [], dtype=float)
                except (TypeError, ValueError):
                    continue
                if vec.ndim != 1 or vec.size != q.size:
                    continue
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
        with _index_lock:
            index = self._load_index()
            if document_id not in index:
                return False

            index[document_id]["status"] = "deleting"
            self._write_index(index)

            for path in (
                self._vector_path(document_id),
                self._chunk_path(document_id),
                self._document_meta_path(document_id),
            ):
                path.unlink(missing_ok=True)

            for file_path in self.documents_dir.glob(f"{document_id}.*"):
                file_path.unlink(missing_ok=True)

            latest_index = self._load_index()
            latest_index.pop(document_id, None)
            self._write_index(latest_index)
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
        return {
            "documents": documents,
            "chunks": chunks,
            "vectorStore": "local",
            "embeddingConfigured": bool(os.environ.get("GEMINI_API_KEY")),
        }
