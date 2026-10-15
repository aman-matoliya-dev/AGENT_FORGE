import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, CalendarClock, Cpu, LoaderCircle, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { deleteSavedAgent, listSavedAgents, updateSavedAgent, type SavedAgent, type SavedAgentInput } from '../utils/api';
import { PrimaryBtn } from '../components/ui';

const emptyAgent: SavedAgentInput = {
  name: '',
  description: '',
  purpose: '',
  personality: 'helpful and friendly',
  provider: 'ollama',
  model: 'llama3.2:latest',
  agentType: 'general',
  tools: [],
  memory: 'buffer',
  knowledge: 'none',
  outputStyle: 'concise',
};

function updatedLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Updated date unavailable'
    : `Updated ${date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`;
}

export default function MyAgents() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<SavedAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [editing, setEditing] = useState<SavedAgent | null>(null);
  const [form, setForm] = useState<SavedAgentInput>(emptyAgent);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setAgents(await listSavedAgents());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load saved agents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!editing) return;
    nameInput.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) {
        setEditing(null);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)',
      ));
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [editing, saving]);

  const openEdit = (agent: SavedAgent) => {
    setEditing(agent);
    setForm({
      name: agent.name,
      description: agent.description ?? '',
      purpose: agent.purpose ?? '',
      personality: agent.personality ?? '',
      provider: agent.provider,
      model: agent.model ?? '',
      agentType: agent.agentType ?? 'general',
      tools: agent.tools ?? [],
      memory: agent.memory === 'summary' ? 'buffer' : agent.memory ?? 'buffer',
      knowledge: agent.knowledge ?? 'none',
      outputStyle: agent.outputStyle ?? 'concise',
    });
    setFeedback('');
  };

  const submitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing || saving) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateSavedAgent(editing.id, { ...form, model: form.model?.trim() || null });
      setAgents((current) => current.map((agent) => agent.id === updated.id ? updated : agent));
      setEditing(null);
      setFeedback(`Saved changes to ${updated.name}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this agent.');
    } finally {
      setSaving(false);
    }
  };

  const deleteAgent = async (agent: SavedAgent) => {
    if (!window.confirm(`Delete "${agent.name}"? This cannot be undone.`)) return;
    setDeletingId(agent.id);
    setError('');
    setFeedback('');
    try {
      await deleteSavedAgent(agent.id);
      setAgents((current) => current.filter((item) => item.id !== agent.id));
      setFeedback(`${agent.name} was deleted.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete this agent.');
    } finally {
      setDeletingId(null);
    }
  };

  const startCreate = () => {
    setForm(emptyAgent);
    setEditing(null);
    navigate('/builder');
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-300">Agent workspace</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">My Agents</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Manage your saved AI agent configurations. Saved agents are stored by AGENT_FORGE and are separate from running or generating an agent.
          </p>
        </div>
        <PrimaryBtn onClick={startCreate} className="shrink-0">
          <Plus className="h-4 w-4" /> Create Agent
        </PrimaryBtn>
      </header>

      <section className="panel rounded-2xl p-5 sm:p-6" aria-labelledby="saved-agent-list-title">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="saved-agent-list-title" className="font-display text-lg font-bold text-white">Saved configurations</h2>
            <p className="mt-1 text-sm text-slate-400">{agents.length} {agents.length === 1 ? 'agent' : 'agents'} saved</p>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300 transition hover:border-violet-400/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/25 bg-rose-400/[0.06] p-4 text-sm text-rose-200">
            <span>{error}</span>
            <button type="button" onClick={() => void refresh()} className="font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-200">Retry</button>
          </div>
        )}
        {feedback && <p role="status" className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-sm text-emerald-200">{feedback}</p>}

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-300" role="status">
            <LoaderCircle className="h-5 w-5 animate-spin text-violet-300" /> Loading saved agents…
          </div>
        ) : !error && agents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-12 text-center">
            <Bot className="mx-auto h-10 w-10 text-violet-300" />
            <h3 className="mt-4 font-display text-xl font-bold text-white">No saved agents yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
              Build an agent, then save its configuration to see it here. Creating or testing an agent in the Builder does not save it automatically.
            </p>
            <PrimaryBtn onClick={startCreate} className="mt-6"><Plus className="h-4 w-4" /> Create your first agent</PrimaryBtn>
          </div>
        ) : agents.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <article key={agent.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-violet-400/30">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-violet-400/25 bg-violet-400/[0.08] text-violet-200">
                    <Bot className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-lg font-bold text-white">{agent.name}</h3>
                    {agent.description && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-400">{agent.description}</p>}
                  </div>
                </div>
                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex items-start gap-2 text-slate-300">
                    <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                    <div><dt className="sr-only">Provider and model</dt><dd>{agent.provider}{agent.model ? ` · ${agent.model}` : ' · default model'}</dd></div>
                  </div>
                  {agent.agentType && <div className="flex justify-between gap-3"><dt className="text-slate-500">Type</dt><dd className="text-right text-slate-300">{agent.agentType}</dd></div>}
                  {agent.knowledge && <div className="flex justify-between gap-3"><dt className="text-slate-500">Knowledge</dt><dd className="text-right text-slate-300">{agent.knowledge === 'rag' ? 'RAG enabled' : 'Disabled'}</dd></div>}
                  {agent.updatedAt && <div className="flex items-center gap-2 text-xs text-slate-400"><CalendarClock className="h-3.5 w-3.5" /><dt className="sr-only">Last updated</dt><dd>{updatedLabel(agent.updatedAt)}</dd></div>}
                </dl>
                <div className="mt-5 flex gap-2 border-t border-white/[0.07] pt-4">
                  <button type="button" onClick={() => openEdit(agent)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-violet-400/40 hover:bg-violet-400/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                  <button type="button" onClick={() => void deleteAgent(agent)} disabled={deletingId === agent.id}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-400/20 bg-rose-400/[0.04] px-3 py-2 text-sm font-medium text-rose-200 transition hover:border-rose-400/50 hover:bg-rose-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300 disabled:opacity-60"
                    aria-label={`Delete ${agent.name}`}>
                    {deletingId === agent.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditing(null); }}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="edit-agent-title"
            className="dark-canvas my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#11111f] p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div><h2 id="edit-agent-title" className="font-display text-2xl font-bold text-white">Edit saved agent</h2><p className="mt-1 text-sm text-slate-400">Update this saved configuration.</p></div>
              <button type="button" onClick={() => setEditing(null)} disabled={saving} aria-label="Close editor"
                className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 disabled:opacity-60"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={submitEdit} className="space-y-4">
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-300">Name</span><input ref={nameInput} required minLength={2} maxLength={64} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="field" /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-300">Description</span><textarea maxLength={1000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="field min-h-20 resize-y" /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-300">Purpose</span><textarea maxLength={500} value={form.purpose} onChange={(event) => setForm({ ...form, purpose: event.target.value })} className="field min-h-20 resize-y" /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-300">Personality</span><input maxLength={500} value={form.personality} onChange={(event) => setForm({ ...form, personality: event.target.value })} className="field" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-300">Provider</span><select value={form.provider} onChange={(event) => { const provider = event.target.value as SavedAgentInput['provider']; setForm({ ...form, provider, model: provider === 'gemini' ? 'gemini-3.6-flash' : 'llama3.2:latest' }); }} className="field"><option value="ollama">Ollama</option><option value="gemini">Gemini</option></select></label>
                <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-300">Model (optional)</span><input maxLength={120} value={form.model ?? ''} onChange={(event) => setForm({ ...form, model: event.target.value })} className="field" /></label>
                <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-300">Agent type</span><select value={form.agentType} onChange={(event) => setForm({ ...form, agentType: event.target.value })} className="field">{['general', 'coding', 'research', 'rag', 'creative'].map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
                <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-300">Memory</span><select value={form.memory} onChange={(event) => setForm({ ...form, memory: event.target.value as SavedAgentInput['memory'] })} className="field">{['none', 'buffer', 'window'].map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></label>
                <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-300">Knowledge</span><select value={form.knowledge} onChange={(event) => setForm({ ...form, knowledge: event.target.value as SavedAgentInput['knowledge'] })} className="field"><option value="none">Disabled</option><option value="rag">RAG</option></select></label>
                <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-300">Output style</span><select value={form.outputStyle} onChange={(event) => setForm({ ...form, outputStyle: event.target.value as SavedAgentInput['outputStyle'] })} className="field">{['concise', 'detailed', 'steps'].map((style) => <option key={style} value={style}>{style}</option>)}</select></label>
              </div>
              <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium text-slate-300">Tools</legend>{Array.from(new Set([...form.tools, 'calculator', 'datetime'])).map((tool) => <label key={tool} className="mr-5 inline-flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.tools.includes(tool)} onChange={(event) => setForm({ ...form, tools: event.target.checked ? [...form.tools, tool] : form.tools.filter((item) => item !== tool) })} className="accent-violet-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300" />{tool}</label>)}</fieldset>
              {error && <p role="alert" className="rounded-lg border border-rose-400/25 bg-rose-400/[0.06] p-3 text-sm text-rose-200">{error}</p>}
              <div className="flex justify-end gap-3 border-t border-white/[0.08] pt-5">
                <button type="button" onClick={() => setEditing(null)} disabled={saving} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 disabled:opacity-60">Cancel</button>
                <PrimaryBtn disabled={saving}>{saving ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Saving…</> : 'Save changes'}</PrimaryBtn>
              </div>
            </form>
          </div>
        </div>
      )}

      {!editing && agents.length > 0 && (
        <p className="text-center text-sm text-slate-500">
          Need a new configuration? <Link to="/builder" className="text-violet-300 underline underline-offset-4 hover:text-violet-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">Open the Builder</Link>.
        </p>
      )}
    </div>
  );
}
