import tempfile
import unittest
from pathlib import Path

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


if __name__ == "__main__":
    unittest.main()
