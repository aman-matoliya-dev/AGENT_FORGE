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
      whileHover={{ y: -1 }} whileTap={{ scale: 0.985, y: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      className={cn('btn-sheen af-primary-btn group relative inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold disabled:pointer-events-none', className)}>
      {children}
    </motion.button>
  );
}

export function GhostBtn({ children, onClick, className, active }: {
  children: ReactNode; onClick?: () => void; className?: string; active?: boolean;
}) {
  return (
    <motion.button onClick={onClick}
      whileHover={{ y: -1 }} whileTap={{ scale: 0.985, y: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      data-active={active ? 'true' : undefined}
      className={cn('af-ghost-btn inline-flex items-center justify-center gap-2 border px-5 py-3 text-sm font-medium', className)}>
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
    <span className={cn('chip af-badge-mineral border', small ? 'text-[10px] px-2 py-0.5' : '')}>
      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Cloud API
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
      <div className="af-section-kicker relative mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase">
        {kicker}
      </div>
      <h2 className="af-section-title relative font-display text-3xl font-bold tracking-[-0.035em] sm:text-4xl">{title}</h2>
      {sub && <p className={cn('af-section-description relative mt-3 max-w-2xl text-[15px] leading-relaxed', center && 'mx-auto')}>{sub}</p>}
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
        <span className="af-tooltip dark-canvas pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 border px-3 py-2 text-xs leading-relaxed text-slate-300">
          {text}
        </span>
      )}
    </span>
  );
}

/* ── Copy button ── */
export function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
    window.setTimeout(() => setStatus('idle'), 1600);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { void copy(); }}
        aria-label={label ? `Copy ${label}` : 'Copy to clipboard'}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-violet-400/40 hover:text-white ${status === 'failed' ? 'text-rose-300' : ''}`}>
        {status === 'copied' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        {status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : label ?? 'Copy'}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {status === 'copied' ? 'Copied to clipboard.' : status === 'failed' ? 'Copy failed. Clipboard was not updated.' : ''}
      </span>
    </>
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
    <div className="h-1.5 w-full overflow-hidden rounded-sm bg-white/[0.08]">
      <motion.div className="h-full origin-left"
        style={{ background: accent ?? 'var(--accent-forge)' }}
        initial={{ scaleX: 0 }} animate={{ scaleX: Math.min(100, Math.max(0, value)) / 100 }}
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