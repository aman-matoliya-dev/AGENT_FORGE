import os
import tempfile
import threading
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from fastapi import HTTPException

from app.models.knowledge_models import KnowledgeSearchRequest
from app.api.knowledge_routes import delete_document, search_documents
from app.services import embedding_service, vector_store
from app.services.chunker import chunk_pages
from app.services.document_parser import normalize_text
from app.services.knowledge import KnowledgeService
from app.services.vector_store import KnowledgeIndexError, LocalVectorStore


class KnowledgeFoundationTests(unittest.TestCase):
    def test_embedding_provider_errors_are_sanitized(self):
        client = SimpleNamespace(
            models=SimpleNamespace(embed_content=Mock(side_effect=ValueError("provider failure")))
        )
        with patch.object(embedding_service, "_get_client", return_value=client):
            for call in (
                lambda: embedding_service.embed_text("private input"),
                lambda: embedding_service.embed_texts(["private input"]),
            ):
                with self.subTest(call=call), self.assertLogs(
                    embedding_service.logger, level="ERROR"
                ):
                    with self.assertRaisesRegex(RuntimeError, "^Embedding request failed\\.$") as raised:
                        call()
                    self.assertIsInstance(raised.exception.__cause__, ValueError)

    def test_search_route_preserves_embedding_runtime_error(self):
        with patch(
            "app.api.knowledge_routes.knowledge_service.search",
            side_effect=RuntimeError("Embedding request failed."),
        ):
            with self.assertRaises(HTTPException) as raised:
                search_documents(KnowledgeSearchRequest(query="query"))

        self.assertEqual(raised.exception.status_code, 500)
        self.assertEqual(raised.exception.detail, "Embedding request failed.")

    def test_search_route_returns_safe_error_for_corrupt_index(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            service = KnowledgeService(tmpdir)
            service.vector_store.index_path.write_text(
                '{"corrupt": invalid}', encoding="utf-8"
            )
            with patch("app.api.knowledge_routes.knowledge_service", service), patch(
                "app.services.knowledge.embed_texts", return_value=[[1.0, 0.0]]
            ):
                with self.assertRaises(HTTPException) as raised:
                    search_documents(KnowledgeSearchRequest(query="query"))

        self.assertEqual(raised.exception.status_code, 500)
        self.assertEqual(
            raised.exception.detail,
            "The knowledge index could not be read. Please contact the administrator.",
        )
        self.assertNotIn("invalid", raised.exception.detail)

    def test_embed_texts_batches_at_50_and_preserves_input_order(self):
        texts = [f"text-{index}" for index in range(107)]
        batch_sizes = []

        def embed_content(*, model, contents, config):
            batch_sizes.append(len(contents))
            return SimpleNamespace(embeddings=[
                SimpleNamespace(values=[float(int(text.split("-")[1]))])
                for text in contents
            ])

        client = SimpleNamespace(models=SimpleNamespace(embed_content=embed_content))
        with patch.object(embedding_service, "_get_client", return_value=client):
            vectors = embedding_service.embed_texts(texts)

        self.assertEqual(batch_sizes, [50, 50, 7])
        self.assertEqual(len(vectors), len(texts))
        self.assertEqual(vectors, [[float(index)] for index in range(len(texts))])

    def test_vector_store_rejects_invalid_index_without_changing_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            store = LocalVectorStore(tmpdir)
            original_content = b'{"doc-1": invalid}'
            store.index_path.write_bytes(original_content)

            with self.assertRaisesRegex(RuntimeError, "Knowledge index contains invalid JSON"):
                store._load_index()

            self.assertEqual(store.index_path.read_bytes(), original_content)

    def test_vector_store_empty_or_missing_index_is_empty(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            store = LocalVectorStore(tmpdir)
            self.assertEqual(store._load_index(), {})
            store.index_path.write_text(" \r\n\t", encoding="utf-8")
            self.assertEqual(store._load_index(), {})

    def test_embedding_status_depends_on_api_key_not_env_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            store = LocalVectorStore(tmpdir)
            env_path = Path(vector_store.__file__).resolve().parents[2] / ".env"
            original_exists = Path.exists

            def exists_with_env_file(path):
                if path == env_path:
                    return True
                return original_exists(path)

            with patch.dict(os.environ):
                os.environ.pop("GEMINI_API_KEY", None)
                with patch.object(Path, "exists", exists_with_env_file):
                    self.assertFalse(store.status()["embeddingConfigured"])

            def exists_without_env_file(path):
                if path == env_path:
                    return False
                return original_exists(path)

            with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}):
                with patch.object(Path, "exists", exists_without_env_file):
                    self.assertTrue(store.status()["embeddingConfigured"])

    def test_vector_store_search_skips_vector_file_that_disappears(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            store = LocalVectorStore(tmpdir)
            for document_id in ("doc-1", "doc-2"):
                store.add_document(
                    document_id,
                    {"documentId": document_id, "filename": f"{document_id}.txt"},
                    [{"chunk_id": f"{document_id}-chunk", "text": document_id}],
                    [[1.0, 0.0]],
                )

            original_read_text = Path.read_text

            def fail_disappeared_file(path, *args, **kwargs):
                if path == store._vector_path("doc-1"):
                    raise FileNotFoundError(path)
                return original_read_text(path, *args, **kwargs)

            with patch.object(Path, "read_text", fail_disappeared_file):
                results = store.search([1.0, 0.0])

            self.assertEqual([result["documentId"] for result in results], ["doc-2"])

    def test_index_lock_can_be_reentered_by_same_thread(self):
        lock = vector_store._index_lock
        self.assertTrue(lock.acquire(timeout=1))
        try:
            self.assertTrue(lock.acquire(timeout=0.1))
            lock.release()
        finally:
            lock.release()

    def test_normalize_text_and_chunking(self):
        raw = "hello\r\n\r\n   world\n\n\nnext\n\nline"
        cleaned = normalize_text(raw)
        self.assertIn("hello", cleaned)
        self.assertIn("world", cleaned)
        self.assertNotIn("\r", cleaned)

        pages = [{"page_number": 1, "text": "Paragraph one.\n\nParagraph two.\n\nParagraph three."}]
        chunks = chunk_pages(pages, "notes.txt")
        self.assertTrue(len(chunks) >= 1)
        self.assertIn("text", chunks[0])

    def test_vector_store_search_orders_by_similarity(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            store = LocalVectorStore(tmpdir)
            store.add_document(
                "doc-1",
                {"documentId": "doc-1", "filename": "alpha.txt", "fileType": "txt", "size": 1, "createdAt": "2025-01-01T00:00:00Z", "chunkCount": 2},
                [
                    {"chunk_id": "c1", "chunk_index": 0, "page_number": 1, "source_filename": "alpha.txt", "text": "cats are pets"},
                    {"chunk_id": "c2", "chunk_index": 1, "page_number": 1, "source_filename": "alpha.txt", "text": "dogs are not cats"},
                ],
                [[1.0, 0.0], [0.5, 0.5]],
            )
            results = store.search([1.0, 0.0], top_k=2)
            self.assertTrue(results[0]["chunkId"] == "c1")
            self.assertTrue(results[0]["score"] >= results[1]["score"])

    def test_vector_store_search_ignores_orphan_vector_artifacts(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            store = LocalVectorStore(tmpdir)
            store._vector_path("orphan").write_text(
                '[{"documentId":"orphan","chunkId":"orphan-chunk",'
                '"filename":"orphan.txt","embedding":[1.0,0.0],'
                '"text":"orphan content"}]',
                encoding="utf-8",
            )

            self.assertEqual(store.search([1.0, 0.0]), [])

    def test_failed_vector_delete_keeps_document_and_retry_succeeds(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            store = LocalVectorStore(tmpdir)
            for document_id in ("doc-1", "doc-2"):
                metadata = {
                    "documentId": document_id,
                    "filename": f"{document_id}.txt",
                    "createdAt": "2025-01-01T00:00:00Z",
                    "chunkCount": 1,
                    "status": "indexed",
                }
                chunks = [{
                    "chunk_id": f"{document_id}-chunk",
                    "page_number": 1,
                    "text": f"{document_id} content",
                }]
                store.add_document(document_id, metadata, chunks, [[1.0, 0.0]])

            original_unlink = Path.unlink

            def fail_deleted_vector(path, *args, **kwargs):
                if path == store._vector_path("doc-1"):
                    raise OSError("simulated vector-file deletion failure")
                return original_unlink(path, *args, **kwargs)

            with patch.object(Path, "unlink", fail_deleted_vector):
                with self.assertRaisesRegex(OSError, "simulated vector-file deletion failure"):
                    store.delete_document("doc-1")

            self.assertEqual(store.get_document("doc-1")["status"], "deleting")
            self.assertIn("doc-1", {doc["documentId"] for doc in store.list_documents()})
            results = store.search([1.0, 0.0], top_k=5)
            self.assertEqual([result["documentId"] for result in results], ["doc-2"])

            self.assertTrue(store.delete_document("doc-1"))
            self.assertNotIn("doc-1", store._load_index())
            self.assertFalse(store._vector_path("doc-1").exists())
            self.assertFalse(store._chunk_path("doc-1").exists())
            self.assertFalse(store._document_meta_path("doc-1").exists())
            self.assertEqual(
                [result["documentId"] for result in store.search([1.0, 0.0])],
                ["doc-2"],
            )

    def test_delete_retry_succeeds_when_vector_was_already_removed(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            store = LocalVectorStore(tmpdir)
            metadata = {
                "documentId": "doc-1",
                "filename": "doc-1.txt",
                "createdAt": "2025-01-01T00:00:00Z",
                "chunkCount": 1,
                "status": "indexed",
            }
            chunks = [{"chunk_id": "doc-1-chunk", "text": "doc-1 content"}]
            store.add_document("doc-1", metadata, chunks, [[1.0, 0.0]])
            store._vector_path("doc-1").unlink()

            self.assertTrue(store.delete_document("doc-1"))
            self.assertNotIn("doc-1", store._load_index())
            self.assertFalse(store._chunk_path("doc-1").exists())
            self.assertFalse(store._document_meta_path("doc-1").exists())

    def test_add_during_delete_preserves_new_index_entry(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            store = LocalVectorStore(tmpdir)
            store.add_document(
                "doc-1",
                {"documentId": "doc-1", "filename": "doc-1.txt", "status": "indexed"},
                [{"chunk_id": "doc-1-c1", "text": "first document"}],
                [[1.0, 0.0]],
            )
            deletion_paused = threading.Event()
            allow_delete_to_finish = threading.Event()
            add_waiting_for_lock = threading.Event()
            add_was_blocked = []
            delete_results = []
            thread_errors = []
            write_index = store._write_index
            index_lock = threading.Lock()

            class ObservedLock:
                def __enter__(self):
                    if threading.current_thread().name == "concurrent-add":
                        blocked = not index_lock.acquire(blocking=False)
                        add_was_blocked.append(blocked)
                        if not blocked:
                            index_lock.release()
                        add_waiting_for_lock.set()
                    index_lock.acquire()

                def __exit__(self, exc_type, exc_value, traceback):
                    index_lock.release()

            def pause_after_marking_deleting(index):
                write_index(index)
                if index.get("doc-1", {}).get("status") == "deleting":
                    deletion_paused.set()
                    if not allow_delete_to_finish.wait(timeout=5):
                        raise TimeoutError("test did not release deletion")

            def delete_original():
                try:
                    delete_results.append(store.delete_document("doc-1"))
                except Exception as exc:
                    thread_errors.append(exc)

            def add_concurrent():
                try:
                    store.add_document(
                        "doc-2",
                        {"documentId": "doc-2", "filename": "doc-2.txt", "status": "indexed"},
                        [{"chunk_id": "doc-2-c1", "text": "second document"}],
                        [[0.0, 1.0]],
                    )
                except Exception as exc:
                    thread_errors.append(exc)

            with patch("app.services.vector_store._index_lock", ObservedLock()), \
                    patch.object(store, "_write_index", pause_after_marking_deleting):
                delete_thread = threading.Thread(target=delete_original, name="concurrent-delete")
                add_thread = threading.Thread(target=add_concurrent, name="concurrent-add")
                delete_thread.start()
                self.assertTrue(deletion_paused.wait(timeout=5))
                add_thread.start()
                self.assertTrue(add_waiting_for_lock.wait(timeout=5))
                allow_delete_to_finish.set()
                delete_thread.join(timeout=5)
                add_thread.join(timeout=5)

            self.assertFalse(delete_thread.is_alive())
            self.assertFalse(add_thread.is_alive())
            self.assertEqual(add_was_blocked, [True])
            self.assertEqual(thread_errors, [])
            self.assertEqual(delete_results, [True])
            self.assertNotIn("doc-1", store._load_index())
            self.assertIn("doc-2", store._load_index())
            self.assertEqual(
                [result["documentId"] for result in store.search([0.0, 1.0])],
                ["doc-2"],
            )

    def test_delete_route_returns_safe_error_for_filesystem_failure(self):
        with patch(
            "app.api.knowledge_routes.knowledge_service.delete_document",
            side_effect=OSError("failed at C:\\private\\knowledge\\doc.json"),
        ):
            with self.assertRaises(HTTPException) as raised:
                delete_document("doc-1")

        self.assertEqual(raised.exception.status_code, 500)
        self.assertNotIn("C:\\private", raised.exception.detail)

    def test_delete_document_removes_only_its_index_and_artifacts(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            store = LocalVectorStore(tmpdir)
            for document_id in ("doc-1", "doc-2"):
                metadata = {
                    "documentId": document_id,
                    "filename": f"{document_id}.txt",
                    "fileType": "txt",
                    "size": 1,
                    "createdAt": "2025-01-01T00:00:00Z",
                    "chunkCount": 1,
                    "status": "indexed",
                }
                chunks = [{
                    "chunk_id": f"{document_id}-chunk",
                    "chunk_index": 0,
                    "page_number": 1,
                    "source_filename": metadata["filename"],
                    "text": document_id,
                }]
                store.add_document(document_id, metadata, chunks, [[1.0, 0.0]])

            retained_paths = (
                store._document_meta_path("doc-2"),
                store._vector_path("doc-2"),
                store._chunk_path("doc-2"),
            )
            retained_contents = [path.read_bytes() for path in retained_paths]

            self.assertTrue(store.delete_document("doc-1"))
            self.assertNotIn("doc-1", store._load_index())
            self.assertIn("doc-2", store._load_index())
            self.assertEqual([path.exists() for path in (
                store._document_meta_path("doc-1"),
                store._vector_path("doc-1"),
                store._chunk_path("doc-1"),
            )], [False, False, False])
            self.assertEqual(
                [path.read_bytes() for path in retained_paths],
                retained_contents,
            )

    def test_upload_document_creates_indexed_metadata(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            service = KnowledgeService(tmpdir)
            original = __import__('app.services.knowledge', fromlist=['embed_texts']).embed_texts
            __import__('app.services.knowledge', fromlist=['embed_texts']).embed_texts = lambda texts, task_type='RETRIEVAL_DOCUMENT': [
                [1.0, 0.0, 0.0] for _ in texts
            ]
            try:
                result = service.upload_document("sample.txt", b"Alpha beta gamma.\n\nAlpha beta gamma again.", content_type="text/plain")
                self.assertEqual(result["status"], "indexed")
                self.assertGreater(result["chunkCount"], 0)
                self.assertEqual(len(service.list_documents()), 1)
            finally:
                __import__('app.services.knowledge', fromlist=['embed_texts']).embed_texts = original

    def test_failed_vector_write_does_not_publish_or_remove_existing_documents(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            service = KnowledgeService(tmpdir)
            with patch(
                "app.services.knowledge.embed_texts",
                return_value=[[1.0, 0.0, 0.0]],
            ):
                existing = service.upload_document(
                    "existing.txt", b"Existing indexed document.", content_type="text/plain"
                )
                store = service.vector_store
                directories = (store.documents_dir, store.vectors_dir, store.chunks_dir)
                files_before = {
                    directory: {path.name for path in directory.iterdir()}
                    for directory in directories
                }
                index_before = store.index_path.read_bytes()
                write_text = Path.write_text

                def fail_vector_write(path, data, *args, **kwargs):
                    if path.parent == store.vectors_dir:
                        raise OSError("simulated vector-file write failure")
                    return write_text(path, data, *args, **kwargs)

                with patch.object(Path, "write_text", fail_vector_write):
                    with self.assertRaisesRegex(OSError, "simulated vector-file write failure"):
                        service.upload_document(
                            "failed.txt", b"Failed document.", content_type="text/plain"
                        )

                self.assertEqual(
                    [doc["documentId"] for doc in service.list_documents()],
                    [existing["documentId"]],
                )
                self.assertEqual(
                    set(store._load_index()),
                    {existing["documentId"]},
                )
                self.assertEqual(store.index_path.read_bytes(), index_before)
                for directory in directories:
                    self.assertEqual(
                        {path.name for path in directory.iterdir()},
                        files_before[directory],
                    )


if __name__ == "__main__":
    unittest.main()
