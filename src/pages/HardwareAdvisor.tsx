import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CircuitBoard, Cpu, HardDrive, MemoryStick, MonitorDown, ScanLine,
  ChevronDown, ExternalLink, Gauge, Info, Layers, Sparkles,
  Wand2, ArrowRight, ShieldCheck, Cloud, Terminal,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  AGENT_TYPE_LABEL, classifyDevice, detectHardware, DeviceSpecs, EMPTY_DEVICE,
  modelFit, recommendModels, DetectionResult,
} from '../data/hardware';
import { AGENT_TYPES, AgentType, LocalModel, API_PROVIDERS } from '../data/models';
import { FitBadge, LocalBadge, SectionHead, Tip, CopyBtn } from '../components/ui';
import { Counter } from '../components/motion';
import { cn } from '../utils/cn';

/* ── small pieces ── */

function SpecField({ label, icon: Icon, children, tip }: { label: string; icon: any; children: React.ReactNode; tip?: string }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <Icon className="h-3.5 w-3.5 text-violet-300" />{label}{tip && <Tip text={tip} />}
      </span>
      {children}
    </label>
  );
}

function Slider({ value, min, max, step = 1, onChange, unit }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit: string }) {
  return (
    <div className="flex items-center gap-3">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)}
        className="flex-1" style={{ ['--fill' as any]: `${((value - min) / (max - min)) * 100}%` }} />
      <span className="w-20 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-center font-mono text-xs text-white">{value} {unit}</span>
    </div>
  );
}

function Meter({ label, have, need, unit, color = '#8b5cf6' }: { label: string; have: number; need: number; unit: string; color?: string }) {
  const pct = Math.min(100, (have / Math.max(need, 0.1)) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-slate-500">{label}</span>
        <span className="font-mono text-slate-400">{have} / {need} {unit}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div className="h-full rounded-full" style={{ background: pct >= 100 ? '#34d399' : pct >= 75 ? '#fbbf24' : color }}
          initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct)}%` }} transition={{ duration: 0.8 }} />
      </div>
    </div>
  );
}

const SPEED_LABEL = ['', 'very slow', 'slow', 'moderate', 'fast', 'very fast'];

/* ── model card ── */

function ModelCard({ m, d, rank, reason }: { m: LocalModel; d: DeviceSpecs; rank: number; reason: string }) {
  const [open, setOpen] = useState(false);
  const fit = modelFit(m, d);
  const q = m.quants.find((x) => x.name === m.recommendedQuant)!;
  return (
    <div className={cn('panel overflow-hidden transition-all', rank === 0 && 'border-violet-400/40')}>
      {rank === 0 && <div className="bg-gradient-to-r from-violet-500/20 to-cyan-400/10 px-5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200">Top pick for your device</div>}
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-4 p-5 text-left">
        <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-xl border font-display text-sm font-bold',
          rank === 0 ? 'border-violet-400/50 bg-violet-500/15 text-violet-200' : 'border-white/10 bg-white/[0.03] text-slate-400')}>
          {m.params}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-base font-bold text-white">{m.name}</span>
            <LocalBadge small /><FitBadge fit={fit} small />
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{m.tagline}</p>
        </div>
        <div className="hidden items-center gap-5 text-[11px] text-slate-500 md:flex">
          <span className="flex items-center gap-1.5"><MemoryStick className="h-3.5 w-3.5 text-violet-300" />~{q.ramGB} GB RAM</span>
          <span className="flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5 text-cyan-300" />{SPEED_LABEL[m.speed]}</span>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-500 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border-t border-white/[0.07] p-5">
              {/* why */}
              <div className="flex gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                <p className="text-sm leading-relaxed text-slate-300">{reason}</p>
              </div>
              <div className="mt-5 grid gap-6 md:grid-cols-2">
                {/* requirements */}
                <div className="space-y-3.5">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Fit on your device</div>
                  <Meter label="Memory (RAM/unified)" have={d.ramGB} need={q.ramGB} unit="GB" />
                  {d.vramGB > 0 && <Meter label="GPU VRAM" have={d.vramGB} need={m.minVramGB} unit="GB" color="#22d3ee" />}
                  <Meter label="Free storage" have={d.storageGB} need={m.storageGB + 2} unit="GB" color="#f472b6" />
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    {[[m.context, 'context'], [SPEED_LABEL[m.speed], 'speed'], ['★'.repeat(m.quality), 'quality']].map(([v, l]) => (
                      <div key={l} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2 py-2">
                        <div className="font-mono text-xs text-white">{v}</div>
                        <div className="mt-0.5 text-[10px] capitalize text-slate-500">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* quants + install */}
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Quantization options</div>
                  <div className="space-y-1.5">
                    {m.quants.map((qt) => (
                      <div key={qt.name} className={cn('flex items-center justify-between rounded-lg border px-3 py-2 text-xs',
                        qt.name === m.recommendedQuant ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/[0.07] bg-white/[0.02]')}>
                        <span className="font-mono font-semibold text-white">{qt.name}{qt.name === m.recommendedQuant && <span className="ml-2 text-[10px] font-sans text-violet-300">recommended</span>}</span>
                        <span className="font-mono text-slate-400">{qt.sizeGB} GB · ~{qt.ramGB} GB RAM</span>
                      </div>
                    ))}
                  </div>
                  <div className="dark-canvas mt-4 rounded-lg bg-[#0a0a14] border border-white/10 p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500"><Terminal className="h-3 w-3" /> Run with Ollama</span>
                      <CopyBtn text={m.ollama} label="" />
                    </div>
                    <code className="font-mono text-xs text-emerald-300">{m.ollama}</code>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                    <a href={m.source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-violet-300 hover:text-violet-200">
                      Official model page <ExternalLink className="h-3 w-3" />
                    </a>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-500">License: {m.license}</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">Also runs in: {m.runtimes.map((r) => r === 'lmstudio' ? 'LM Studio' : r === 'gpt4all' ? 'GPT4All' : r === 'llamacpp' ? 'llama.cpp' : r === 'vllm' ? 'vLLM' : r[0].toUpperCase() + r.slice(1)).join(' · ')}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── main page ── */

export default function HardwareAdvisor() {
  const { device, setDevice, agentType, setAgentType } = useApp();
  const [form, setForm] = useState<DeviceSpecs>(device ?? EMPTY_DEVICE);
  const [detecting, setDetecting] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [analyzed, setAnalyzed] = useState(!!device);

  useEffect(() => { if (device) setForm(device); }, []);

  const tier = useMemo(() => classifyDevice(form), [form]);
  const recs = useMemo(() => recommendModels(form, agentType), [form, agentType]);
  const cloudSuggestions = API_PROVIDERS.filter((p) => p.freeTier.toLowerCase().includes('free')).slice(0, 3);

  const runDetect = async () => {
    setDetecting(true);
    try {
      const res: DetectionResult = await detectHardware();
      setForm(res.specs);
      setNotes(res.notes);
    } finally {
      setDetecting(false);
    }
  };

  const analyze = () => { setDevice(form); setAnalyzed(true); setTimeout(() => document.getElementById('verdict')?.scrollIntoView({ behavior: 'smooth' }), 120); };
  const set = (patch: Partial<DeviceSpecs>) => { setForm((f) => ({ ...f, ...patch })); setAnalyzed(false); };

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <SectionHead kicker="Device check" title={<>Can my device <span className="grad-text">run AI models?</span></>}
        sub="Tell us your specs — or let the browser detect what it safely can. We'll classify your machine and match it to models that will genuinely run, with the math shown." />

      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        {/* ── input form ── */}
        <div className="space-y-6">
          <div className="panel p-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold text-white"><CircuitBoard className="h-5 w-5 text-violet-300" /> Your device</h3>
              <button onClick={runDetect} disabled={detecting}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/20 disabled:opacity-50">
                <ScanLine className={cn('h-3.5 w-3.5', detecting && 'animate-pulse')} />
                {detecting ? 'Detecting…' : 'Auto-detect'}
              </button>
            </div>
            <AnimatePresence>
              {notes.length > 0 && (
                <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-1.5 overflow-hidden rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] p-3.5">
                  {notes.map((n, i) => (
                    <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-cyan-100/80"><Info className="mt-0.5 h-3 w-3 shrink-0" />{n}</li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
            <div className="mt-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <SpecField label="Operating system" icon={MonitorDown}>
                  <select className="field" value={form.os} onChange={(e) => set({ os: e.target.value })}>
                    <option value="windows">Windows</option><option value="macos">macOS</option><option value="linux">Linux</option>
                  </select>
                </SpecField>
                <SpecField label="Architecture" icon={Cpu} tip="Apple Silicon (M1–M4) is arm64 — its RAM doubles as GPU memory, which is excellent for local AI.">
                  <select className="field" value={form.arch} onChange={(e) => set({ arch: e.target.value })}>
                    <option value="x86_64">x86-64 (Intel/AMD)</option><option value="arm64">ARM64 (Apple M / Snapdragon)</option>
                  </select>
                </SpecField>
              </div>
              <SpecField label={`CPU cores — ${form.cpuCores}`} icon={Cpu}>
                <Slider value={form.cpuCores} min={2} max={32} onChange={(v) => set({ cpuCores: v })} unit="cores" />
              </SpecField>
              <SpecField label={`Total RAM — ${form.ramGB} GB`} icon={MemoryStick} tip="System memory. Local models live here when not on the GPU. Rule of thumb: model file size × 1.3 of free RAM.">
                <Slider value={form.ramGB} min={4} max={128} step={4} onChange={(v) => set({ ramGB: v })} unit="GB" />
              </SpecField>
              <SpecField label={`GPU VRAM — ${form.vramGB === 0 ? 'none / integrated' : form.vramGB + ' GB'}`} icon={Gauge} tip="Dedicated graphics memory. Check your GPU box/spec page. 0 = integrated graphics. Models fully in VRAM run 5–20× faster.">
                <Slider value={form.vramGB} min={0} max={48} step={2} onChange={(v) => set({ vramGB: v })} unit="GB" />
              </SpecField>
              <SpecField label="GPU model (optional)" icon={Layers}>
                <input className="field" placeholder="e.g. RTX 3060, Radeon 780M, Apple M3" value={form.gpuName} onChange={(e) => set({ gpuName: e.target.value })} />
              </SpecField>
              <SpecField label={`Free storage — ${form.storageGB} GB`} icon={HardDrive}>
                <Slider value={form.storageGB} min={10} max={500} step={10} onChange={(v) => set({ storageGB: v })} unit="GB" />
              </SpecField>
              <button onClick={analyze}
                className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110">
                Analyze my device <ArrowRight className="ml-1 inline h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-4 text-xs leading-relaxed text-emerald-100/70">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            Everything runs in your browser. Your specs are stored only in localStorage on this device — nothing is uploaded anywhere.
          </div>
        </div>

        {/* ── results ── */}
        <div id="verdict" className="space-y-6 scroll-mt-24">
          <AnimatePresence mode="wait">
            {!analyzed ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="panel grid min-h-[420px] place-items-center p-10 text-center">
                <div>
                  <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 4, repeat: Infinity }} className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-violet-400/30 bg-violet-500/10">
                    <Wand2 className="h-9 w-9 text-violet-300" />
                  </motion.div>
                  <h3 className="mt-6 font-display text-xl font-bold text-white">Your verdict appears here</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                    Fill in your specs (or hit auto-detect) and press <span className="text-slate-300">Analyze my device</span>. We'll classify your machine and match every model honestly.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="results" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* tier card */}
                <div className="panel grad-border shine p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Device classification</div>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="font-display text-2xl font-bold" style={{ color: tier.color }}>{tier.label}</span>
                        <span className="chip border" style={{ color: tier.color, borderColor: tier.color + '44', background: tier.color + '12' }}>
                          <Cpu className="h-3 w-3" /> {form.cpuCores} cores · {form.ramGB} GB RAM{form.vramGB > 0 ? ` · ${form.vramGB} GB VRAM` : ' · no dGPU'}
                        </span>
                      </div>
                      <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-400">{tier.summary}</p>
                    </div>
                    <div className="grid h-16 w-16 place-items-center rounded-2xl border" style={{ borderColor: tier.color + '55', background: tier.color + '12' }}>
                      <CircuitBoard className="h-8 w-8" style={{ color: tier.color }} />
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-4 gap-2">
                    {[
                      { v: form.cpuCores, s: '', l: 'CPU cores', c: '#a78bfa' },
                      { v: form.ramGB, s: ' GB', l: 'RAM', c: '#8b5cf6' },
                      { v: form.vramGB, s: ' GB', l: 'VRAM', c: '#22d3ee' },
                      { v: form.storageGB, s: ' GB', l: 'free disk', c: '#f472b6' },
                    ].map((sp, i) => (
                      <motion.div key={sp.l} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 140, damping: 18, delay: 0.25 + i * 0.08 }}
                        className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-2 py-3 text-center">
                        <div className="font-display text-lg font-bold" style={{ color: sp.c }}>
                          <Counter value={sp.v} suffix={sp.s} duration={1.2} />
                        </div>
                        <div className="text-[10px] text-slate-500">{sp.l}</div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">You can run</div>
                      <p className="mt-1 text-sm text-slate-300">{tier.canRun}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Our advice</div>
                      <p className="mt-1 text-sm text-slate-300">{tier.advice}</p>
                    </div>
                  </div>
                </div>

                {/* agent type */}
                <div className="panel p-5">
                  <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                    What kind of agent do you want? <Tip text="Different agents need different strengths — coders want code models, RAG agents want long context, research agents want reasoning." />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {AGENT_TYPES.map((t) => (
                      <button key={t.id} onClick={() => setAgentType(t.id as AgentType)}
                        className={cn('rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all',
                          agentType === t.id ? 'border-violet-400/60 bg-violet-500/15 text-white' : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/25')}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-600">{AGENT_TYPES.find((t) => t.id === agentType)?.blurb}</p>
                </div>

                {/* recommendations */}
                <div>
                  <h3 className="mb-1 font-display text-lg font-bold text-white">
                    Recommended for a {AGENT_TYPE_LABEL(agentType).toLowerCase()}
                  </h3>
                  <p className="mb-4 text-sm text-slate-500">{recs.length} local models fit your device — ranked by purpose match, fit and quality.</p>
                  <div className="space-y-3">
                    {recs.slice(0, 5).map((r, i) => (
                      <motion.div key={r.model.id}
                        initial={{ opacity: 0, y: 26, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 110, damping: 18, delay: 0.2 + i * 0.09 }}>
                        <ModelCard m={r.model} d={form} rank={i} reason={r.reason} />
                      </motion.div>
                    ))}
                    {recs.length === 0 && (
                      <div className="panel p-6 text-center text-sm text-slate-400">
                        No local model fits comfortably — but that's okay. A free cloud API below is your best start.
                      </div>
                    )}
                  </div>
                </div>

                {/* cloud fallback */}
                <div className="panel border-sky-400/20 p-6">
                  <div className="flex items-center gap-2 font-display text-base font-bold text-white"><Cloud className="h-5 w-5 text-sky-300" /> Want more power than your hardware allows?</div>
                  <p className="mt-1.5 text-sm text-slate-500">Cloud APIs give you frontier models on any device — these have free tiers to start with:</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {cloudSuggestions.map((p) => (
                      <a key={p.id} href={p.getKeyUrl} target="_blank" rel="noreferrer"
                        className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition hover:border-sky-400/40 hover:bg-sky-400/[0.05]">
                        <div className="flex items-center justify-between"><span className="text-sm font-semibold text-white">{p.name}</span><ExternalLink className="h-3.5 w-3.5 text-slate-600" /></div>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{p.freeTier}</p>
                      </a>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link to="/brain" className="text-xs font-semibold text-violet-300 hover:text-violet-200">Compare local vs API in depth →</Link>
                    <Link to="/builder" className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">Build an agent with these models →</Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
