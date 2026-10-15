/* ── Live agent-trace terminal ───────────────────────────────────
   Types out a real think→act→observe loop, forever. The product
   explaining itself in the hero. */

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Terminal } from 'lucide-react';

interface TraceLine { tag: 'you' | 'think' | 'act' | 'obs' | 'answer'; text: string }

const TAG_STYLE: Record<TraceLine['tag'], { color: string; label: string }> = {
  you:    { color: '#929894', label: 'you' },
  think:  { color: '#8eaaa5', label: 'think' },
  act:    { color: '#ff783d', label: 'act' },
  obs:    { color: '#8eaaa5', label: 'obs' },
  answer: { color: '#ff783d', label: 'answer' },
};

const SCRIPT: TraceLine[] = [
  { tag: 'you',    text: 'What is 18% of $120?' },
  { tag: 'think',  text: 'Calculate 18% of the given amount.' },
  { tag: 'act',    text: 'calculator("120 * 0.18")' },
  { tag: 'obs',    text: '$21.60' },
  { tag: 'answer', text: '18% of $120 is $21.60.' },
];

export default function AgentTrace() {
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
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
  }, [line, chars, reducedMotion]);

  const done = reducedMotion || line >= SCRIPT.length;
  const visibleLines = reducedMotion ? SCRIPT : SCRIPT.slice(0, line);

  return (
    <figure className="codeblock relative overflow-hidden" aria-label="Illustrative sample of an agent using the calculator tool">
      {/* window chrome */}
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
            <Terminal className="h-3.5 w-3.5" /> example tool trace
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-mineral">
          Example
        </span>
      </div>

      {/* transcript */}
      <div className="min-h-[248px] space-y-2.5 p-4 sm:min-h-[240px] sm:p-5">
        {visibleLines.map((l, i) => (
          <motion.div
            key={i}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            className="flex gap-2.5"
          >
            <Tag tag={l.tag} />
            <span className="font-mono text-[12.5px] leading-relaxed text-slate-300">{l.text}</span>
          </motion.div>
        ))}
        {!reducedMotion && !done && (
          <div className="flex gap-2.5">
            <Tag tag={SCRIPT[line].tag} />
            <span className="font-mono text-[12.5px] leading-relaxed text-slate-300">
              {SCRIPT[line].text.slice(0, chars)}
              <span className="term-cursor" />
            </span>
          </div>
        )}
        {done && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            className="pt-1"
          >
            <span className="font-mono text-[12.5px] text-slate-500">Example complete</span>
          </motion.div>
        )}
      </div>
    </figure>
  );
}

function Tag({ tag }: { tag: TraceLine['tag'] }) {
  const s = TAG_STYLE[tag];
  return (
    <span className="mt-[3px] h-fit shrink-0 rounded-md border px-1.5 py-px font-mono text-[9.5px] font-bold uppercase tracking-wider"
      style={{ color: s.color, borderColor: `${s.color}66`, background: `${s.color}14` }}>
      {s.label}
    </span>
  );
}
