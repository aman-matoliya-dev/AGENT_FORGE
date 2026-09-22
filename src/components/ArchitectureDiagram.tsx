import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Workflow, Brain, Wrench, Database, BookOpen,
  MessageSquareText, ArrowRight, ChevronRight, X, Cloud, HardDrive,
} from 'lucide-react';
import { cn } from '../utils/cn';

export interface ArchConfig {
  brain: 'local' | 'api';
  modelLabel?: string;
  toolCount: number;
  memory: string;   // 'none' | 'buffer' | ...
  knowledge: string; // 'none' | 'rag'
}

interface NodeDef {
  id: string;
  label: string;
  icon: typeof User;
  color: string;
  short: string;
  detail: string;
  owns: string[];
  absent?: (c: ArchConfig) => boolean;
  dynamic?: (c: ArchConfig) => { sub?: string; badge?: React.ReactNode };
}

const NODES: NodeDef[] = [
  {
    id: 'user', label: 'User', icon: User, color: '#94a3b8',
    short: 'The human with a goal',
    detail: 'Everything starts with intent. The user describes what they want in plain language — the agent’s job is converting that fuzzy wish into concrete, checkable steps.',
    owns: ['Providing the goal', 'Judging the final answer', 'Correcting the agent when it drifts'],
  },
  {
    id: 'agent', label: 'Orchestrator', icon: Workflow, color: '#8b5cf6',
    short: 'Your code running the loop',
    detail: 'The orchestrator is ordinary code — no AI inside. It sends messages to the model, executes requested tool calls, appends results, counts steps, and stops the loop. When people say “agent framework”, this is the part they automate.',
    owns: ['Running the think→act→observe loop', 'Executing tool calls safely', 'Enforcing step limits and budgets', 'Logging the trace'],
  },
  {
    id: 'llm', label: 'LLM (Brain)', icon: Brain, color: '#22d3ee',
    short: 'Decides the next action',
    detail: 'The language model reads the system prompt, conversation and tool results, then decides: call a tool, or write the final answer. It is stateless — memory is re-sent to it every call. This is the only component you can swap between local and API without changing anything else.',
    owns: ['Reasoning about the next step', 'Formatting tool requests', 'Writing the final answer'],
    dynamic: (c) => ({
      sub: c.modelLabel,
      badge: (
        <span className={cn('chip border', c.brain === 'local' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-sky-400/30 bg-sky-400/10 text-sky-300')}>
          {c.brain === 'local' ? <HardDrive className="h-3 w-3" /> : <Cloud className="h-3 w-3" />}
          {c.brain === 'local' ? 'Local' : 'API'}
        </span>
      ),
    }),
  },
  {
    id: 'tools', label: 'Tools', icon: Wrench, color: '#fbbf24',
    short: 'Functions the agent can call',
    detail: 'Tools are functions with a name, description and parameter schema. The model chooses one and fills in arguments; your orchestrator executes it and returns the result. The model never touches the world directly — it files a request.',
    owns: ['Acting on the world (search, files, math)', 'Returning structured observations'],
    absent: (c) => c.toolCount === 0,
    dynamic: (c) => ({ sub: `${c.toolCount} selected` }),
  },
  {
    id: 'memory', label: 'Memory', icon: Database, color: '#f472b6',
    short: 'What persists between calls',
    detail: 'Since models are stateless, memory is your code deciding what to carry forward: the full conversation (buffer), the recent slice (window), a compressed summary, or facts saved long-term. It is re-injected into every model call.',
    owns: ['Conversation history', 'Long-term facts', 'Keeping context within the window'],
    absent: (c) => c.memory === 'none',
    dynamic: (c) => ({ sub: c.memory }),
  },
  {
    id: 'knowledge', label: 'Knowledge (RAG)', icon: BookOpen, color: '#34d399',
    short: 'Your documents, searchable',
    detail: 'A knowledge base grounds the agent in YOUR facts: documents are chunked, indexed, and relevant passages are retrieved and injected into the prompt at question time. The model answers from evidence instead of guessing.',
    owns: ['Document storage & search', 'Grounding answers in sources', 'Reducing hallucination'],
    absent: (c) => c.knowledge === 'none',
    dynamic: (c) => ({ sub: c.knowledge === 'rag' ? 'RAG enabled' : undefined }),
  },
  {
    id: 'response', label: 'Response', icon: MessageSquareText, color: '#a78bfa',
    short: 'The final, checked answer',
    detail: 'When the model decides no more tools are needed, it writes the final answer — informed by everything the loop gathered. Good agents are honest about tool failures and cite where facts came from.',
    owns: ['Answering the original goal', 'Being honest about failures', 'Citing sources when available'],
  },
];

export default function ArchitectureDiagram({ config, compact }: { config?: ArchConfig; compact?: boolean }) {
  const cfg: ArchConfig = config ?? { brain: 'local', toolCount: 3, memory: 'buffer', knowledge: 'rag' };
  const [active, setActive] = useState<NodeDef | null>(null);
  const visible = useMemo(() => NODES.filter((n) => !(n.absent?.(cfg))), [cfg]);

  return (
    <div className="w-full">
      {/* flow */}
      <div className="flex items-stretch gap-0 overflow-x-auto no-scrollbar pb-2">
        {visible.map((n, i) => {
          const Icon = n.icon;
          const dyn = n.dynamic?.(cfg);
          return (
            <div key={n.id} className="flex items-center">
              {i > 0 && (
                <div className="relative mx-1 flex w-8 shrink-0 items-center sm:w-10">
                  <svg width="100%" height="10" className="text-slate-600">
                    <line x1="0" y1="5" x2="100%" y2="5" stroke="currentColor" strokeWidth="1.5" className="flow-line" />
                  </svg>
                  <ChevronRight className="absolute right-0 h-3.5 w-3.5 text-slate-500" />
                </div>
              )}
              <motion.button
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -5, scale: 1.04 }} whileTap={{ scale: 0.95 }}
                transition={{ delay: i * 0.07, type: 'spring', stiffness: 300, damping: 22 }}
                onClick={() => setActive(active?.id === n.id ? null : n)}
                className={cn('group relative flex w-[92px] shrink-0 flex-col items-center rounded-2xl border px-2 py-4 text-center transition-all sm:w-[110px]',
                  active?.id === n.id
                    ? 'border-transparent bg-white/[0.07] shadow-lg'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]')}
                style={active?.id === n.id ? { boxShadow: `0 0 0 1.5px ${n.color}, 0 12px 40px -12px ${n.color}66` } : {}}>
                <span className="grid h-10 w-10 place-items-center rounded-xl border sm:h-11 sm:w-11"
                  style={{ background: n.color + '18', borderColor: n.color + '44' }}>
                  <Icon className="h-5 w-5" style={{ color: n.color }} />
                </span>
                <span className="mt-2 text-[11px] font-semibold leading-tight text-slate-200 sm:text-xs">{n.label}</span>
                {dyn?.sub && <span className="mt-0.5 max-w-full truncate font-mono text-[9px] text-slate-500">{dyn.sub}</span>}
                {dyn?.badge && <span className="mt-1.5 scale-90">{dyn.badge}</span>}
              </motion.button>
            </div>
          );
        })}
      </div>

      {/* detail panel */}
      <AnimatePresence mode="wait">
        {active ? (
          <motion.div key={active.id}
            initial={{ opacity: 0, y: 10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className="mt-3 rounded-2xl border p-5" style={{ borderColor: active.color + '44', background: `linear-gradient(150deg, ${active.color}12, transparent 55%)` }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: active.color + '1e' }}>
                    <active.icon className="h-4.5 w-4.5" style={{ color: active.color }} />
                  </span>
                  <div>
                    <div className="font-display text-base font-bold text-white">{active.label}</div>
                    <div className="text-xs text-slate-400">{active.short}</div>
                  </div>
                </div>
                <button onClick={() => setActive(null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{active.detail}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {active.owns.map((o) => (
                  <span key={o} className="chip border-white/10 bg-white/[0.04] text-slate-400"><ArrowRight className="h-3 w-3" style={{ color: active.color }} />{o}</span>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          !compact && (
            <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mt-3 text-center text-xs text-slate-600">
              Click any component to learn what it does
            </motion.p>
          )
        )}
      </AnimatePresence>
    </div>
  );
}
