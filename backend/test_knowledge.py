import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.services.chunker import chunk_pages
from app.services.document_parser import normalize_text
from app.services.knowledge import KnowledgeService
from app.services.vector_store import LocalVectorStore


class KnowledgeFoundationTests(unittest.TestCase):
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
                {"documentId": "doc-1", "filename": "alpha.txt", "fileType": "txt", "size": 1, "createdAt": "2025-01-01T00:00:00Z", "chunkCount": 2, "status": "indexed"},
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

    def test_vector_store_search_ignores_document_after_vector_delete_fails(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            store = LocalVectorStore(tmpdir)
            for document_id in ("doc-1", "doc-2"):
                metadata = {
                    "documentId": document_id,
                    "filename": f"{document_id}.txt",
                    "createdAt": "2025-01-01T00:00:00Z",
                    "chunkCount": 1,
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

            self.assertNotIn("doc-1", store._load_index())
            results = store.search([1.0, 0.0], top_k=5)
            self.assertEqual([result["documentId"] for result in results], ["doc-2"])

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
