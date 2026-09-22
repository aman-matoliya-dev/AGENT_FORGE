import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight, Bot, Brain, CheckCircle2, CircuitBoard, Cloud, Cpu, FileCode2,
  GraduationCap, Hammer, HardDrive, LayoutDashboard, Library, MemoryStick,
  Plus, Scale, Sparkles, Trash2, Trophy, Wrench, BookOpen,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LESSONS } from '../data/learning';
import { classifyDevice, recommendModels } from '../data/hardware';
import { localModelById, providerById } from '../data/models';
import { MEMORY_OPTIONS, TOOL_CATALOG } from '../data/codegen';
import { ProgressBar, Reveal, SectionHead, FitBadge } from '../components/ui';
import { Counter, Stagger, StaggerItem } from '../components/motion';
import { cn } from '../utils/cn';
import { modelFit } from '../data/hardware';

const QUICK = [
  { to: '/builder', icon: Hammer, label: 'Create new agent', color: '#8b5cf6' },
  { to: '/device', icon: CircuitBoard, label: 'Run device check', color: '#22d3ee' },
  { to: '/brain', icon: Scale, label: 'Compare local vs API', color: '#fbbf24' },
  { to: '/resources', icon: Library, label: 'Browse resources', color: '#34d399' },
];

export default function Dashboard() {
  const { device, agents, deleteAgent, done, agentType } = useApp();
  const pct = Math.round((done.length / LESSONS.length) * 100);
  const nextLesson = LESSONS.find((l) => !done.includes(l.id));
  const tier = device ? classifyDevice(device) : null;
  const topRecs = device ? recommendModels(device, agentType).slice(0, 3) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <SectionHead kicker="Dashboard" title={<>Your agent <span className="grad-text">command center</span></>}
        sub="Everything you've learned, built and measured lives here — saved locally in your browser." />

      {/* stats strip */}
      <Stagger className="mb-8 grid grid-cols-3 gap-3" amount={0.5}>
        {[
          { v: done.length, s: ` / ${LESSONS.length}`, l: 'lessons completed', c: '#8b5cf6' },
          { v: agents.length, s: '', l: 'agents built', c: '#22d3ee' },
          { v: pct, s: '%', l: 'path progress', c: '#34d399' },
        ].map((st) => (
          <StaggerItem key={st.l}>
            <div className="panel flex items-center gap-4 p-5">
              <div className="font-display text-3xl font-bold" style={{ color: st.c }}>
                <Counter value={st.v} suffix={st.s} duration={1.1} />
              </div>
              <div className="text-xs text-slate-500">{st.l}</div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      {/* quick actions */}
      <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK.map((q, i) => (
          <Reveal key={q.label} delay={i * 0.05}>
            <Link to={q.to} className="panel panel-hover group flex items-center gap-4 p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl border" style={{ borderColor: q.color + '44', background: q.color + '12' }}>
                <q.icon className="h-5 w-5" style={{ color: q.color }} />
              </span>
              <span className="font-display text-sm font-bold text-white">{q.label}</span>
              <ArrowRight className="ml-auto h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-slate-300" />
            </Link>
          </Reveal>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* ── left column ── */}
        <div className="space-y-6">
          {/* My agents */}
          <Reveal>
            <div className="panel p-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-white"><Bot className="h-5 w-5 text-violet-300" /> My agents
                  <span className="chip border-white/10 bg-white/[0.04] text-slate-400">{agents.length}</span></h3>
                <Link to="/builder" className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 px-3.5 py-2 text-xs font-semibold text-white transition hover:brightness-110">
                  <Plus className="h-3.5 w-3.5" /> New agent
                </Link>
              </div>
              {agents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-10 text-center">
                  <Bot className="mx-auto h-8 w-8 text-slate-600" />
                  <p className="mt-3 text-sm text-slate-500">No agents yet — your first one is 8 guided steps away.</p>
                  <Link to="/builder" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-violet-300 hover:text-violet-200">Open the builder <ArrowRight className="h-4 w-4" /></Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                  {agents.map((a) => {
                    const model = localModelById(a.modelId);
                    return (
                      <motion.div key={a.id} layout
                        initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94, height: 0, marginBottom: -12 }}
                        transition={{ type: 'spring', stiffness: 240, damping: 26 }}
                        className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500/25 to-cyan-400/15 border border-violet-400/30">
                              <Bot className="h-5 w-5 text-violet-200" />
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-2 font-display text-base font-bold text-white">
                                {a.name}
                                {a.brain === 'local'
                                  ? <span className="chip border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"><HardDrive className="h-3 w-3" /> local</span>
                                  : <span className="chip border border-sky-400/30 bg-sky-400/10 text-sky-300"><Cloud className="h-3 w-3" /> api</span>}
                              </div>
                              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{a.purpose}</p>
                            </div>
                          </div>
                          <button onClick={() => deleteAgent(a.id)} className="rounded-lg p-2 text-slate-600 transition hover:bg-rose-400/10 hover:text-rose-300" aria-label="Delete agent">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1.5"><Brain className="h-3.5 w-3.5 text-cyan-300" />{a.brain === 'local' ? model?.name : `${a.apiModel} (${providerById(a.providerId)?.name})`}</span>
                          <span className="flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5 text-amber-300" />{a.tools.length ? `${a.tools.length} tools` : 'no tools'}</span>
                          <span className="flex items-center gap-1.5"><MemoryStick className="h-3.5 w-3.5 text-pink-300" />{MEMORY_OPTIONS.find((m) => m.id === a.memory)?.name}</span>
                          <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-emerald-300" />{a.knowledge === 'rag' ? 'RAG knowledge' : 'no knowledge base'}</span>
                          <span className="flex items-center gap-1.5"><FileCode2 className="h-3.5 w-3.5 text-violet-300" />{a.language === 'python' ? 'Python' : 'JavaScript'}</span>
                        </div>
                        {a.tools.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {a.tools.map((t) => <span key={t} className="chip border-white/10 bg-white/[0.03] text-slate-400">{TOOL_CATALOG.find((x) => x.id === t)?.name}</span>)}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </Reveal>

          {/* Learning progress */}
          <Reveal>
            <div className="panel p-6">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-white"><GraduationCap className="h-5 w-5 text-violet-300" /> Learning progress</h3>
                <span className="font-mono text-sm text-slate-400">{done.length}/{LESSONS.length}</span>
              </div>
              <div className="mt-4"><ProgressBar value={pct} /></div>
              <div className="mt-5 grid gap-1.5 sm:grid-cols-2">
                {LESSONS.map((l, i) => {
                  const isDone = done.includes(l.id);
                  return (
                    <Link key={l.id} to={`/learn/${l.id}`} className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition hover:bg-white/[0.04]">
                      <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[10px] font-bold',
                        isDone ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-300' : 'border-white/15 text-slate-500')}>
                        {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                      </span>
                      <span className={cn('truncate text-xs', isDone ? 'text-slate-400' : 'text-slate-500 group-hover:text-slate-300')}>{l.title}</span>
                    </Link>
                  );
                })}
              </div>
              {nextLesson && (
                <Link to={`/learn/${nextLesson.id}`} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-5 py-2.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/20">
                  Continue: {nextLesson.title} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
              {done.length === LESSONS.length && (
                <div className="mt-5 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] px-5 py-3 text-sm text-amber-200">
                  <Trophy className="h-4 w-4 text-amber-300" /> Full path completed — you officially understand agents better than most people who use them daily.
                </div>
              )}
            </div>
          </Reveal>
        </div>

        {/* ── right column ── */}
        <div className="space-y-6">
          {/* My device */}
          <Reveal>
            <div className="panel p-6">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-white"><CircuitBoard className="h-5 w-5 text-cyan-300" /> My device</h3>
                <Link to="/device" className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">{device ? 'Re-check' : 'Check now'}</Link>
              </div>
              {!device ? (
                <div className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center">
                  <Cpu className="mx-auto h-7 w-7 text-slate-600" />
                  <p className="mt-2 text-xs text-slate-500">No specs saved yet. The device check takes 30 seconds and unlocks honest model fits everywhere.</p>
                  <Link to="/device" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200">Run the check <ArrowRight className="h-3.5 w-3.5" /></Link>
                </div>
              ) : (
                <div className="mt-4">
                  <div className="flex items-center gap-3">
                    <span className="chip border !px-3 !py-1.5 text-xs" style={{ color: tier!.color, borderColor: tier!.color + '44', background: tier!.color + '12' }}>
                      <Trophy className="h-3.5 w-3.5" />{tier!.label}
                    </span>
                    <span className="text-[11px] text-slate-500">{device.os === 'macos' ? 'macOS' : device.os === 'linux' ? 'Linux' : 'Windows'} · {device.arch}</span>
                  </div>
                  <div className="mt-4 space-y-2.5">
                    {[['RAM', device.ramGB, 128, 'GB', '#8b5cf6'], ['VRAM', device.vramGB, 48, 'GB', '#22d3ee'], ['Storage free', device.storageGB, 500, 'GB', '#f472b6']].map(([label, v, max, unit, c]: any) => (
                      <div key={label}>
                        <div className="mb-1 flex justify-between text-[11px]"><span className="text-slate-500">{label}</span><span className="font-mono text-slate-300">{v} {unit}</span></div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(4, (v / max) * 100)}%`, background: c }} />
                        </div>
                      </div>
                    ))}
                    {device.gpuName && <p className="text-[11px] text-slate-600">GPU: {device.gpuName}</p>}
                  </div>
                </div>
              )}
            </div>
          </Reveal>

          {/* Recommended models */}
          <Reveal>
            <div className="panel p-6">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold text-white"><Sparkles className="h-5 w-5 text-amber-300" /> Recommended for you</h3>
              {!device ? (
                <p className="mt-3 text-xs leading-relaxed text-slate-500">Run the device check and this panel fills with models matched to your exact RAM, VRAM and storage.</p>
              ) : topRecs.length === 0 ? (
                <p className="mt-3 text-xs leading-relaxed text-slate-500">Your device is light for local models — a free API tier (Gemini, Groq) is the best brain for you right now.</p>
              ) : (
                <div className="mt-4 space-y-2.5">
                  {topRecs.map((r, i) => (
                    <div key={r.model.id} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
                      <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg border font-display text-xs font-bold',
                        i === 0 ? 'border-amber-400/40 bg-amber-400/10 text-amber-300' : 'border-white/10 text-slate-500')}>{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">{r.model.name}<FitBadge fit={modelFit(r.model, device)} small /></div>
                        <div className="truncate text-[11px] text-slate-500">{r.model.params} · ~{r.model.quants.find((q) => q.name === r.model.recommendedQuant)!.ramGB} GB RAM · {r.model.context} ctx</div>
                      </div>
                    </div>
                  ))}
                  <Link to="/device" className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200">See full analysis <ArrowRight className="h-3.5 w-3.5" /></Link>
                </div>
              )}
            </div>
          </Reveal>

          {/* config snapshot */}
          <Reveal>
            <div className="panel p-6">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold text-white"><LayoutDashboard className="h-5 w-5 text-violet-300" /> My setup</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Preferred brain</dt>
                  <dd className="flex items-center gap-1.5 text-slate-200">
                    {agents[0] ? (agents[0].brain === 'local' ? <><HardDrive className="h-3.5 w-3.5 text-emerald-300" /> Local</> : <><Cloud className="h-3.5 w-3.5 text-sky-300" /> API</>) : '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Favorite language</dt>
                  <dd className="text-slate-200">{agents[0] ? (agents[0].language === 'python' ? 'Python' : 'JavaScript') : '—'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Agent focus</dt>
                  <dd className="text-slate-200 capitalize">{agents[0]?.agentType ?? agentType}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Storage</dt>
                  <dd className="text-slate-200">Browser-local only</dd>
                </div>
              </dl>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
