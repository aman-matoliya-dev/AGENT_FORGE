import { useCallback, useEffect, useState } from 'react';
import { Activity, CheckCircle2, Clock3, LoaderCircle, RefreshCw, XCircle } from 'lucide-react';
import { getExecutionRun, listExecutionRuns, type ExecutionRun } from '../utils/api';

function formatDate(value: string | null): string {
  if (!value) return 'In progress';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}

function formatDuration(value: number | null): string {
  if (value === null) return 'Not available';
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)} s`;
}

function Status({ status }: { status: ExecutionRun['status'] }) {
  if (status === 'succeeded') {
    return <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 text-xs font-semibold text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Succeeded</span>;
  }
  if (status === 'failed') {
    return <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/25 bg-rose-400/[0.08] px-2.5 py-1 text-xs font-semibold text-rose-300"><XCircle className="h-3.5 w-3.5" /> Failed</span>;
  }
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/[0.08] px-2.5 py-1 text-xs font-semibold text-amber-200"><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Running</span>;
}

export default function ExecutionHistory() {
  const [runs, setRuns] = useState<ExecutionRun[]>([]);
  const [limit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedRun, setSelectedRun] = useState<ExecutionRun | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listExecutionRuns(limit, offset);
      setRuns(result.runs);
      setHasMore(result.hasMore);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load execution history.');
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const showDetails = async (runId: number) => {
    if (selectedId === runId) {
      setSelectedId(null);
      setSelectedRun(null);
      return;
    }
    setSelectedId(runId);
    setSelectedRun(null);
    setDetailsError('');
    setDetailsLoading(true);
    try {
      setSelectedRun(await getExecutionRun(runId));
    } catch (cause) {
      setDetailsError(cause instanceof Error ? cause.message : 'Could not load run details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Agent activity</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">Execution History</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Review recent agent runs, their status, provider, duration, and safe execution metadata.
          </p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/40 hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <section className="panel rounded-2xl p-5 sm:p-6" aria-labelledby="execution-list-heading">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-200"><Activity className="h-5 w-5" /></span>
          <div>
            <h2 id="execution-list-heading" className="font-display text-lg font-bold text-white">Recent runs</h2>
            <p className="mt-0.5 text-sm text-slate-400">Showing {runs.length} run{runs.length === 1 ? '' : 's'} on this page</p>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/25 bg-rose-400/[0.06] p-4 text-sm text-rose-200">
            <span>{error}</span>
            <button type="button" onClick={() => void refresh()} className="font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-200">Retry</button>
          </div>
        )}

        {loading ? (
          <div role="status" className="flex items-center justify-center gap-3 py-16 text-sm text-slate-300">
            <LoaderCircle className="h-5 w-5 animate-spin text-cyan-300" /> Loading execution history…
          </div>
        ) : !error && runs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-12 text-center">
            <Activity className="mx-auto h-10 w-10 text-cyan-300" />
            <h3 className="mt-4 font-display text-xl font-bold text-white">No runs recorded yet</h3>
            <p className="mt-2 text-sm text-slate-400">Run an agent from the Builder and its execution will appear here.</p>
          </div>
        ) : runs.length > 0 ? (
          <div className="space-y-3">
            {runs.map((run) => (
              <article key={run.runId} className="rounded-xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-display text-base font-bold text-white">{run.agentName || 'Agent run'}</h3>
                      <Status status={run.status} />
                    </div>
                    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                      <span>{formatDate(run.createdAt)}</span>
                      <span>{run.provider}{run.model ? ` · ${run.model}` : ''}</span>
                      <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{formatDuration(run.durationMs)}</span>
                    </p>
                    {run.resultSummary && <p className="text-sm text-slate-300">{run.resultSummary}</p>}
                    {run.errorSummary && <p className="text-sm text-rose-200">{run.errorSummary}</p>}
                  </div>
                  <button type="button" onClick={() => void showDetails(run.runId)} aria-expanded={selectedId === run.runId}
                    className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                    {selectedId === run.runId ? 'Hide details' : 'View details'}
                  </button>
                </div>
                {selectedId === run.runId && (
                  <div className="mt-4 border-t border-white/[0.08] pt-4" aria-live="polite">
                    {detailsLoading ? (
                      <p role="status" className="text-sm text-slate-400">Loading run details…</p>
                    ) : detailsError ? (
                      <p role="alert" className="text-sm text-rose-200">{detailsError}</p>
                    ) : selectedRun ? (
                      <dl className="grid gap-3 text-sm sm:grid-cols-2">
                        <div><dt className="text-xs uppercase tracking-wider text-slate-500">Run ID</dt><dd className="mt-1 text-slate-200">{selectedRun.runId}</dd></div>
                        <div><dt className="text-xs uppercase tracking-wider text-slate-500">Completed</dt><dd className="mt-1 text-slate-200">{formatDate(selectedRun.completedAt)}</dd></div>
                        <div><dt className="text-xs uppercase tracking-wider text-slate-500">Input length</dt><dd className="mt-1 text-slate-200">{selectedRun.messageLength} characters (prompt content is not stored)</dd></div>
                        <div><dt className="text-xs uppercase tracking-wider text-slate-500">Tools used</dt><dd className="mt-1 text-slate-200">{selectedRun.toolsUsed.length ? selectedRun.toolsUsed.join(', ') : 'None recorded'}</dd></div>
                        {selectedRun.resultSummary && <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-slate-500">Result summary</dt><dd className="mt-1 text-slate-200">{selectedRun.resultSummary}</dd></div>}
                        {selectedRun.errorSummary && <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-slate-500">Error summary</dt><dd className="mt-1 text-rose-200">{selectedRun.errorSummary}</dd></div>}
                      </dl>
                    ) : null}
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4">
          <button type="button" onClick={() => setOffset((current) => Math.max(0, current - limit))} disabled={loading || offset === 0}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-40">
            Previous
          </button>
          <span className="text-xs text-slate-500">Runs {runs.length ? offset + 1 : 0}–{offset + runs.length}</span>
          <button type="button" onClick={() => setOffset((current) => current + limit)} disabled={loading || !hasMore}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-40">
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
