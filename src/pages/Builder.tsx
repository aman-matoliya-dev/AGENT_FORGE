import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import JSZip from 'jszip';
import {
  ArrowLeft, ArrowRight, Brain, Check, CircuitBoard, Cloud,
  Download, FileCode2, FolderTree, Hammer, HardDrive, Info, Lightbulb,
  MemoryStick as MemoryIcon, MessageSquareText, BookOpen, PartyPopper, PenLine,
  Plus, Rocket, Save, Sparkles, User, Wrench,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  AgentConfig, DEFAULT_CONFIG, MEMORY_OPTIONS, TOOL_CATALOG, buildSystemPrompt,
  generateProject, slugify, ProjectFile,
} from '../data/codegen';
import { API_PROVIDERS, LOCAL_MODELS, localModelById, providerById } from '../data/models';
import { AGENT_TYPES, AgentType } from '../data/models';
import { classifyDevice, modelFit } from '../data/hardware';
import ArchitectureDiagram from '../components/ArchitectureDiagram';
import { Code, CopyBtn, FitBadge, GhostBtn, PrimaryBtn, Tip } from '../components/ui';
import { Magnetic, slideVariants, Stagger, StaggerItem, Tilt } from '../components/motion';
import { cn } from '../utils/cn';
import { createSavedAgent, runAgent, type KnowledgeSource } from '../utils/api';

const STEPS = [
  { id: 'identity', label: 'Identity', icon: User },
  { id: 'personality', label: 'Personality', icon: PenLine },
  { id: 'brain', label: 'Brain', icon: Brain },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'memory', label: 'Memory', icon: MemoryIcon },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { id: 'behavior', label: 'Language', icon: FileCode2 },
  { id: 'review', label: 'Review', icon: Rocket },
];

function Why({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] p-4">
      <Lightbulb className="mt-0.5 h-4.5 w-4.5 shrink-0 text-cyan-300" />
      <p className="text-[13px] leading-relaxed text-cyan-100/85">{children}</p>
    </div>
  );
}

function StepShell({ title, sub, why, children }: { title: string; sub: string; why: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        <h2 className="font-display text-2xl font-bold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{sub}</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}>
        <Why>{why}</Why>
      </motion.div>
      {children}
    </div>
  );
}

export default function Builder() {
  const navigate = useNavigate();
  const { device, agentType, setAgentType, brainPref, saveAgent } = useApp();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const goTo = (i: number) => { setDir(i >= step ? 1 : -1); setStep(i); };
  const [cfg, setCfg] = useState<Omit<AgentConfig, 'id' | 'createdAt'>>({
    ...DEFAULT_CONFIG,
    agentType,
    brain: brainPref ?? (device ? 'local' : DEFAULT_CONFIG.brain),
    modelId: device ? 'llama32-3b' : DEFAULT_CONFIG.modelId,
  });
  const [savedAgent, setSavedAgent] = useState<AgentConfig | null>(null);
  const [fileIdx, setFileIdx] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [testingAgent, setTestingAgent] = useState(false);
  const [testError, setTestError] = useState('');
  const [conversationId, setConversationId] = useState<string>();
  const [testMetadata, setTestMetadata] = useState('');
  const [testSources, setTestSources] = useState<KnowledgeSource[]>([]);
  const [savingAgent, setSavingAgent] = useState(false);
  const [saveAgentError, setSaveAgentError] = useState('');

  const set = (patch: Partial<typeof cfg>) => setCfg((c) => ({ ...c, ...patch }));
  const sysPrompt = useMemo(() => buildSystemPrompt({ ...cfg, id: 'x', createdAt: 0 }), [cfg]);

  // When a device is known, float the best-fitting models to the top of the picker.
  const sortedModels = useMemo(() => {
    if (!device) return LOCAL_MODELS;
    const rank = { perfect: 0, good: 1, tight: 2, 'too-big': 3 } as const;
    return [...LOCAL_MODELS].sort((a, b) => {
      const fa = rank[modelFit(a, device)], fb = rank[modelFit(b, device)];
      if (fa !== fb) return fa - fb;
      const ta = a.bestFor.includes(cfg.agentType) ? 0 : 1, tb = b.bestFor.includes(cfg.agentType) ? 0 : 1;
      return ta - tb || b.quality - a.quality;
    });
  }, [device, cfg.agentType]);

  const canContinue = useMemo(() => {
    switch (STEPS[step].id) {
      case 'identity': return cfg.name.trim().length >= 2 && cfg.purpose.trim().length >= 8;
      case 'brain': return cfg.brain === 'local' ? !!cfg.modelId : !!cfg.providerId;
      default: return true;
    }
  }, [step, cfg]);

  const files: ProjectFile[] = useMemo(
    () => (savedAgent ? generateProject(savedAgent) : []),
    [savedAgent],
  );

  const finish = () => {
    const agent: AgentConfig = { ...cfg, id: `agent-${Date.now()}`, createdAt: Date.now() };
    saveAgent(agent);
    setSavedAgent(agent);
    setFileIdx(0);
    setTestMessage('');
    setTestResponse('');
    setTestError('');
    setConversationId(undefined);
    setTestMetadata('');
    setTestSources([]);
    setTestMetadata('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const testAgent = async () => {
    if (!savedAgent || !testMessage.trim() || testingAgent) return;

    setTestResponse('');
    setTestError('');

    const provider = savedAgent.brain === 'local'
      ? 'ollama'
      : savedAgent.providerId === 'google'
        ? 'gemini'
        : null;

    if (!provider) {
      setTestError(
        'This provider is currently available for generated projects, but live testing currently supports Gemini only.'
      );
      return;
    }

    setTestingAgent(true);

    try {
      const result = await runAgent({
        message: testMessage.trim(),
        conversationId,
        config: {
          name: savedAgent.name,
          purpose: savedAgent.purpose,
          personality: savedAgent.personality,
          provider,
          model: savedAgent.brain === 'local'
            ? localModelById(savedAgent.modelId)?.ollama.replace(/^ollama run /, '')
            : 'gemini-3.6-flash',
          agentType: savedAgent.agentType,
          tools: savedAgent.tools,
          memory: savedAgent.memory,
          knowledge: savedAgent.knowledge,
          outputStyle: savedAgent.outputStyle,
        },
      });

      setTestResponse(result.response);
      setConversationId(result.conversationId);
      setTestSources(result.sources ?? []);
      setTestMetadata(result.metadata
        ? `${result.metadata.provider} · ${result.metadata.model} · memory: ${result.metadata.memory} · knowledge: ${result.metadata.knowledgeUsed ? 'used' : 'not used'} · tools: ${result.metadata.toolsUsed.join(', ') || 'none'}`
        : '');
    } catch (error) {
      setTestError(
        error instanceof Error ? error.message : 'Agent request failed'
      );
    } finally {
      setTestingAgent(false);
    }
  };

  const saveConfiguration = async () => {
    if (!savedAgent || savingAgent) return;
    const provider = savedAgent.brain === 'local'
      ? 'ollama'
      : savedAgent.providerId === 'google'
        ? 'gemini'
        : null;
    if (!provider) {
      setSaveAgentError('Saved agents currently support Gemini and Ollama configurations.');
      return;
    }

    setSavingAgent(true);
    setSaveAgentError('');
    try {
      const ollamaModel = localModelById(savedAgent.modelId)?.ollama.replace(/^ollama run\s+/, '');
      await createSavedAgent({
        name: savedAgent.name,
        description: savedAgent.purpose,
        purpose: savedAgent.purpose,
        personality: savedAgent.personality,
        provider,
        model: provider === 'gemini' ? 'gemini-3.6-flash' : ollamaModel ?? 'llama3.2:latest',
        agentType: savedAgent.agentType,
        tools: savedAgent.tools,
        memory: savedAgent.memory,
        knowledge: savedAgent.knowledge,
        outputStyle: savedAgent.outputStyle,
      });
      navigate('/agents');
    } catch (error) {
      setSaveAgentError(error instanceof Error ? error.message : 'Could not save this agent.');
    } finally {
      setSavingAgent(false);
    }
  };

  const restart = () => { setSavedAgent(null); setStep(0); };

  const downloadZip = async () => {
    if (!savedAgent) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      for (const f of files) zip.file(f.path, f.code);
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${slugify(savedAgent.name)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setDownloading(false); }
  };

  /* ── success / code view ── */
  if (savedAgent) {
    const f = files[fileIdx];
    const isApi = savedAgent.brain === 'api';
    const model = localModelById(savedAgent.modelId);
    const provider = providerById(savedAgent.providerId);
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="grad-border relative overflow-hidden p-8 text-center sm:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.12),transparent_60%)]" />
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.15 }}
            className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-emerald-400/40 bg-emerald-400/10">
            <PartyPopper className="h-8 w-8 text-emerald-300" />
          </motion.div>
          <h1 className="relative mt-5 font-display text-3xl font-bold text-white">“{savedAgent.name}” is ready to run</h1>
          <p className="relative mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            Below is your complete starter project — every file explained. Download it, follow the 4-step launch checklist, and your agent goes live.
          </p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-3">
            <PrimaryBtn onClick={downloadZip} disabled={downloading}>
              <Download className="h-4 w-4" /> {downloading ? 'Packing…' : `Download ${slugify(savedAgent.name)}.zip`}
            </PrimaryBtn>
            <GhostBtn onClick={restart}><Hammer className="h-4 w-4" /> Build another</GhostBtn>
            <PrimaryBtn onClick={saveConfiguration} disabled={savingAgent}>
              <Save className="h-4 w-4" /> {savingAgent ? 'Saving…' : 'Save to My Agents'}
            </PrimaryBtn>
            <Link to="/agents"><GhostBtn><User className="h-4 w-4" /> My Agents</GhostBtn></Link>
          </div>
          {saveAgentError && <p role="alert" className="relative mt-4 text-sm text-rose-200">{saveAgentError}</p>}
        </motion.div>

        {/* live agent test */}
        <div className="panel mt-8 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 font-display text-lg font-bold text-white">
                <MessageSquareText className="h-5 w-5 text-cyan-300" />
                Test your agent
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Send a real request through the AGENT_FORGE Python backend.
                {isApi
                  ? provider?.id === 'google'
                    ? ' This uses the Gemini backend currently connected to AGENT_FORGE.'
                    : ' This provider is available for generated projects, but live testing currently supports Gemini only.'
                  : ' This uses your local Ollama backend.'}
              </p>
            </div>
            <span className="chip border-white/10 bg-white/[0.04] text-slate-400">
              {isApi ? provider?.name ?? 'API provider' : 'Ollama'}
            </span>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Message
            </label>
            <textarea
              className="field min-h-[110px] resize-y"
              placeholder="e.g. Explain Python OOP in a simple way."
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              disabled={testingAgent}
            />

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <PrimaryBtn
                onClick={testAgent}
                disabled={!testMessage.trim() || testingAgent}
              >
                <MessageSquareText className="h-4 w-4" />
                {testingAgent ? 'Running agent…' : 'Run agent'}
              </PrimaryBtn>

              {testResponse && (
                <span className="text-xs text-emerald-300">
                  Agent response received
                </span>
              )}
            </div>
          </div>

          {testError && (
            <div className="mt-5 rounded-xl border border-rose-400/25 bg-rose-400/[0.06] p-4 text-sm leading-relaxed text-rose-200">
              <div className="font-semibold">Agent request failed</div>
              <p className="mt-1 text-rose-200/80">{testError}</p>
            </div>
          )}

          {testResponse && (
            <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-5">
              <div className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                {savedAgent.name} response
              </div>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                {testResponse}
              </div>
              {testMetadata && (
                <div className="mt-3 text-xs text-slate-500">
                  {testMetadata} · conversation: {conversationId}
                </div>
              )}
              {testSources.length > 0 && (
                <div className="mt-4 border-t border-cyan-400/10 pt-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-cyan-300">Knowledge sources</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {testSources.map((source) => (
                      <span key={`${source.documentId}-${source.chunkId}`} className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-300">
                        {source.filename} · page {source.page ?? 1}{typeof source.score === 'number' ? ` · ${source.score.toFixed(3)}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* launch checklist */}
        <div className="panel mt-8 p-6">
          <h3 className="font-display text-lg font-bold text-white">Launch checklist</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(isApi ? [
              ['1 · Get a key', provider?.signupHint ?? 'From your provider console'],
              ['2 · Install deps', savedAgent.language === 'python' ? 'pip install -r requirements.txt' : 'npm install'],
              ['3 · Set the key', 'export API_KEY=your-key'],
              ['4 · Run it', savedAgent.language === 'python' ? 'python agent.py' : 'node agent.js'],
            ] : [
              ['1 · Install Ollama', 'ollama.com — 2 minutes'],
              ['2 · Pull the model', model?.ollama.replace('ollama run', 'ollama pull') ?? ''],
              ['3 · Install deps', savedAgent.language === 'python' ? 'pip install -r requirements.txt' : 'nothing — zero deps!'],
              ['4 · Run it', savedAgent.language === 'python' ? 'python agent.py' : 'node agent.js'],
            ]).map(([t, d]) => (
              <div key={t} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="text-sm font-semibold text-white">{t}</div>
                <div className="mt-1 font-mono text-xs leading-relaxed text-emerald-300/90">{d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* architecture recap */}
        <div className="panel mt-8 p-6">
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-white"><CircuitBoard className="h-5 w-5 text-violet-300" /> What you just built</h3>
          <ArchitectureDiagram config={{
            brain: savedAgent.brain,
            modelLabel: isApi ? savedAgent.apiModel : model?.name,
            toolCount: savedAgent.tools.length, memory: savedAgent.memory, knowledge: savedAgent.knowledge,
          }} />
        </div>

        {/* file explorer */}
        <div className="mt-8 grid gap-5 lg:grid-cols-[260px_1fr]">
          <div className="panel h-fit overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-500">
              <FolderTree className="h-4 w-4" /> Project files
            </div>
            <div className="p-2">
              {files.map((file, i) => (
                <button key={file.path} onClick={() => setFileIdx(i)}
                  className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left font-mono text-xs transition',
                    i === fileIdx ? 'bg-violet-500/15 text-violet-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200')}>
                  <FileCode2 className="h-3.5 w-3.5 shrink-0" />{file.path.split('/').pop()}
                </button>
              ))}
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={f.path} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="min-w-0">
              <Code title={f.path} code={f.code} actions={<CopyBtn text={f.code} />} />
              <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-violet-300"><Sparkles className="h-4 w-4" /> What this file does</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.explain}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {f.concepts.map((c) => <span key={c} className="chip border-white/10 bg-white/[0.04] text-slate-400">{c}</span>)}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  /* ── wizard ── */
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      {/* header */}
      <div className="mb-10 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold text-violet-300">
          <Hammer className="h-3.5 w-3.5" /> Agent builder
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">Design your agent, <span className="grad-text">step by step</span></h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">Every choice is explained as you make it. At the end you'll get a complete, runnable project.</p>
      </div>

      {/* stepper */}
      <div className="mb-10 flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={s.id} className="flex shrink-0 items-center">
              {i > 0 && (
                <div className="relative mx-1 h-px w-5 overflow-hidden bg-white/10 sm:w-8">
                  <motion.span className="absolute inset-0 origin-left bg-gradient-to-r from-violet-500 to-cyan-400"
                    initial={false} animate={{ scaleX: i <= step ? 1 : 0 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 28 }} />
                </div>
              )}
              <button onClick={() => i < step && goTo(i)} disabled={i > step}
                className={cn('group relative flex items-center gap-2 rounded-full border px-3 py-2 transition-all',
                  active ? 'border-violet-400/60 bg-violet-500/15 tick-ring' : done ? 'border-violet-400/25 bg-violet-500/[0.06] hover:bg-violet-500/10' : 'border-white/10 opacity-50')}>
                <motion.span layout
                  className={cn('grid h-6 w-6 place-items-center rounded-full',
                    done ? 'bg-violet-500 text-white' : active ? 'bg-violet-500/30 text-violet-200' : 'bg-white/5 text-slate-500')}
                  transition={{ type: 'spring', stiffness: 400, damping: 24 }}>
                  {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </motion.span>
                <span className={cn('hidden text-xs font-semibold sm:block', active ? 'text-white' : 'text-slate-400')}>{s.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait" custom={dir}>
        <motion.div key={STEPS[step].id} custom={dir} variants={slideVariants}
          initial="enter" animate="center" exit="exit" className="panel p-6 sm:p-9">

          {/* ── 1 identity ── */}
          {STEPS[step].id === 'identity' && (
            <StepShell title="Name your agent & its mission" sub="The sharpest agents do ONE thing well."
              why="Why this matters: every decision later (model, tools, prompt) flows from a clear purpose. “Assistant” is vague; “Turns my lecture PDFs into quiz questions” is a buildable goal. The purpose becomes line one of the system prompt — the text your agent reads before every single task.">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Agent name</span>
                  <input className="field" placeholder="e.g. StudyBuddy, CodeSage, NewsHawk" value={cfg.name} onChange={(e) => set({ name: e.target.value })} maxLength={28} />
                  {cfg.name.trim().length > 0 && cfg.name.trim().length < 2 && (
                    <span className="mt-1.5 block text-xs text-amber-300/80">Needs at least 2 characters.</span>
                  )}
                </label>
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Agent type <Tip text="Shapes which models we recommend — coders need code models, RAG agents need long context." /></span>
                  <select className="field" value={cfg.agentType} onChange={(e) => { set({ agentType: e.target.value as AgentType }); setAgentType(e.target.value as AgentType); }}>
                    {AGENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-[13px] font-semibold text-slate-400">Purpose — one concrete sentence</span>
                <textarea className="field min-h-[96px] resize-none" placeholder="e.g. Help me study by turning my notes into clear summaries and quiz questions." value={cfg.purpose} onChange={(e) => set({ purpose: e.target.value })} maxLength={180} />
                <div className="mt-1 flex items-center justify-between">
                  {cfg.purpose.trim().length > 0 && cfg.purpose.trim().length < 8
                    ? <span className="text-xs text-amber-300/80">A bit more detail — one full sentence.</span>
                    : <span />}
                  <span className="text-xs text-slate-600">{cfg.purpose.length}/180</span>
                </div>
              </label>
              <div className="flex flex-wrap gap-2">
                {['Summarise my lecture notes into study cards', 'Help me debug Python and teach me why', 'Research topics and save digests to notes', 'Answer questions from my project docs'].map((s) => (
                  <button key={s} onClick={() => set({ purpose: s })}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-slate-400 transition hover:border-violet-400/40 hover:bg-violet-400/[0.06] hover:text-slate-200">
                    <Plus className="h-3 w-3 shrink-0 text-violet-400" />{s}
                  </button>
                ))}
              </div>
            </StepShell>
          )}

          {/* ── 2 personality ── */}
          {STEPS[step].id === 'personality' && (
            <StepShell title="Personality & system prompt" sub="How should it talk and behave?"
              why="Why this matters: the system prompt is the agent's job description, included in EVERY request to the model. Personality keeps tone consistent; rules prevent classic failure modes — like inventing tool results instead of admitting failures. Watch it assemble live below as you choose.">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Personality</span>
                  <div className="flex flex-wrap gap-2">
                    {['Friendly and patient', 'Concise & technical', 'Playful & witty', 'Calm mentor', 'Ruthlessly direct'].map((p) => (
                      <button key={p} onClick={() => set({ personality: p })}
                        className={cn('rounded-lg border px-3.5 py-2 text-xs font-medium transition', cfg.personality === p ? 'border-violet-400/60 bg-violet-500/15 text-white' : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/25')}>{p}</button>
                    ))}
                  </div>
                </label>
                <div>
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Answer style <Tip text="Step-by-step is great for learning and research — concise is better for a daily assistant you'll chat with constantly." /></span>
                  <div className="flex flex-wrap gap-2">
                    {([['concise', 'Concise'], ['detailed', 'Detailed'], ['steps', 'Step-by-step']] as const).map(([v, l]) => (
                      <button key={v} onClick={() => set({ outputStyle: v })}
                        className={cn('rounded-lg border px-3.5 py-2 text-xs font-medium transition', cfg.outputStyle === v ? 'border-cyan-400/60 bg-cyan-400/15 text-white' : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/25')}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500"><MessageSquareText className="h-4 w-4 text-violet-300" /> Live system prompt preview</div>
                <Code code={sysPrompt} />
              </div>
            </StepShell>
          )}

          {/* ── 3 brain ── */}
          {STEPS[step].id === 'brain' && (
            <StepShell title="Pick a brain — and a model" sub="Where the intelligence lives, and how big it is."
              why="Why this matters: the model is the only component that decides anything. Local = private, offline, free per message, limited by your hardware. API = instant frontier power, needs internet + a key, billed per token. Your architecture stays identical either way — only the connector changes.">
              <div className="grid gap-3 sm:grid-cols-2">
                {([['local', 'Local brain', 'Private · offline · free per message', HardDrive, '#34d399'], ['api', 'API brain', 'Instant power · needs key + internet', Cloud, '#38bdf8']] as const).map(([v, t, d, Icon, color]) => (
                  <button key={v} onClick={() => set({ brain: v })}
                    className={cn('flex items-center gap-4 rounded-2xl border p-5 text-left transition-all', cfg.brain === v ? 'border-transparent bg-white/[0.05]' : 'border-white/10 bg-white/[0.02] hover:border-white/25')}
                    style={cfg.brain === v ? { boxShadow: `0 0 0 1.5px ${color}` } : {}}>
                    <span className="grid h-11 w-11 place-items-center rounded-xl border" style={{ borderColor: color + '55', background: color + '14' }}><Icon className="h-5 w-5" style={{ color }} /></span>
                    <span><span className="block font-display text-base font-bold text-white">{t}</span><span className="text-xs text-slate-500">{d}</span></span>
                    {cfg.brain === v && <Check className="ml-auto h-5 w-5" style={{ color }} />}
                  </button>
                ))}
              </div>

              {cfg.brain === 'local' ? (
                <div>
                  {!device && (
                    <Link to="/device" className="mb-4 flex items-center gap-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4 text-sm text-amber-100/90 transition hover:bg-amber-400/10">
                      <CircuitBoard className="h-5 w-5 shrink-0 text-amber-300" />
                      <span><b>Tip:</b> run the 30-second device check first — we'll show honest “runs great / tight fit” badges on every model below. <span className="underline">Check my device →</span></span>
                    </Link>
                  )}
                  <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
                    {sortedModels.map((m) => {
                      const fit = device ? modelFit(m, device) : null;
                      const typeMatch = m.bestFor.includes(cfg.agentType);
                      return (
                        <button key={m.id} onClick={() => set({ modelId: m.id })}
                          className={cn('flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all',
                            cfg.modelId === m.id ? 'border-emerald-400/60 bg-emerald-400/[0.07]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20',
                            fit === 'too-big' && 'opacity-55')}>
                          <span className="grid h-9 w-12 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] font-mono text-[11px] font-bold text-slate-300">{m.params}</span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-white">{m.name}</span>
                              {fit && <FitBadge fit={fit} small />}
                              {typeMatch && <span className="chip border border-violet-400/30 bg-violet-400/10 text-violet-300 !px-2 !py-0.5 text-[10px]">great for this goal</span>}
                            </span>
                            <span className="block truncate text-[11px] text-slate-500">{m.tagline}</span>
                          </span>
                          {cfg.modelId === m.id && <Check className="h-4 w-4 shrink-0 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                  {device && cfg.modelId && modelFit(localModelById(cfg.modelId)!, device) === 'too-big' && (
                    <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-400/[0.07] p-3 text-xs text-rose-200/90">
                      Heads up: this model is too large for your {classifyDevice(device).label.toLowerCase()} device — it would swap to disk and crawl. Pick a “runs great” model above instead.
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">Provider</span>
                    <select className="field" value={cfg.providerId} onChange={(e) => {
                      const p = providerById(e.target.value)!;
                      set({ providerId: p.id, apiModel: p.models[0].name });
                    }}>
                      {API_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">Model</span>
                    <select className="field" value={cfg.apiModel} onChange={(e) => set({ apiModel: e.target.value })}>
                      {providerById(cfg.providerId)?.models.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
                    </select>
                  </label>
                  <div className="sm:col-span-2 rounded-xl border border-sky-400/20 bg-sky-400/[0.05] p-4 text-xs leading-relaxed text-sky-100/80">
                    <b className="text-sky-200">Get your key:</b> {providerById(cfg.providerId)?.signupHint} — {providerById(cfg.providerId)?.pricingNote}
                  </div>
                </div>
              )}
            </StepShell>
          )}

          {/* ── 4 tools ── */}
          {STEPS[step].id === 'tools' && (
            <StepShell title="Give it hands — choose tools" sub="Functions your agent can request."
              why="Why this matters: without tools, an agent is just a chatbot that guesses. With tools, it looks things up and calculates for real. The model requests a call with arguments; YOUR code executes it — so tools are also your safety boundary. Pick the few your purpose needs, not all of them.">
              <Stagger className="grid gap-3 sm:grid-cols-2">
                {TOOL_CATALOG.map((t) => {
                  const on = cfg.tools.includes(t.id);
                  return (
                    <StaggerItem key={t.id}>
                      <Tilt max={4} className="h-full">
                        <button onClick={() => set({ tools: on ? cfg.tools.filter((x) => x !== t.id) : [...cfg.tools, t.id] })}
                          className={cn('h-full w-full rounded-2xl border p-5 text-left transition-colors', on ? 'border-amber-400/50 bg-amber-400/[0.06]' : 'border-white/10 bg-white/[0.02] hover:border-white/20')}>
                          <div className="flex items-center justify-between">
                            <span className="font-display text-sm font-bold text-white">{t.name}</span>
                            <motion.span
                              className={cn('grid h-5 w-5 place-items-center rounded-md border', on ? 'border-amber-400 bg-amber-400/20' : 'border-slate-600')}
                              animate={on ? { scale: [1, 1.25, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
                              {on && <Check className="h-3.5 w-3.5 text-amber-300" />}
                            </motion.span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{t.desc}</p>
                          <p className="mt-2 flex gap-1.5 text-xs leading-relaxed text-slate-500"><Info className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/70" />{t.why}</p>
                        </button>
                      </Tilt>
                    </StaggerItem>
                  );
                })}
              </Stagger>
              {cfg.tools.length === 0 && <p className="text-xs text-slate-500">No tools is a valid choice — you get a pure conversational agent (a very smart chatbot). You can add tools later.</p>}
            </StepShell>
          )}

          {/* ── 5 memory ── */}
          {STEPS[step].id === 'memory' && (
            <StepShell title="How should it remember?" sub="Models are stateless — memory is your design choice."
              why="Why this matters: after answering, a model forgets everything. Your code re-sends history each call — and the context window is finite. The strategy you pick decides what survives long conversations, and it directly changes the memory code we generate for you.">
              <Stagger className="grid gap-3 sm:grid-cols-3">
                {MEMORY_OPTIONS.map((m) => (
                  <StaggerItem key={m.id}>
                    <Tilt max={4} className="h-full">
                      <button onClick={() => set({ memory: m.id })}
                        className={cn('h-full w-full rounded-2xl border p-5 text-left transition-colors', cfg.memory === m.id ? 'border-pink-400/50 bg-pink-400/[0.07]' : 'border-white/10 bg-white/[0.02] hover:border-white/20')}>
                        <div className="flex items-center justify-between">
                          <span className="font-display text-sm font-bold text-white">{m.name}</span>
                          {cfg.memory === m.id && <Check className="h-4 w-4 text-pink-300" />}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{m.desc}</p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500">{m.why}</p>
                      </button>
                    </Tilt>
                  </StaggerItem>
                ))}
              </Stagger>
            </StepShell>
          )}

          {/* ── 6 knowledge ── */}
          {STEPS[step].id === 'knowledge' && (
            <StepShell title="Knowledge base (RAG)?" sub="Should it answer from YOUR documents?"
              why="Why this matters: a model only knows its training data — never your notes, docs, or codebase. RAG retrieves relevant passages from your files and injects them into the prompt, turning guesses into grounded answers with sources. Enable it if your purpose mentions ‘my documents / notes / codebase’.">
              <div className="grid gap-3 sm:grid-cols-2">
                {([['none', 'No knowledge base', 'Answers purely from the model\'s training. Simplest start.', MessageSquareText], ['rag', 'RAG over my files', 'Uploaded .txt/.pdf documents are indexed with embeddings; relevant passages are retrieved from the local vector store and supplied to the agent with source metadata.', BookOpen]] as const).map(([v, t, d, Icon]) => (
                  <button key={v} onClick={() => set({ knowledge: v })}
                    className={cn('flex items-start gap-4 rounded-2xl border p-5 text-left transition-all', cfg.knowledge === v ? 'border-emerald-400/50 bg-emerald-400/[0.06]' : 'border-white/10 bg-white/[0.02] hover:border-white/20')}>
                    <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl border', cfg.knowledge === v ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-white/10 bg-white/[0.03]')}>
                      <Icon className={cn('h-5 w-5', cfg.knowledge === v ? 'text-emerald-300' : 'text-slate-400')} />
                    </span>
                    <span><span className="flex items-center gap-2 font-display text-sm font-bold text-white">{t}{cfg.knowledge === v && <Check className="h-4 w-4 text-emerald-400" />}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-400">{d}</span></span>
                  </button>
                ))}
              </div>
              {cfg.knowledge === 'rag' && (
                <p className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 text-xs text-slate-400">
                  The AGENT_FORGE backend indexes uploaded .txt/.pdf documents with embeddings, retrieves relevant passages from its local vector store, and supplies the agent with bounded context and source metadata.
                </p>
              )}
            </StepShell>
          )}

          {/* ── 7 language ── */}
          {STEPS[step].id === 'behavior' && (
            <StepShell title="Pick your implementation language" sub="Same agent, two dialects."
              why="Why this matters: agent logic is language-agnostic — loops, messages, tool calls. Pick the language you'll actually run and read. Python dominates AI tooling; JavaScript/TypeScript rules the web and needs zero dependencies with a local brain.">
              <Stagger className="grid gap-3 sm:grid-cols-2">
                {([['python', 'Python', 'The lingua franca of AI — huge ecosystem, gentle syntax.'], ['javascript', 'JavaScript (Node)', 'Web-native — zero-dependency local agents, easy path to a UI.']] as const).map(([v, t, d]) => (
                  <StaggerItem key={v}>
                  <Tilt max={5}>
                  <button onClick={() => set({ language: v })}
                    className={cn('w-full rounded-2xl border p-6 text-left transition-colors', cfg.language === v ? 'border-violet-400/60 bg-violet-500/[0.08]' : 'border-white/10 bg-white/[0.02] hover:border-white/20')}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-3 font-mono text-lg font-bold text-white">
                        <span className={cn('grid h-9 w-9 place-items-center rounded-lg border text-xs', cfg.language === v ? 'border-violet-400/50 bg-violet-500/15 text-violet-200' : 'border-white/10 bg-white/[0.03] text-slate-400')}>{v === 'python' ? 'PY' : 'JS'}</span>
                        {t}
                      </span>
                      {cfg.language === v && <Check className="h-5 w-5 text-violet-300" />}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">{d}</p>
                  </button>
                  </Tilt>
                  </StaggerItem>
                ))}
              </Stagger>
            </StepShell>
          )}

          {/* ── 8 review ── */}
          {STEPS[step].id === 'review' && (
            <StepShell title="Review your agent's architecture" sub="Click components — make sure you understand each one. Understanding is the goal."
              why="Why this matters: this diagram is generated from YOUR choices. If any component surprises you, jump back and change it — a builder who can't explain their own architecture ships fragile agents. When every node makes sense, generate the code.">
              <ArchitectureDiagram config={{
                brain: cfg.brain,
                modelLabel: cfg.brain === 'local' ? localModelById(cfg.modelId)?.name : cfg.apiModel,
                toolCount: cfg.tools.length, memory: cfg.memory, knowledge: cfg.knowledge,
              }} />
              <div className="grid gap-2.5 sm:grid-cols-2">
                {[
                  ['Mission', cfg.purpose, Sparkles],
                  ['Brain', cfg.brain === 'local' ? `${localModelById(cfg.modelId)?.name} · local` : `${cfg.apiModel} · ${providerById(cfg.providerId)?.name}`, cfg.brain === 'local' ? HardDrive : Cloud],
                  ['Tools', cfg.tools.length ? cfg.tools.map((t) => TOOL_CATALOG.find((x) => x.id === t)?.name).join(' · ') : 'none (pure chat)', Wrench],
                  ['Memory & knowledge', `${MEMORY_OPTIONS.find((m) => m.id === cfg.memory)?.name}${cfg.knowledge === 'rag' ? ' + RAG knowledge base' : ''}`, MemoryIcon],
                  ['Personality', `${cfg.personality} · ${cfg.outputStyle}`, PenLine],
                  ['Stack', cfg.language === 'python' ? 'Python' : 'JavaScript (Node)', FileCode2],
                ].map(([k, v, Icon]: any) => (
                  <div key={k} className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                    <div><div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{k}</div>
                    <div className="mt-0.5 text-sm text-slate-200">{v || '—'}</div></div>
                  </div>
                ))}
              </div>
            </StepShell>
          )}

          {/* ── nav ── */}
          <div className="mt-10 flex items-center justify-between border-t border-white/[0.07] pt-6">
            {step === 0 ? <span aria-hidden /> : (
              <GhostBtn onClick={() => goTo(Math.max(0, step - 1))}>
                <ArrowLeft className="h-4 w-4" /> Back
              </GhostBtn>
            )}
            {step < STEPS.length - 1 ? (
              <Magnetic strength={0.25}>
                <PrimaryBtn onClick={() => canContinue && goTo(step + 1)} disabled={!canContinue}>
                  Continue <ArrowRight className="h-4 w-4" />
                </PrimaryBtn>
              </Magnetic>
            ) : (
              <Magnetic strength={0.3}>
                <PrimaryBtn onClick={finish}>
                  <Rocket className="h-4 w-4" /> Generate my agent
                </PrimaryBtn>
              </Magnetic>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}