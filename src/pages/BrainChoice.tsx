import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Cloud, HardDrive, ShieldCheck, WifiOff, Zap, Wallet, Gauge, Key, Check,
  X, ArrowRight, ExternalLink, MonitorDown, Sparkles, Scale, Info, Trophy,
} from 'lucide-react';
import { API_PROVIDERS, RUNTIMES } from '../data/models';
import { useApp } from '../context/AppContext';
import { SectionHead, Reveal, Tip } from '../components/ui';
import { Magnetic, Stagger, StaggerItem, Tilt } from '../components/motion';
import { cn } from '../utils/cn';

const COMPARISON: { label: string; tip: string; local: [string, boolean][]; api: [string, boolean][] }[] = [
  { label: 'Privacy', tip: 'Where do your prompts and files go?', local: [['Everything stays on your machine', true], ['Safe for private docs by default', true]], api: [['Prompts travel to the provider', false], ['Check data-retention policies', false]] },
  { label: 'Internet', tip: 'Can you work on a plane, a train, a cabin?', local: [['Works fully offline', true]], api: [['Required for every request', false]] },
  { label: 'Cost model', tip: 'How you pay as you use it.', local: [['Free per message after hardware', true], ['Big models need pricey GPUs', false]], api: [['Pay per token — fractions of a cent on budget models', true], ['Free tiers exist (Gemini, Groq)', true]] },
  { label: 'Model power', tip: 'How smart a brain can you get?', local: [['Best open models — excellent, a tier below frontier', false]], api: [['The strongest models on Earth', true]] },
  { label: 'Setup effort', tip: 'Time to first “hello world”.', local: [['Install a runtime + download GBs of model', false]], api: [['Copy a key, paste, done — minutes', true]] },
  { label: 'Speed', tip: 'How fast answers stream in.', local: [['Depends on YOUR hardware', false]], api: [['Provider GPUs — consistently fast', true]] },
  { label: 'Control', tip: 'Who owns the stack?', local: [['Yours forever — no rate limits, no deprecations', true]], api: [['Subject to rate limits & model changes', false]] },
];

export default function BrainChoice() {
  const { device, brainPref, setBrainPref } = useApp();
  const [choice, setChoice] = useState<'local' | 'api' | null>(brainPref);

  const pick = (b: 'local' | 'api') => { setChoice(b); setBrainPref(b); };

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <SectionHead kicker="The big decision" title={<>Local brain <span className="text-slate-600">vs</span> <span className="grad-text">API brain</span></>}
        sub="Your agent's intelligence can live on your own machine or in a provider's cloud. Both are valid; the best builders know when to use which. Compare honestly, then choose — the builder remembers your pick." />

      {/* ── two hero cards ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal>
          <Tilt max={3} className="h-full">
          <div className={cn('panel shine relative h-full overflow-hidden p-8 transition-all', choice === 'local' && 'border-emerald-400/50 shadow-[0_0_50px_-16px_rgba(52,211,153,0.35)]')}>
            <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="flex items-center justify-between">
              <motion.span layout className="grid h-14 w-14 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10"><HardDrive className="h-7 w-7 text-emerald-300" /></motion.span>
              {choice === 'local' && (
                <motion.span layoutId="brain-pick-chip" transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  className="chip border border-emerald-400/50 bg-emerald-400/15 text-emerald-300"><Check className="h-3 w-3" /> Your pick</motion.span>
              )}
            </div>
            <h3 className="mt-5 font-display text-2xl font-bold text-white">Local Brain</h3>
            <p className="mt-1 text-sm text-emerald-300/80">The model runs on YOUR computer.</p>
            <ul className="mt-6 space-y-3">
              {[['Better privacy — data never leaves home', ShieldCheck], ['Works with zero internet', WifiOff], ['Free per message, forever', Wallet], ['Full control: no rate limits or shutdowns', Gauge], ['Needs decent RAM/VRAM for bigger models', HardDrive], ['Download models via Ollama / LM Studio', MonitorDown]].map(([t, Icon]: any, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                  <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', i < 4 ? 'text-emerald-400' : 'text-slate-500')} />{t}
                </li>
              ))}
            </ul>
            <button onClick={() => pick('local')} className={cn('mt-7 w-full rounded-xl border py-3 text-sm font-semibold transition-all',
              choice === 'local' ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-200' : 'border-white/15 bg-white/[0.03] text-slate-200 hover:border-emerald-400/40 hover:bg-emerald-400/10')}>
              {choice === 'local' ? 'Selected — builder will use this' : 'Choose local brain'}
            </button>
            {!device && <Link to="/device" className="mt-3 block text-center text-xs text-emerald-300/80 underline-offset-2 hover:underline">First check what your device can run →</Link>}
          </div>
          </Tilt>
        </Reveal>
        <Reveal delay={0.1}>
          <Tilt max={3} className="h-full">
          <div className={cn('panel shine relative h-full overflow-hidden p-8 transition-all', choice === 'api' && 'border-sky-400/50 shadow-[0_0_50px_-16px_rgba(56,189,248,0.35)]')}>
            <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-sky-400/10 blur-3xl" />
            <div className="flex items-center justify-between">
              <motion.span layout className="grid h-14 w-14 place-items-center rounded-2xl border border-sky-400/30 bg-sky-400/10"><Cloud className="h-7 w-7 text-sky-300" /></motion.span>
              {choice === 'api' && (
                <motion.span layoutId="brain-pick-chip" transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  className="chip border border-sky-400/50 bg-sky-400/15 text-sky-300"><Check className="h-3 w-3" /> Your pick</motion.span>
              )}
            </div>
            <h3 className="mt-5 font-display text-2xl font-bold text-white">API Brain</h3>
            <p className="mt-1 text-sm text-sky-300/80">The model runs in a provider's cloud.</p>
            <ul className="mt-6 space-y-3">
              {[['Easiest start — one API key and you\'re live', Zap], ['Strongest models available anywhere', Sparkles], ['Needs internet for every call', WifiOff], ['Pay per token; free tiers to learn with', Wallet], ['Keys from official provider consoles', Key], ['Prompts leave your machine — read policies', ShieldCheck]].map(([t, Icon]: any, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                  <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', i < 2 ? 'text-sky-400' : 'text-slate-500')} />{t}
                </li>
              ))}
            </ul>
            <button onClick={() => pick('api')} className={cn('mt-7 w-full rounded-xl border py-3 text-sm font-semibold transition-all',
              choice === 'api' ? 'border-sky-400/60 bg-sky-400/15 text-sky-200' : 'border-white/15 bg-white/[0.03] text-slate-200 hover:border-sky-400/40 hover:bg-sky-400/10')}>
              {choice === 'api' ? 'Selected — builder will use this' : 'Choose API brain'}
            </button>
            <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-[11px] text-slate-500"><Info className="mt-0.5 h-3 w-3 shrink-0" /> Popular path: prototype on API free tier → move to local later.</p>
          </div>
          </Tilt>
        </Reveal>
      </div>

      {/* ── comparison table ── */}
      <Reveal className="mt-16">
        <div className="panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/[0.07] px-6 py-4">
            <Scale className="h-4.5 w-4.5 text-violet-300" />
            <h3 className="font-display text-lg font-bold text-white">Head to head</h3>
          </div>
          <Stagger className="divide-y divide-white/[0.05]" amount={0.2}>
            {COMPARISON.map((row) => (
              <StaggerItem key={row.label}>
              <div className="grid gap-3 px-6 py-4 sm:grid-cols-[160px_1fr_1fr]">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-white">{row.label}<Tip text={row.tip} /></div>
                <ul className="space-y-1.5">
                  {row.local.map(([t, good], i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-slate-400">
                      {good ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" /> : <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />}{t}
                    </li>
                  ))}
                </ul>
                <ul className="space-y-1.5">
                  {row.api.map(([t, good], i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-slate-400">
                      {good ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" /> : <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />}{t}
                    </li>
                  ))}
                </ul>
              </div>
              </StaggerItem>
            ))}
          </Stagger>
          <div className="divide-y divide-white/[0.05]">
            <div className="grid gap-3 bg-white/[0.02] px-6 py-3 sm:grid-cols-[160px_1fr_1fr]">
              <span />
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300"><HardDrive className="h-3.5 w-3.5" /> Local column</span>
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-300"><Cloud className="h-3.5 w-3.5" /> API column</span>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ── API providers ── */}
      <div className="mt-16">
        <h3 className="font-display text-xl font-bold text-white">Get an API key <span className="text-sm font-normal text-slate-500">— official consoles only, never third parties</span></h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {API_PROVIDERS.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.05}>
              <div className="panel panel-hover flex h-full flex-col p-6">
                <div className="flex items-center justify-between">
                  <span className="font-display text-base font-bold text-white">{p.name}</span>
                  {p.freeTier.toLowerCase().includes('free') && <span className="chip border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">free tier</span>}
                </div>
                <p className="mt-1 text-xs text-slate-500">{p.tagline}</p>
                <div className="mt-4 space-y-1.5">
                  {p.models.map((m) => (
                    <div key={m.name} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs">
                      <span className="font-mono text-slate-200">{m.name}</span>
                      <span className="text-slate-500">{m.note}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{p.pricingNote}</p>
                <div className="mt-auto flex items-center gap-3 pt-5">
                  <a href={p.getKeyUrl} target="_blank" rel="noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs font-semibold text-sky-300 transition hover:bg-sky-400/20">
                    <Key className="h-3.5 w-3.5" /> Get API key <ExternalLink className="h-3 w-3" />
                  </a>
                  <a href={p.docsUrl} target="_blank" rel="noreferrer" className="text-xs text-slate-500 hover:text-slate-300">Docs</a>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-4 flex gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-4 text-xs leading-relaxed text-amber-100/80">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <span><b className="text-amber-200">Money safety:</b> the day you create a key, also set a monthly spending limit in the provider's billing settings — and never paste keys into code you'll commit to Git. Your generated project reads keys from environment variables for exactly this reason.</span>
        </div>
      </div>

      {/* ── local runtimes ── */}
      <div className="mt-16">
        <h3 className="font-display text-xl font-bold text-white">Run models locally <span className="text-sm font-normal text-slate-500">— pick ONE runtime to start (we suggest Ollama)</span></h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {RUNTIMES.map((r, i) => (
            <Reveal key={r.id} delay={i * 0.04}>
              <div className="panel panel-hover h-full p-6">
                <div className="flex items-center justify-between">
                  <span className="font-display text-base font-bold text-white">{r.name}</span>
                  <span className={cn('chip border',
                    r.kind === 'beginner' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                    : r.kind === 'gui' ? 'border-violet-400/30 bg-violet-400/10 text-violet-300'
                    : r.kind === 'apple' ? 'border-slate-400/30 bg-slate-400/10 text-slate-300'
                    : 'border-amber-400/30 bg-amber-400/10 text-amber-300')}>
                    {r.kind === 'beginner' ? 'Start here' : r.kind === 'gui' ? 'GUI app' : r.kind === 'apple' ? 'Apple Silicon' : 'Advanced'}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{r.tagline}</p>
                <p className="mt-3 text-[11px] text-slate-600">{r.platforms}</p>
                <p className="mt-2 text-xs text-slate-500">{r.installHint}</p>
                <a href={r.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-violet-300 hover:text-violet-200">
                  Official site <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ── verdict ── */}
      <Reveal className="mt-16">
        <div className="grad-border p-8 text-center sm:p-12">
          <Trophy className="mx-auto h-8 w-8 text-amber-300" />
          <h3 className="mt-4 font-display text-2xl font-bold text-white">Our honest recommendation</h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
            <b className="text-slate-200">Learning?</b> Start with an API free tier (Gemini or Groq) — zero setup, instant feedback.
            <b className="text-slate-200"> Privacy-sensitive or offline work?</b> Go local with Ollama and the biggest model your device check approved.
            <b className="text-slate-200"> Serious about agents?</b> Learn both — the builder generates the connector for whichever you pick, and swapping later is a 5-line change.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <Magnetic>
              <Link to={choice ? '/builder' : '/device'} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110">
                {choice ? `Continue with ${choice === 'local' ? 'local' : 'API'} brain` : 'Check my device first'} <ArrowRight className="h-4 w-4" />
              </Link>
            </Magnetic>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
