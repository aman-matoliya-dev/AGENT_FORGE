import { ReactNode, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Info } from 'lucide-react';
import { cn } from '../utils/cn';
import { FIT_META, Fit } from '../data/hardware';

/* ── Buttons ── */
export function PrimaryBtn({ children, onClick, className, disabled }: {
  children: ReactNode; onClick?: () => void; className?: string; disabled?: boolean;
}) {
  return (
    <motion.button onClick={onClick} disabled={disabled}
      whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.96, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      className={cn('btn-sheen group relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-shadow hover:shadow-violet-500/45 disabled:opacity-40 disabled:pointer-events-none', className)}>
      {children}
    </motion.button>
  );
}

export function GhostBtn({ children, onClick, className, active }: {
  children: ReactNode; onClick?: () => void; className?: string; active?: boolean;
}) {
  return (
    <motion.button onClick={onClick}
      whileHover={{ y: -1.5 }} whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      className={cn('inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium transition-colors',
        active
          ? 'border-violet-400/50 bg-violet-500/15 text-violet-200'
          : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]', className)}>
      {children}
    </motion.button>
  );
}

/* ── Badges ── */
export function FitBadge({ fit, small }: { fit: Fit; small?: boolean }) {
  const meta = FIT_META[fit];
  return (
    <span className={cn('chip border', small ? 'text-[10px] px-2 py-0.5' : '')}
      style={{ color: meta.color, borderColor: meta.color + '44', backgroundColor: meta.color + '14' }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

export function CloudBadge({ small }: { small?: boolean }) {
  return (
    <span className={cn('chip border border-sky-400/30 bg-sky-400/10 text-sky-300', small ? 'text-[10px] px-2 py-0.5' : '')}>
      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> Cloud API
    </span>
  );
}

export function LocalBadge({ small }: { small?: boolean }) {
  return (
    <span className={cn('chip border border-emerald-400/30 bg-emerald-400/10 text-emerald-300', small ? 'text-[10px] px-2 py-0.5' : '')}>
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Runs locally
    </span>
  );
}

/* ── Section heading ── */
export function SectionHead({ kicker, title, sub, center, index }: { kicker: string; title: ReactNode; sub?: string; center?: boolean; index?: string }) {
  return (
    <div className={cn('relative mb-10', center && 'text-center')}>
      {index && (
        <span aria-hidden className={cn('text-outline pointer-events-none absolute -top-16 hidden select-none font-display text-8xl font-bold leading-none opacity-25 lg:block',
          center ? 'left-1/2 -translate-x-1/2' : 'right-0')}>
          {index}
        </span>
      )}
      <div className="relative mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-300">
        {kicker}
      </div>
      <h2 className="relative font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
      {sub && <p className={cn('relative mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-400', center && 'mx-auto')}>{sub}</p>}
    </div>
  );
}

/* ── Tooltip ── */
export function Tip({ text, children }: { text: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center gap-1" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {children ?? <Info className="h-3.5 w-3.5 cursor-help text-slate-500 hover:text-violet-300" />}
      {open && (
        <span className="dark-canvas pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 rounded-lg border border-white/10 bg-[#14142a] px-3 py-2 text-xs leading-relaxed text-slate-300 shadow-xl shadow-black/50">
          {text}
        </span>
      )}
    </span>
  );
}

/* ── Copy button ── */
export function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); setOk(true); setTimeout(() => setOk(false), 1600); }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-violet-400/40 hover:text-white">
      {ok ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {ok ? 'Copied' : label ?? 'Copy'}
    </button>
  );
}

/* ── Code block with light syntax tinting ── */
export function Code({ code, title, actions }: { code: string; title?: string; actions?: ReactNode }) {
  return (
    <div className="codeblock">
      {title && (
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
              <i className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <i className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            </span>
            <span className="ml-2 font-mono text-xs text-slate-500">{title}</span>
          </div>
          {actions}
        </div>
      )}
      <pre dangerouslySetInnerHTML={{ __html: tint(code) }} />
    </div>
  );
}

function tint(code: string): string {
  const esc = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc
    .replace(/("""[\s\S]*?"""|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g, '<span class="c-str">$1</span>')
    .replace(/(#.*$|\/\/.*$)/gm, '<span class="c-cm">$1</span>')
    .replace(/\b(import|from|export|const|let|var|function|def|class|return|if|else|elif|for|while|in|of|new|await|async|try|catch|except|with|as|None|True|False|null|undefined|true|false|raise|typeof|interface|type)\b/g, '<span class="c-kw">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="c-num">$1</span>');
}

/* ── Progress bar ── */
export function ProgressBar({ value, accent }: { value: number; accent?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <motion.div className="h-full rounded-full"
        style={{ background: accent ?? 'linear-gradient(90deg,#8b5cf6,#22d3ee)' }}
        initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}

/* ── Reveal-on-scroll wrapper ── */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className}
      initial={{ opacity: 0, y: 30, scale: 0.99 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ type: 'spring', stiffness: 80, damping: 18, delay }}>
      {children}
    </motion.div>
  );
}