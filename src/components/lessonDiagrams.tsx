import { ComponentType, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Brain, User, Wrench, Eye, RefreshCw, MessageSquare, Cpu, Cloud,
  HardDrive, FileText, Scissors, Boxes, Search, Sparkles, Hammer, Check,
  ListChecks, GitBranch, CircleDot, ArrowRight, ArrowDown, Database, MemoryStick,
} from 'lucide-react';

import { cn } from '../utils/cn';
import { DiagramKey } from '../data/learning';

/* Shared shell */
function Shell({ children, accent = '#8b5cf6' }: { children: React.ReactNode; accent?: string }) {
  return (
    <div className="diagram-shell relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b18] p-5 sm:p-7">
      <div className="pointer-events-none absolute -top-20 left-1/2 h-44 w-2/3 -translate-x-1/2 rounded-full opacity-20 blur-3xl" style={{ background: accent }} />
      {children}
    </div>
  );
}

function NodeChip({ icon: Icon, label, color, active, small }: { icon: any; label: string; color: string; active?: boolean; small?: boolean }) {
  return (
    <motion.div
      animate={active ? { scale: [1, 1.07, 1], boxShadow: [`0 0 0 0 ${color}00`, `0 0 24px 2px ${color}55`, `0 0 0 0 ${color}00`] } : {}}
      transition={{ duration: 0.9 }}
      className={cn('flex shrink-0 flex-col items-center gap-1.5 rounded-xl border px-3 py-2.5 text-center', small && 'px-2 py-2')}
      style={{ borderColor: (active ? color : '#ffffff1a'), background: active ? color + '14' : '#ffffff08' }}>
      <Icon className={small ? 'h-4 w-4' : 'h-5 w-5'} style={{ color }} />
      <span className="text-[10px] font-semibold text-slate-300">{label}</span>
    </motion.div>
  );
}

/* ── 1 · chatbot vs agent ── */
function ChatbotVsAgent() {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((x) => (x + 1) % 6), 900); return () => clearInterval(t); }, []);
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Chatbot — one pass</div>
        <div className="flex items-center justify-center gap-3">
          <NodeChip icon={User} label="Question" color="#94a3b8" active={tick === 0} small />
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-600" />
          <NodeChip icon={Brain} label="LLM" color="#64748b" active={tick === 1} small />
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-600" />
          <NodeChip icon={MessageSquare} label="Reply" color="#64748b" active={tick === 2} small />
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">One shot. No tools, no checking. Hopes for the best.</p>
      </div>
      <div className="rounded-xl border border-violet-400/25 bg-violet-500/[0.05] p-4">
        <div className="mb-4 text-xs font-bold uppercase tracking-widest text-violet-300">Agent — the loop</div>
        <div className="flex items-center justify-center gap-2">
          <NodeChip icon={User} label="Goal" color="#a78bfa" active={tick === 0} small />
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-600" />
          <div className="flex items-center gap-1.5 rounded-xl border border-dashed border-violet-400/40 p-1.5">
            <NodeChip icon={Brain} label="Think" color="#22d3ee" active={tick === 1 || tick === 4} small />
            <NodeChip icon={Wrench} label="Act" color="#fbbf24" active={tick === 2} small />
            <NodeChip icon={Eye} label="Observe" color="#34d399" active={tick === 3} small />
            <RefreshCw className={cn('h-3.5 w-3.5 text-violet-300', tick === 4 ? 'animate-spin' : 'opacity-30')} />
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-600" />
          <NodeChip icon={Sparkles} label="Answer" color="#34d399" active={tick === 5} small />
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">Loops with real tools until the job is actually done.</p>
      </div>
    </div>
  );
}

/* ── 2 · the agent loop ── */
function AgentLoop() {
  const stages = [
    { icon: User, label: 'Perceive', color: '#a78bfa', desc: 'Reads your goal + all observations gathered so far.' },
    { icon: Brain, label: 'Think', color: '#22d3ee', desc: 'Reasons: “what’s missing, which tool gets me closer?”' },
    { icon: Wrench, label: 'Act', color: '#fbbf24', desc: 'Calls one tool with concrete arguments.' },
    { icon: Eye, label: 'Observe', color: '#34d399', desc: 'Reads the tool result — new evidence for the next think.' },
  ];
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % 4), 1600); return () => clearInterval(t); }, []);
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stages.map((s, k) => (
          <div key={s.label} className="flex items-center gap-2">
            <NodeChip icon={s.icon} label={s.label} color={s.color} active={i === k} />
            {k < 3 && <ArrowRight className="hidden h-4 w-4 text-slate-600 sm:block" />}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <motion.span key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-[13px] text-slate-300">
          <span className="font-semibold" style={{ color: stages[i].color }}>{stages[i].label}: </span>{stages[i].desc}
        </motion.span>
      </div>
      <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600">
        <RefreshCw className="h-3.5 w-3.5 animate-spin text-violet-400" style={{ animationDuration: '3s' }} />
        repeats until the agent has enough to answer
      </div>
    </div>
  );
}

/* ── 4 · tokens ── */
function Tokens() {
  const sentence = ['The', ' cat', ' sat', ' on', ' the'];
  const cands = [
    { w: ' mat', p: 41 }, { w: ' floor', p: 24 }, { w: ' sofa', p: 15 }, { w: ' table', p: 9 }, { w: ' roof', p: 4 },
  ];
  const [picked, setPicked] = useState(0);
  useEffect(() => { const t = setInterval(() => setPicked((x) => (x + 1) % cands.length), 1400); return () => clearInterval(t); }, []);
  return (
    <div className="grid items-center gap-6 md:grid-cols-2">
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">1 · Text becomes tokens</div>
        <div className="flex flex-wrap gap-1.5">
          {sentence.map((t, i) => (
            <motion.span key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }}
              className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1.5 font-mono text-xs text-cyan-200">“{t}”</motion.span>
          ))}
          <span className="flex items-center gap-1 rounded-lg border border-dashed border-white/20 px-2.5 py-1.5 font-mono text-xs text-slate-500">?</span>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">The model never sees “words” — only token IDs. Roughly 1 token ≈ ¾ of an English word.</p>
      </div>
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">2 · Scores the next token</div>
        <div className="space-y-1.5">
          {cands.map((c, i) => (
            <motion.div key={c.w} className={cn('flex items-center gap-2 rounded-lg border px-2.5 py-1.5',
              picked === i ? 'border-violet-400/60 bg-violet-500/15' : 'border-white/[0.06] bg-white/[0.02]')}>
              <span className="w-16 font-mono text-xs text-slate-300">“{c.w}”</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                  animate={{ width: `${c.p}%` }} transition={{ duration: 0.8 }} />
              </div>
              <span className="w-9 text-right font-mono text-[10px] text-slate-500">{c.p}%</span>
              {picked === i && <Check className="h-3.5 w-3.5 text-violet-300" />}
            </motion.div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">One token is picked, appended, and the whole thing repeats — thousands of times per answer.</p>
      </div>
    </div>
  );
}

/* ── 5 · tool call anatomy ── */
function ToolCall() {
  const stages = [
    { icon: User, label: 'User asks', color: '#a78bfa', detail: '“What’s the weather in Lisbon?”' },
    { icon: Brain, label: 'LLM decides', color: '#22d3ee', detail: 'Notices the get_weather tool in its menu.' },
    { icon: FileText, label: 'Emits JSON', color: '#fbbf24', detail: '{ "tool": "get_weather", "city": "Lisbon" }' },
    { icon: Cpu, label: 'Your code runs it', color: '#34d399', detail: 'The real function calls a weather API.' },
    { icon: Eye, label: 'Result returns', color: '#34d399', detail: '“18°C, clear skies” is pasted into the chat.' },
    { icon: MessageSquare, label: 'LLM answers', color: '#a78bfa', detail: '“It’s 18°C and sunny in Lisbon right now.”' },
  ];
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % stages.length), 1500); return () => clearInterval(t); }, []);
  return (
    <div>
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
        {stages.map((s, k) => (
          <div key={s.label} className="flex items-center gap-1">
            {k > 0 && <ArrowRight className={cn('h-4 w-4 shrink-0 transition-colors', k <= i ? 'text-amber-300' : 'text-slate-700')} />}
            <NodeChip icon={s.icon} label={s.label} color={s.color} active={i === k} small />
          </div>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <span className="font-mono text-xs" style={{ color: stages[i].color }}>step {i + 1}/6 · </span>
          <span className="font-mono text-xs text-slate-300">{stages[i].detail}</span>
        </motion.div>
      </AnimatePresence>
      <p className="mt-3 text-center text-xs text-slate-500">The model never touches the internet — it *requests*; your code *executes*.</p>
    </div>
  );
}

/* ── 6 · memory / context window ── */
function MemoryDiagram() {
  const [n, setN] = useState(6);
  const CAP = 8;
  const msgs = ['Hi!', 'Help me plan dinner', 'I’m vegetarian', 'What about pasta?', 'Add shopping list', 'And for two people', 'Now make it cheaper', 'Save that plan', 'What was step one?', 'Also nutrition info?'];
  const visible = msgs.slice(0, n);
  const dropped = Math.max(0, n - CAP);
  return (
    <div className="grid items-start gap-6 md:grid-cols-[1.3fr_1fr]">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Context window (the “workbench”)</span>
          <span className="font-mono text-[10px] text-slate-500">{Math.min(n, CAP)}/{CAP} slots</span>
        </div>
        <div className="space-y-1.5">
          <AnimatePresence>
            {visible.slice(-CAP).map((m, i) => (
              <motion.div key={m + i} layout initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }}
                className="rounded-lg border border-pink-400/20 bg-pink-400/[0.06] px-3 py-1.5 font-mono text-xs text-pink-100/90">
                {m}
              </motion.div>
            ))}
          </AnimatePresence>
          {dropped > 0 && (
            <div className="rounded-lg border border-dashed border-rose-400/30 px-3 py-1.5 text-center text-[11px] text-rose-300/80">
              {dropped} oldest message{dropped > 1 ? 's' : ''} silently dropped — the agent forgot them
            </div>
          )}
        </div>
        <input type="range" min={2} max={10} value={n} onChange={(e) => setN(+e.target.value)}
          className="mt-4 w-full" style={{ ['--fill' as any]: `${(n - 2) / 8 * 100}%` }} />
        <div className="mt-1 text-center text-[11px] text-slate-500">Drag to grow the conversation</div>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300"><MemoryStick className="h-4 w-4 text-pink-300" /> Short-term</div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">Lives in the context window. Instant, but limited — overflow means forgetting.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300"><Database className="h-4 w-4 text-violet-300" /> Long-term</div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">Facts saved to a database (“exam is on the 12th”) and fetched back when relevant.</p>
        </div>
      </div>
    </div>
  );
}

/* ── 7 · RAG ── */
function RagDiagram() {
  const chunks = ['“…photo-synthesis converts light…”', '“…mitochondria produce ATP…”', '“…chlorophyll absorbs blue/red…”'];
  const [hit, setHit] = useState(0);
  useEffect(() => { const t = setInterval(() => setHit((x) => (x + 1) % chunks.length), 1600); return () => clearInterval(t); }, []);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Phase 1 · Index (once)</div>
        <div className="flex flex-wrap items-center gap-2">
          <NodeChip icon={FileText} label="Your docs" color="#94a3b8" small />
          <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
          <NodeChip icon={Scissors} label="Chunk" color="#22d3ee" small />
          <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
          <NodeChip icon={Boxes} label="Embed → vectors" color="#a78bfa" small />
          <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
          <NodeChip icon={Database} label="Vector DB" color="#f472b6" small />
        </div>
        <div className="mt-4 space-y-1.5">
          {chunks.map((c, i) => (
            <motion.div key={c} animate={hit === i ? { borderColor: '#34d39988', backgroundColor: '#34d39914' } : { borderColor: '#ffffff11', backgroundColor: '#ffffff05' }}
              className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5">
              <span className="font-mono text-[11px] text-slate-400">{c}</span>
              {hit === i && <motion.span layoutId="raghit" className="chip border border-emerald-400/40 bg-emerald-400/10 text-emerald-300">match</motion.span>}
            </motion.div>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Phase 2 · Retrieve (per question)</div>
        <div className="space-y-2.5">
          {[
            { icon: User, t: '“Why are leaves green?”', c: '#a78bfa' },
            { icon: Search, t: 'Question → vector → nearest chunks', c: '#22d3ee' },
            { icon: FileText, t: 'Top chunks pasted into the prompt', c: '#fbbf24' },
            { icon: Brain, t: 'Model answers FROM the evidence', c: '#34d399' },
          ].map((s, i) => (
            <motion.div key={s.t} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}
              className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
              <s.icon className="h-4 w-4 shrink-0" style={{ color: s.c }} />
              <span className="font-mono text-xs text-slate-300">{s.t}</span>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.06] px-3 py-2 text-xs leading-relaxed text-emerald-200/90">
          Answer: “Leaves are green because chlorophyll absorbs blue and red light…” — grounded, not guessed.
        </div>
      </div>
    </div>
  );
}

/* ── 8 · planning tree ── */
function PlanningDiagram() {
  const tasks = [
    { t: 'Search beginner recipes', d: 0.2 }, { t: 'Pick one matching taste', d: 0.45 },
    { t: 'Check pantry vs ingredients', d: 0.7 }, { t: 'Build shopping list', d: 0.95 }, { t: 'Write step-by-step plan', d: 1.2 },
  ];
  const [done, setDone] = useState(0);
  useEffect(() => { const t = setInterval(() => setDone((x) => (x + 1) % (tasks.length + 2)), 1000); return () => clearInterval(t); }, []);
  return (
    <div className="flex flex-col items-center">
      <div className="rounded-xl border border-violet-400/40 bg-violet-500/10 px-5 py-2.5 text-center">
        <div className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Goal</div>
        <div className="font-display text-sm font-bold text-white">“Plan tonight’s dinner for two”</div>
      </div>
      <ArrowDown className="my-2 h-4 w-4 text-slate-600" />
      <div className="grid w-full gap-2 sm:grid-cols-5">
        {tasks.map((t, i) => (
          <motion.div key={t.t} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: t.d }}
            className={cn('relative rounded-xl border p-3 text-center transition-colors',
              i < done ? 'border-emerald-400/40 bg-emerald-400/[0.07]' : 'border-white/10 bg-white/[0.02]')}>
            {i < done
              ? <Check className="mx-auto h-4 w-4 text-emerald-400" />
              : <CircleDot className="mx-auto h-4 w-4 text-slate-600" />}
            <div className="mt-1.5 text-[11px] font-medium leading-snug text-slate-300">{t.t}</div>
          </motion.div>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <GitBranch className="h-3.5 w-3.5 text-amber-300" /> Big goal → small checkable steps → answer. Re-plan when a step fails.
      </p>
    </div>
  );
}

/* ── 9 · local vs api ── */
function LocalApiDiagram() {
  const [mode, setMode] = useState<'local' | 'api'>('local');
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((x) => (x + 1) % 4), 800); return () => clearInterval(t); }, []);
  return (
    <div>
      <div className="mb-6 flex justify-center">
        <div className="relative flex rounded-full border border-white/10 bg-white/[0.03] p-1">
          {(['local', 'api'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={cn('relative z-10 flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold transition-colors',
                mode === m ? 'text-white' : 'text-slate-500')}>
              {m === 'local' ? <HardDrive className="h-3.5 w-3.5" /> : <Cloud className="h-3.5 w-3.5" />}
              {m === 'local' ? 'LOCAL BRAIN' : 'API BRAIN'}
              {mode === m && <motion.span layoutId="brain-toggle" className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500" />}
            </button>
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <div className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
            <NodeChip icon={User} label="You" color="#94a3b8" small />
            <Packet active={tick === 0} />
            <NodeChip icon={Cpu} label="Your agent code" color="#a78bfa" small />
            <Packet active={tick === 1} />
            {mode === 'local'
              ? <NodeChip icon={HardDrive} label="Model on your GPU/RAM" color="#34d399" active={tick === 2} small />
              : <>
                  <NodeChip icon={Cloud} label="Internet" color="#38bdf8" active={tick === 2} small />
                  <Packet active={tick === 3} />
                  <NodeChip icon={Brain} label="Provider data center" color="#38bdf8" small />
                </>}
          </div>
          <div className="space-y-2 text-xs">
            {(mode === 'local'
              ? [['Privacy', 'Data never leaves your machine', '#34d399'], ['Internet', 'Not required at all', '#34d399'], ['Cost', 'Free per message after hardware', '#34d399'], ['Power', 'Limited by your hardware', '#fbbf24']]
              : [['Privacy', 'Prompts travel to the provider', '#fbbf24'], ['Internet', 'Required for every call', '#fbbf24'], ['Cost', 'Pay per token (free tiers exist)', '#fbbf24'], ['Power', 'Strongest models on Earth, instantly', '#34d399']]
            ).map(([k, v, c]) => (
              <div key={k} className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2">
                <span className="font-semibold text-slate-400">{k}</span>
                <span style={{ color: c as string }} className="text-right">{v}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Packet({ active }: { active?: boolean }) {
  return (
    <div className="relative h-px w-6 shrink-0 bg-slate-700 sm:w-10">
      <motion.span className="absolute -top-[3px] h-[7px] w-[7px] rounded-full bg-cyan-300"
        animate={active ? { x: [0, 32, 0], opacity: [0, 1, 0] } : { opacity: 0 }}
        transition={{ duration: 0.8 }} />
    </div>
  );
}

/* ── 10 · build checklist ── */
function BuildChecklist() {
  const items = ['Name & purpose', 'System prompt & personality', 'Brain: local or API', 'Model choice (fits your device)', 'Tools selected', 'Memory strategy', 'Generated code + run it'];
  const [done, setDone] = useState(0);
  useEffect(() => { const t = setInterval(() => setDone((x) => (x + 1) % (items.length + 3)), 700); return () => clearInterval(t); }, []);
  return (
    <div className="grid items-center gap-6 md:grid-cols-2">
      <div className="space-y-2">
        {items.map((t, i) => (
          <div key={t} className={cn('flex items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-colors',
            i < done ? 'border-emerald-400/30 bg-emerald-400/[0.06]' : 'border-white/[0.07] bg-white/[0.02]')}>
            <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md border',
              i < done ? 'border-emerald-400 bg-emerald-400/20' : 'border-slate-600')}>
              {i < done && <Check className="h-3.5 w-3.5 text-emerald-400" />}
            </span>
            <span className={cn('text-sm', i < done ? 'text-slate-200' : 'text-slate-500')}>{t}</span>
          </div>
        ))}
      </div>
      <div className="text-center">
        <ListChecks className="mx-auto h-10 w-10 text-violet-300" />
        <p className="mt-3 text-sm leading-relaxed text-slate-400">The builder walks you through every checkbox with explanations — then hands you a real project.</p>
        <Link to="/builder" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110">
          <Hammer className="h-4 w-4" /> Open the builder
        </Link>
      </div>
    </div>
  );
}

const DIAGRAMS: Partial<Record<DiagramKey, ComponentType>> = {
  'chatbot-vs-agent': ChatbotVsAgent,
  'agent-loop': AgentLoop,
  tokens: Tokens,
  'tool-call': ToolCall,
  memory: MemoryDiagram,
  rag: RagDiagram,
  planning: PlanningDiagram,
  'local-api': LocalApiDiagram,
  'build-checklist': BuildChecklist,
};

export function LessonDiagram({ k }: { k: DiagramKey }) {
  const D = DIAGRAMS[k];
  if (!D) return null; // 'architecture' handled by page with ArchitectureDiagram
  return (
    <Shell>
      <D />
    </Shell>
  );
}
