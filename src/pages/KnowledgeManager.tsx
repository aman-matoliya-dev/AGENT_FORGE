import { useEffect, useState } from 'react';
import { BookOpen, Database, FileText, Search, Trash2, Upload } from 'lucide-react';
import { deleteKnowledgeDocument, getKnowledgeStatus, listKnowledgeDocuments, searchKnowledge, uploadKnowledgeDocument, type KnowledgeDocument, type KnowledgeSearchResult } from '../utils/api';

export default function KnowledgeManager() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [status, setStatus] = useState<{ documents: number; chunks: number; vectorStore: string; embeddingConfigured: boolean } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = async () => {
    try {
      const [docResult, statusResult] = await Promise.all([
        listKnowledgeDocuments(),
        getKnowledgeStatus(),
      ]);
      setDocuments(docResult.documents ?? []);
      setStatus(statusResult);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to refresh knowledge state');
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('Select a .txt or .pdf file first.');
      return;
    }
    setUploading(true);
    setMessage('');
    try {
      await uploadKnowledgeDocument(selectedFile);
      setSelectedFile(null);
      setMessage(`Uploaded ${selectedFile.name}.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setMessage('Enter a query before searching.');
      return;
    }
    setSearching(true);
    setMessage('');
    try {
      const result = await searchKnowledge(searchQuery.trim(), 5);
      setSearchResults(result.results ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      await deleteKnowledgeDocument(documentId);
      setMessage('Document deleted.');
      await refresh();
      setSearchResults([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Delete failed');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-white/10 bg-[var(--surface-panel)] p-8 shadow-2xl shadow-violet-950/30">
        <div className="mb-6 flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-violet-300" />
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Phase 3A</p>
            <h1 className="font-display text-3xl font-bold text-white">Knowledge / Retrieval</h1>
          </div>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Upload a PDF or TXT file to build a local knowledge index. This is a retrieval foundation only — it does not yet feed agent answers automatically.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-white/10 bg-[var(--surface-panel)] p-6">
          <div className="mb-4 flex items-center gap-2 text-violet-200">
            <Upload className="h-5 w-5" />
            <h2 className="text-xl font-semibold text-white">Upload</h2>
          </div>
          <div className="space-y-4">
            <label htmlFor="knowledge-upload" className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-violet-500/40 bg-violet-500/5 px-4 py-3 text-sm text-slate-200 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-violet-500">
              <span id="knowledge-upload-label">Choose a .txt or .pdf file</span>
              {selectedFile && <span className="ml-3 truncate">{selectedFile.name}</span>}
              <input id="knowledge-upload" aria-labelledby="knowledge-upload-label" type="file" accept=".txt,.pdf" className="sr-only" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
            </label>
            <button
              className="af-primary-btn knowledge-upload-button w-full px-4 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
            >
              {uploading ? 'Uploading...' : 'Upload document'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[var(--surface-panel)] p-6">
          <div className="mb-4 flex items-center gap-2 text-cyan-200">
            <Database className="h-5 w-5" />
            <h2 className="text-xl font-semibold text-white">Status</h2>
          </div>
          {status ? (
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex justify-between"><span>Indexed documents</span><span>{status.documents}</span></div>
              <div className="flex justify-between"><span>Chunk count</span><span>{status.chunks}</span></div>
              <div className="flex justify-between"><span>Vector store</span><span>{status.vectorStore}</span></div>
              <div className="flex justify-between"><span>Embedding configured</span><span>{status.embeddingConfigured ? 'Yes' : 'No'}</span></div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Loading status…</p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-[var(--surface-panel)] p-6">
        <div className="mb-4 flex items-center gap-2 text-emerald-200">
          <Search className="h-5 w-5" />
          <h2 className="text-xl font-semibold text-white">Search</h2>
        </div>
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="Search uploaded knowledge"
            placeholder="Ask a question about your uploaded knowledge…"
            className="knowledge-search flex-1 rounded-xl border border-white/10 bg-[var(--surface-raised)] px-4 py-3 text-slate-200 outline-none ring-0 placeholder:text-slate-400"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {searchResults.length > 0 ? (
            searchResults.map((result) => (
              <div key={`${result.documentId}-${result.chunkId}`} className="rounded-xl border border-white/10 bg-[var(--surface-raised)] p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                  <span>{result.filename}</span>
                  <span>page {result.page ?? 1}</span>
                  <span>score {result.score.toFixed(3)}</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-200">{result.text}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">No search results yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[var(--surface-panel)] p-6">
        <div className="mb-4 flex items-center gap-2 text-amber-200">
          <FileText className="h-5 w-5" />
          <h2 className="text-xl font-semibold text-white">Indexed documents</h2>
        </div>
        <div className="space-y-3">
          {documents.length === 0 ? (
            <p className="text-sm text-slate-400">No documents indexed yet.</p>
          ) : (
            documents.map((doc) => (
              <div key={doc.documentId} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[var(--surface-raised)] p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-medium text-white">{doc.filename}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {doc.fileType} · {doc.chunkCount} chunks · {doc.status}
                  </div>
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-rose-200"
                  onClick={() => void handleDelete(doc.documentId)}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {message && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
          {message}
        </div>
      )}
    </div>
  );
}
