import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight, Brain, CircuitBoard, GraduationCap, Hammer, Scale, Wrench,
  Database, BookOpen, Workflow, Sparkles, Terminal, Shield, Zap, Route,
  CheckCircle2, ChevronRight, MousePointerClick, Boxes,
} from 'lucide-react';
import { Reveal, SectionHead } from '../components/ui';
import {
  Counter, Magnetic, Marquee, Stagger, StaggerItem, Tilt, WordReveal,
} from '../components/motion';
import { LESSONS } from '../data/learning';
import { API_PROVIDERS, LOCAL_MODELS, RUNTIMES } from '../data/models';
import { RESOURCE_CATEGORIES } from '../data/resources';
import { useApp } from '../context/AppContext';
import AgentTrace from '../components/AgentTrace';
import NeuralSphere from '../components/NeuralSphere';

/* ── Animated agent-loop hero visual ── */
function HeroLoop() {
  const orbiters = [
    { icon: Wrench, label: 'Tools', color: '#fbbf24', angle: 0 },
    { icon: Database, label: 'Memory', color: '#f472b6', angle: 120 },
    { icon: BookOpen, label: 'Knowledge', color: '#34d399', angle: 240 },
  ];
  const trace = [
    { t: 'THINK', c: '#22d3ee' }, { t: 'ACT', c: '#fbbf24' }, { t: 'OBSERVE', c: '#34d399' },
  ];
  return (
    <div className="dark-canvas relative mx-auto aspect-square w-full max-w-[440px]">
      {/* aura */}
      <div className="absolute inset-8 rounded-full bg-violet-500/10 blur-3xl" />
      {/* orbit rings */}
      <div className="absolute inset-4 rounded-full border border-dashed border-violet-400/20 animate-spin-slow" />
      <div className="absolute inset-16 rounded-full border border-cyan-400/15" style={{ animation: 'spin 26s linear infinite reverse' }} />
      {/* center brain */}
      <div className="absolute inset-0 grid place-items-center">
        <motion.div
          animate={{ boxShadow: ['0 0 40px 0 rgba(139,92,246,.35)', '0 0 70px 10px rgba(139,92,246,.5)', '0 0 40px 0 rgba(139,92,246,.35)'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="relative grid h-28 w-28 place-items-center rounded-3xl border border-violet-400/40 bg-gradient-to-br from-[#171432] to-[#0c0c1a]">
          <Brain className="h-12 w-12 text-violet-300" />
          <span className="absolute -bottom-3 rounded-full border border-violet-400/30 bg-[#14122b] px-3 py-0.5 text-[10px] font-bold tracking-widest text-violet-300">LLM</span>
        </motion.div>
      </div>
      {/* orbiting nodes */}
      {orbiters.map((o, i) => (
        <motion.div key={o.label} className="absolute inset-0"
          animate={{ rotate: 360 }} transition={{ duration: 22 + i * 4, repeat: Infinity, ease: 'linear' }}>
          <div className="absolute left-1/2 top-1/2"
            style={{ transform: `rotate(${o.angle}deg) translate(0, -100%) translateY(-46%)` }}>
            <motion.div animate={{ rotate: -360 }} transition={{ duration: 22 + i * 4, repeat: Infinity, ease: 'linear' }}
              className="flex -translate-x-1/2 flex-col items-center gap-1.5">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border bg-[#101022] shadow-lg"
                style={{ borderColor: o.color + '55', boxShadow: `0 8px 30px -8px ${o.color}55` }}>
                <o.icon className="h-5 w-5" style={{ color: o.color }} />
              </span>
              <span className="rounded-xl border border-white/10 bg-[#0d0d1c] px-2 py-0.5 text-[10px] font-semibold text-slate-300">{o.label}</span>
            </motion.div>
          </div>
        </motion.div>
      ))}
      {/* loop trace chips */}
      <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
        {trace.map((x, i) => (
          <motion.span key={x.t}
            animate={{ opacity: [0.35, 1, 0.35], scale: [0.96, 1.04, 0.96] }}
            transition={{ duration: 2.1, repeat: Infinity, delay: i * 0.7 }}
            className="rounded-xl border px-2.5 py-1 text-[10px] font-bold tracking-wider"
            style={{ color: x.c, borderColor: x.c + '44', background: '#0c0c1a' }}>
            {x.t}
          </motion.span>
        ))}
      </div>
      {/* floating user msg */}
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity }}
        className="absolute -left-2 top-6 max-w-[170px] rounded-xl rounded-bl-sm border border-white/10 bg-[#12122a]/90 p-2.5 text-[10px] leading-snug text-slate-300 shadow-xl backdrop-blur">
        “Summarise today’s AI news and save it to my notes”
      </motion.div>
      <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 6, repeat: Infinity, delay: 1 }}
        className="absolute -right-2 bottom-16 max-w-[150px] rounded-xl border border-emerald-400/25 bg-[#0d1a14]/90 p-2.5 text-[10px] leading-snug text-emerald-200/90 shadow-xl backdrop-blur">
        Done — saved 5 headlines to notes.txt
      </motion.div>
    </div>
  );
}

const PILLARS = [
  { icon: GraduationCap, color: '#8b5cf6', title: 'Learn the concepts', desc: 'A 10-lesson path that takes you from “what is an agent?” to planning, RAG and tools — with interactive diagrams, not walls of jargon.', to: '/learn', cta: 'Start lesson 1' },
  { icon: CircuitBoard, color: '#22d3ee', title: 'Check your device', desc: 'Find out exactly which AI models your computer can run locally. Auto-detect your hardware, get a tier, see honest fits.', to: '/device', cta: 'Run device check' },
  { icon: Scale, color: '#fbbf24', title: 'Choose your brain', desc: 'Local brain for privacy and offline use, or API brain for instant power. Compare both honestly and switch anytime.', to: '/brain', cta: 'Compare options' },
  { icon: Hammer, color: '#34d399', title: 'Build for real', desc: 'A guided wizard that explains every choice, then generates a complete, commented starter project in Python or JavaScript.', to: '/builder', cta: 'Open the builder' },
];

export default function Home() {
  const { done, device, agents } = useApp();
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 500], [0, 80]);
  const opHero = useTransform(scrollY, [0, 400], [1, 0.25]);

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
        {/* 3D particle sphere — pointer-reactive backdrop */}
        <NeuralSphere className="pointer-events-none absolute inset-0 h-full w-full opacity-60 [mask-image:radial-gradient(ellipse_75%_70%_at_50%_42%,black_35%,transparent_75%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
          <div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold text-violet-300">
                <Sparkles className="h-3.5 w-3.5" /> The beginner-friendly agent platform
              </span>
            </motion.div>
            <h1 className="mt-6 font-display font-bold leading-[1.04] tracking-tight text-white" style={{ fontSize: 'clamp(2.5rem, 5.8vw, 4.5rem)' }}>
              <WordReveal text="Build your first" delay={0.15} />{' '}
              <span className="grad-text"><WordReveal text="AI agent" delay={0.42} /></span>{' '}
              <WordReveal text="— and actually understand it." delay={0.62} stagger={0.07} />
            </h1>
            <motion.p initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.8, delay: 0.9 }}
              className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
              Learn how agents think, check which models your computer can run, choose between local and API brains, and walk away with a working agent — no prior knowledge needed.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 90, damping: 16, delay: 1.05 }}
              className="mt-9 flex flex-wrap items-center gap-4">
              <Magnetic>
                <Link to="/learn" className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:brightness-110">
                  <GraduationCap className="h-4.5 w-4.5" /> Start learning free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Magnetic>
              <Magnetic>
                <Link to="/device" className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-7 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/40 hover:bg-white/[0.06]">
                  <CircuitBoard className="h-4.5 w-4.5 text-cyan-300" /> Can my PC run AI?
                </Link>
              </Magnetic>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}
              className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-500">
              {['10 guided lessons', 'Hardware advisor', 'Real code output', '100% free'].map((s) => (
                <span key={s} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" />{s}</span>
              ))}
            </motion.div>
          </div>
          <motion.div style={{ y: yHero, opacity: opHero }} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 60, damping: 16, delay: 0.35 }}>
            <HeroLoop />
          </motion.div>
        </div>

        {/* live agent trace */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 60, damping: 16, delay: 1.2 }}
          className="relative mx-auto mt-16 max-w-3xl">
          <div className="absolute -inset-8 rounded-3xl bg-gradient-to-r from-violet-500/10 via-transparent to-cyan-400/10 blur-2xl" aria-hidden />
          <AgentTrace />
          <p className="mt-4 text-center text-xs text-slate-600">
            This is the loop you'll build in lesson 10 — <span className="text-slate-400">your generated agent prints exactly this trace.</span>
          </p>
        </motion.div>
      </section>

      {/* ── Ticker ── */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 0.8 }}
        className="space-y-3 border-y border-white/[0.05] bg-white/[0.015] py-6">
        <Marquee speed={38}>
          {LOCAL_MODELS.map((m) => (
            <span key={m.id} className="dark-canvas flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#0c0c1a] px-4 py-1.5 text-xs text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="font-semibold text-slate-200">{m.name}</span>
              <span className="font-mono text-[10px] text-slate-600">{m.params} · runs locally</span>
            </span>
          ))}
        </Marquee>
        <Marquee speed={46} reverse>
          {[...RUNTIMES.map((r) => r.name), ...API_PROVIDERS.map((p) => p.name)].map((n) => (
            <span key={n} className="flex items-center gap-2 rounded-full border border-violet-400/[0.12] bg-violet-500/[0.04] px-4 py-1.5 text-xs text-slate-400">
              <Boxes className="h-3 w-3 text-violet-400/70" />{n}
            </span>
          ))}
        </Marquee>
      </motion.section>

      {/* ── Journey strip ── */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="panel grad-border relative overflow-hidden p-8 sm:p-10">
              <div className="flex flex-wrap items-start gap-6">
                <div className="max-w-xl">
                  <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">One journey, zero to agent.</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">AgentForge chains five steps into a single guided flow. Your progress is saved as you go.</p>
                </div>
              </div>
              <Stagger className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-5" amount={0.3}>
                {[
                  { n: '01', t: 'Learn', d: 'How agents think', to: '/learn', icon: GraduationCap },
                  { n: '02', t: 'Check', d: 'What your PC can run', to: '/device', icon: CircuitBoard },
                  { n: '03', t: 'Choose', d: 'Local or API brain', to: '/brain', icon: Scale },
                  { n: '04', t: 'Build', d: 'Configure your agent', to: '/builder', icon: Hammer },
                  { n: '05', t: 'Run', d: 'Download real code', to: '/builder', icon: Terminal },
                ].map((s, i) => (
                  <StaggerItem key={s.n}>
                    <Link to={s.to}
                      className="shine group relative block h-full rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition hover:border-violet-400/30 hover:bg-white/[0.05]">
                      <s.icon className="h-5 w-5 text-slate-500 transition group-hover:text-violet-300" />
                      <div className="mt-3 font-mono text-[10px] tracking-widest text-slate-600">{s.n}</div>
                      <div className="font-display text-base font-bold text-white">{s.t}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{s.d}</div>
                      {i < 4 && (
                        <motion.span animate={{ x: [0, 4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3 }}
                          className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-slate-700 lg:block">
                          <ArrowRight className="h-5 w-5" />
                        </motion.span>
                      )}
                    </Link>
                  </StaggerItem>
                ))}
              </Stagger>
              {(done.length > 0 || device || agents.length > 0) && (
                <div className="mt-6 flex justify-end">
                  <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-5 py-3 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20">
                    Continue your journey <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Pillars ── */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <SectionHead center index="01" kicker="The platform" title={<>Four tools, one <span className="grad-text">complete loop</span></>}
            sub="Most tutorials make you copy code you don't understand. AgentForge teaches the concept, checks your machine, then helps you build — in that order." />
          <Stagger className="grid gap-5 sm:grid-cols-2">
            {PILLARS.map((p) => (
              <StaggerItem key={p.title}>
                <Tilt max={5}>
                  <Link to={p.to} className="panel panel-hover shine group relative block overflow-hidden p-8">
                    <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.15]" style={{ background: p.color }} />
                    <span className="grid h-12 w-12 place-items-center rounded-2xl border" style={{ background: p.color + '15', borderColor: p.color + '40', transform: 'translateZ(30px)' }}>
                      <p.icon className="h-6 w-6" style={{ color: p.color }} />
                    </span>
                    <h3 className="mt-5 font-display text-xl font-bold text-white">{p.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{p.desc}</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold transition group-hover:gap-2.5" style={{ color: p.color }}>
                      {p.cta} <ArrowRight className="h-4 w-4 transition-all" />
                    </span>
                  </Link>
                </Tilt>
              </StaggerItem>
            ))}
          </Stagger>

          {/* stats */}
          <Stagger className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4" amount={0.4}>
            {[
              { v: LESSONS.length, s: '', label: 'guided lessons', color: '#8b5cf6' },
              { v: LOCAL_MODELS.length, s: '', label: 'local models tracked', color: '#34d399' },
              { v: RUNTIMES.length + API_PROVIDERS.length, s: '', label: 'runtimes & providers', color: '#22d3ee' },
              { v: RESOURCE_CATEGORIES.reduce((n, c) => n + c.items.length, 0), s: '+', label: 'curated resources', color: '#fbbf24' },
            ].map((st) => (
              <StaggerItem key={st.label}>
                <div className="panel p-6 text-center">
                  <div className="font-display text-4xl font-bold" style={{ color: st.color }}>
                    <Counter value={st.v} suffix={st.s} />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{st.label}</div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Learning preview ── */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <SectionHead index="02" kicker="Curriculum" title="The 10-step learning path"
            sub="Each lesson is 5–8 minutes, ends with a 2-question check, and builds directly toward the agent you'll ship in lesson 10." />
          <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {LESSONS.map((l, i) => {
              const doneIt = done.includes(l.id);
              return (
                <StaggerItem key={l.id}>
                  <Link to={`/learn/${l.id}`} className="panel panel-hover group flex h-full flex-col p-5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold tracking-widest" style={{ color: l.accent }}>{String(i + 1).padStart(2, '0')}</span>
                      {doneIt
                        ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}><CheckCircle2 className="h-4 w-4 text-emerald-400" /></motion.span>
                        : <span className="text-[10px] text-slate-600">{l.minutes} min</span>}
                    </div>
                    <div className="mt-3 line-clamp-2 font-display text-sm font-bold leading-snug text-white group-hover:text-violet-200">{l.title}</div>
                    <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{l.subtitle}</div>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
          <Reveal className="mt-8 text-center">
            <Link to="/learn" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-300 hover:text-violet-200">
              Open the full learning path <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Why different ── */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <Stagger className="grid gap-5 lg:grid-cols-3">
            {[
              { icon: Shield, color: '#34d399', t: 'Privacy-first mindset', d: 'We teach you to run models on your own machine when it matters — your files never need to leave your desk.' },
              { icon: Zap, color: '#fbbf24', t: 'Concepts before code', d: 'Every generated file comes with a plain-English explanation of what it does and why it exists. No copy-paste learning.' },
              { icon: Route, color: '#22d3ee', t: 'Honest hardware advice', d: 'No “just buy a 4090”. The advisor matches YOUR actual RAM, VRAM and disk to models that will genuinely run.' },
            ].map((x) => (
              <StaggerItem key={x.t}>
                <div className="panel h-full p-7">
                  <motion.span whileHover={{ rotate: -12, scale: 1.15 }} transition={{ type: 'spring', stiffness: 300, damping: 12 }} className="inline-block">
                    <x.icon className="h-6 w-6" style={{ color: x.color }} />
                  </motion.span>
                  <h3 className="mt-4 font-display text-lg font-bold text-white">{x.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{x.d}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-4 py-20 sm:px-6">
        <Reveal>
          <div className="grad-border relative mx-auto max-w-4xl overflow-hidden p-10 text-center sm:p-16">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.14),transparent_60%)]" />
            <MousePointerClick className="mx-auto h-8 w-8 text-violet-300" />
            <h2 className="relative mt-5 font-display text-3xl font-bold text-white sm:text-4xl">
              Your first agent is <span className="grad-text">10 minutes away</span>
            </h2>
            <p className="relative mx-auto mt-4 max-w-lg text-sm leading-relaxed text-slate-400 sm:text-base">
              Start with lesson one — or jump straight into the builder and learn as you configure. Either way, you’ll understand every line you ship.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-4">
              <Magnetic>
                <Link to="/learn" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:brightness-110">
                  <GraduationCap className="h-4.5 w-4.5" /> Begin the path
                </Link>
              </Magnetic>
              <Magnetic>
                <Link to="/builder" className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-7 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]">
                  <Workflow className="h-4.5 w-4.5 text-cyan-300" /> Skip to builder
                </Link>
              </Magnetic>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}