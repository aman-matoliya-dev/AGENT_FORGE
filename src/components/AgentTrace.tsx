/* ── Live agent-trace terminal ───────────────────────────────────
   Types out a real think→act→observe loop, forever. The product
   explaining itself in the hero. */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal } from 'lucide-react';

interface TraceLine { tag: 'you' | 'think' | 'act' | 'obs' | 'answer'; text: string }

const TAG_STYLE: Record<TraceLine['tag'], { color: string; label: string }> = {
  you:    { color: '#94a3b8', label: 'you' },
  think:  { color: '#22d3ee', label: 'think' },
  act:    { color: '#fbbf24', label: 'act' },
  obs:    { color: '#34d399', label: 'obs' },
  answer: { color: '#a78bfa', label: 'answer' },
};

const SCRIPT: TraceLine[] = [
  { tag: 'you',    text: 'What is 18% of the price of the best espresso machine under $300?' },
  { tag: 'think',  text: 'I need a product, its real price, then arithmetic. Search first.' },
  { tag: 'act',    text: 'web_search("best espresso machine under $300")' },
  { tag: 'obs',    text: 'Breville Bambino — $299, top rated this year.' },
  { tag: 'think',  text: 'Got the price. Never do math in my head — use the calculator.' },
  { tag: 'act',    text: 'calculator("299 * 0.18")' },
  { tag: 'obs',    text: '53.82' },
  { tag: 'answer', text: 'The Breville Bambino costs $299 — and 18% of that is $53.82.' },
];

export default function AgentTrace() {
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);

  useEffect(() => {
    const current = SCRIPT[line];
    if (!current) {
      const t = setTimeout(() => { setLine(0); setChars(0); }, 3400);
      return () => clearTimeout(t);
    }
    if (chars < current.text.length) {
      const speed = current.tag === 'act' ? 34 : current.tag === 'you' ? 26 : 15;
      const t = setTimeout(() => setChars((c) => c + 1), speed);
      return () => clearTimeout(t);
    }
    const hold = current.tag === 'obs' ? 900 : current.tag === 'answer' ? 2200 : 650;
    const t = setTimeout(() => { setLine((l) => l + 1); setChars(0); }, hold);
    return () => clearTimeout(t);
  }, [line, chars]);

  const done = line >= SCRIPT.length;

  return (
    <div className="codeblock relative overflow-hidden shadow-2xl shadow-black/60">
      {/* window chrome */}
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5">
            <i className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
            <i className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <i className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </span>
          <span className="ml-2 flex items-center gap-1.5 font-mono text-xs text-slate-500">
            <Terminal className="h-3.5 w-3.5" /> agent-trace — live
          </span>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400/80">
          <motion.span className="h-1.5 w-1.5 rounded-full bg-emerald-400"
            animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
          looping
        </span>
      </div>

      {/* transcript */}
      <div className="min-h-[248px] space-y-2.5 p-4 sm:min-h-[240px] sm:p-5">
        {SCRIPT.slice(0, line).map((l, i) => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
            <Tag tag={l.tag} />
            <span className="font-mono text-[12.5px] leading-relaxed text-slate-300">{l.text}</span>
          </motion.div>
        ))}
        {!done && (
          <div className="flex gap-2.5">
            <Tag tag={SCRIPT[line].tag} />
            <span className="font-mono text-[12.5px] leading-relaxed text-slate-300">
              {SCRIPT[line].text.slice(0, chars)}
              <span className="term-cursor" />
            </span>
          </div>
        )}
        {done && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-1">
            <span className="font-mono text-[12.5px] text-slate-600">agent done in 3 steps · restarting<span className="term-cursor" /></span>
          </motion.div>
        )}
      </div>

      {/* corner glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
    </div>
  );
}

function Tag({ tag }: { tag: TraceLine['tag'] }) {
  const s = TAG_STYLE[tag];
  return (
    <span className="mt-[3px] h-fit shrink-0 rounded-md border px-1.5 py-px font-mono text-[9.5px] font-bold uppercase tracking-wider"
      style={{ color: s.color, borderColor: s.color + '45', background: s.color + '12' }}>
      {s.label}
    </span>
  );
}
