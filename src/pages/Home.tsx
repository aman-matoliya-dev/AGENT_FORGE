import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, Brain, BookOpen, Boxes, CheckCircle2, ChevronRight,
  CircuitBoard, GraduationCap, Hammer, Route, Scale, Shield, Terminal,
  Workflow, Wrench, Zap,
} from 'lucide-react';
import { LESSONS } from '../data/learning';
import { API_PROVIDERS, LOCAL_MODELS, RUNTIMES } from '../data/models';
import { RESOURCE_CATEGORIES } from '../data/resources';
import { useApp } from '../context/AppContext';
import AgentTrace from '../components/AgentTrace';
import NeuralSphere from '../components/NeuralSphere';
import { Marquee } from '../components/motion';

const PILLARS = [
  {
    icon: GraduationCap,
    title: 'Learn the concepts',
    desc: 'A 10-lesson curriculum covers agent fundamentals, tools, memory, planning, and retrieval.',
    to: '/learn',
    cta: 'Start lesson one',
  },
  {
    icon: CircuitBoard,
    title: 'Check your device',
    desc: 'Compare reported hardware signals with local model requirements. Results are estimates, not benchmarks.',
    to: '/device',
    cta: 'Check device fit',
  },
  {
    icon: Scale,
    title: 'Choose a model source',
    desc: 'Compare local runtimes and hosted API providers, then select an approach in the builder.',
    to: '/brain',
    cta: 'Compare options',
  },
  {
    icon: Hammer,
    title: 'Build a starter agent',
    desc: 'Configure an agent in a guided wizard and generate a commented starter project in Python or JavaScript.',
    to: '/builder',
    cta: 'Open the builder',
  },
];

const JOURNEY = [
  { title: 'Learn', desc: 'Understand agent fundamentals', to: '/learn', icon: GraduationCap },
  { title: 'Check', desc: 'Estimate local model fit', to: '/device', icon: CircuitBoard },
  { title: 'Choose', desc: 'Compare local and hosted models', to: '/brain', icon: Scale },
  { title: 'Build', desc: 'Configure your agent', to: '/builder', icon: Hammer },
  { title: 'Run', desc: 'Work with the generated starter code', to: '/builder', icon: Terminal },
];

const REASONS = [
  {
    icon: Shield,
    title: 'Understand the trade-offs',
    desc: 'Learn when local execution or a hosted API makes sense, including the privacy and hardware considerations.',
  },
  {
    icon: Zap,
    title: 'Read what you generate',
    desc: 'The builder creates a starter project with comments, so you can inspect and adapt its files.',
  },
  {
    icon: Route,
    title: 'Treat hardware results as guidance',
    desc: 'The device checker estimates model fit from available hardware signals. It does not benchmark models.',
  },
];

const STAGGER_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } },
};

const STAGGER_ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 90, damping: 20 },
  },
};

function HomeReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={{ duration: reducedMotion ? 0 : 0.55, delay: reducedMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function HomeStagger({
  children,
  className,
  amount = 0.15,
}: {
  children: ReactNode;
  className?: string;
  amount?: number;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={STAGGER_VARIANTS}
      initial={reducedMotion ? 'show' : 'hidden'}
      whileInView="show"
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  );
}

function HomeStaggerItem({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={reducedMotion
        ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0, transition: { duration: 0 } } }
        : STAGGER_ITEM_VARIANTS}
    >
      {children}
    </motion.div>
  );
}

function formatHomepageCopy(text: string) {
  return text.replace(/\s*[—–]\s*/g, ', ');
}

function AgentMap() {
  return (
    <div
      role="img"
      aria-label="Conceptual map connecting a language model with tools, memory, and knowledge"
      className="relative mx-auto aspect-square w-full max-w-[430px]"
    >
      <div aria-hidden className="absolute inset-[8%] rounded-full border border-white/10" />
      <div aria-hidden className="absolute inset-[20%] rounded-full border border-dashed border-violet-500/30" />
      <div aria-hidden className="absolute left-1/2 top-[8%] h-[84%] w-px -translate-x-1/2 bg-white/[0.08]" />
      <div aria-hidden className="absolute left-[8%] top-1/2 h-px w-[84%] -translate-y-1/2 bg-white/[0.08]" />

      <div className="absolute inset-0 grid place-items-center">
        <div className="grid h-28 w-28 place-items-center border border-violet-500/50 bg-[var(--surface-panel)] text-violet-500 sm:h-32 sm:w-32">
          <Brain className="h-11 w-11" strokeWidth={1.4} />
          <span className="absolute mt-[5.25rem] bg-[var(--surface-void)] px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 sm:mt-[5.75rem]">
            Model
          </span>
        </div>
      </div>

      {[
        { label: 'Tools', icon: Wrench, position: 'left-1/2 top-[3%] -translate-x-1/2' },
        { label: 'Memory', icon: Boxes, position: 'right-[1%] top-1/2 -translate-y-1/2' },
        { label: 'Knowledge', icon: BookOpen, position: 'bottom-[3%] left-1/2 -translate-x-1/2' },
      ].map(({ label, icon: Icon, position }, index) => (
        <div key={label} className={`absolute ${position}`}>
          <div className="flex min-w-24 flex-col items-center gap-2 border border-white/10 bg-[var(--surface-void)] px-3 py-3 text-slate-300">
            <Icon className={`h-5 w-5 ${index === 1 ? 'text-cyan-400' : 'text-violet-500'}`} strokeWidth={1.5} />
            <span className="text-xs font-medium">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { done, device, agents } = useApp();
  const reducedMotion = useReducedMotion();
  const platformItems = [
    ...LOCAL_MODELS.map((model) => ({ key: `model-${model.id}`, name: model.name, detail: model.params })),
    ...RUNTIMES.map((runtime) => ({ key: `runtime-${runtime.name}`, name: runtime.name, detail: 'Runtime' })),
    ...API_PROVIDERS.map((provider) => ({ key: `provider-${provider.name}`, name: provider.name, detail: 'API provider' })),
  ];
  const platformTicker = (
    <div className="flex w-max items-center gap-3 pr-3">
      {platformItems.map((item) => (
        <span
          key={item.key}
          className="inline-flex items-baseline gap-2 border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-slate-300"
        >
          <span className="font-medium text-white">{item.name}</span>
          <span className="font-mono text-[10px] text-slate-500">{item.detail}</span>
        </span>
      ))}
    </div>
  );

  return (
    <div>
      <section className="relative overflow-hidden px-4 pb-12 pt-8 sm:px-6 sm:pb-16 lg:min-h-[calc(100dvh-4.5rem)] lg:pt-10">
        {!reducedMotion && (
          <NeuralSphere className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08] [mask-image:radial-gradient(ellipse_65%_70%_at_76%_42%,black_15%,transparent_74%)]" />
        )}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_78%_42%,rgba(255,120,61,0.08),transparent_55%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div className="relative z-[1]">
            <motion.p
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="mb-5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-violet-500"
            >
              A practical AI-agent workspace
            </motion.p>
            <motion.h1
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.55, delay: reducedMotion ? 0 : 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-[clamp(1.875rem,3.6vw,3.25rem)] font-bold leading-[1.02] tracking-[-0.05em] text-white [text-wrap:balance]"
            >
              Build agents.
              <span className="mt-1 block text-violet-500">Understand every step.</span>
            </motion.h1>
            <motion.p
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : 0.14, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 max-w-[54ch] text-base leading-relaxed text-slate-300 sm:text-lg"
            >
              Learn agent fundamentals, estimate local model fit, compare hosted APIs, and generate a commented starter project.
            </motion.p>
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link
                to="/learn"
                className="af-primary-btn btn-sheen group inline-flex min-h-12 items-center justify-center gap-3 whitespace-nowrap px-5 py-3 text-sm font-semibold transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 active:translate-y-px sm:px-6"
              >
                Start learning
                <span className="grid h-7 w-7 place-items-center rounded-full bg-black/10">
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5" />
                </span>
              </Link>
              <Link
                to="/device"
                className="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap border border-white/15 px-5 py-3 text-sm font-medium text-white transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-cyan-500/60 hover:text-cyan-400 sm:px-6"
              >
                Check device fit
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.7, delay: reducedMotion ? 0 : 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <AgentMap />
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:py-20" aria-labelledby="trace-title">
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14">
          <HomeReveal>
            <h2 id="trace-title" className="max-w-[12ch] font-display text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              See a tool loop, step by step.
            </h2>
            <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-slate-400 sm:text-base">
              This illustrative transcript shows one possible search-and-calculation flow. It is a sample, not a live model run.
            </p>
          </HomeReveal>
          <HomeReveal delay={0.08}>
            <AgentTrace />
          </HomeReveal>
        </div>
      </section>

      <section className="border-y border-white/[0.08] bg-white/[0.015] px-4 py-8 sm:px-6" aria-label="Models and integrations">
        <div className="mx-auto max-w-7xl">
          {reducedMotion ? (
            <div className="overflow-x-auto pb-2">
              <div className="flex w-max items-center">{platformTicker}</div>
            </div>
          ) : (
            <Marquee speed={42}>{platformTicker}</Marquee>
          )}
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:py-28" aria-labelledby="journey-title">
        <div className="mx-auto max-w-7xl">
          <HomeReveal>
            <div className="border-y border-white/10 py-8 sm:py-10">
              <div className="max-w-2xl">
                <h2 id="journey-title" className="font-display text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                  From first principles to a starter project.
                </h2>
                <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-slate-400 sm:text-base">
                  Follow the guided path, or use any section on its own. Your lesson and device-check progress is saved as you go.
                </p>
              </div>
              <HomeStagger className="mt-8 grid gap-x-6 gap-y-0 sm:grid-cols-2 lg:grid-cols-5" amount={0.2}>
                {JOURNEY.map((step) => (
                  <HomeStaggerItem key={step.title}>
                    <Link
                      to={step.to}
                      className="group flex min-h-28 items-start gap-4 border-t border-white/10 py-5 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-violet-500"
                    >
                      <step.icon className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400 transition-colors duration-300 group-hover:text-violet-500" strokeWidth={1.6} />
                      <span>
                        <span className="block font-display text-base font-semibold text-white">{step.title}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-slate-500">{step.desc}</span>
                      </span>
                    </Link>
                  </HomeStaggerItem>
                ))}
              </HomeStagger>
              {(done.length > 0 || device || agents.length > 0) && (
                <div className="mt-4 flex justify-end">
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 border border-violet-500/40 px-4 py-2.5 text-sm font-semibold text-violet-500 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-violet-500/10"
                  >
                    Continue your journey <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </HomeReveal>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:py-28" aria-labelledby="platform-title">
        <div className="mx-auto max-w-7xl">
          <HomeReveal className="mb-10 max-w-3xl sm:mb-12">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-violet-500">The platform</p>
            <h2 id="platform-title" className="font-display text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Four practical parts. One place to learn and build.
            </h2>
            <p className="mt-4 max-w-[62ch] text-sm leading-relaxed text-slate-400 sm:text-base">
              Study the concepts, compare model options, then work through a guided agent configuration.
            </p>
          </HomeReveal>

          <HomeStagger className="grid gap-x-10 sm:grid-cols-2" amount={0.2}>
            {PILLARS.map((pillar, index) => (
              <HomeStaggerItem key={pillar.title}>
                <Link
                  to={pillar.to}
                  className="group flex h-full min-h-56 flex-col border-t border-white/10 py-7 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-violet-500 sm:py-8"
                >
                  <div className="flex items-center justify-between">
                    <pillar.icon className={`h-6 w-6 ${index % 2 === 0 ? 'text-violet-500' : 'text-cyan-400'}`} strokeWidth={1.5} />
                    <ArrowRight className="h-4 w-4 text-slate-600 transition-colors duration-300 group-hover:text-violet-500" />
                  </div>
                  <h3 className="mt-7 font-display text-xl font-semibold tracking-tight text-white">{pillar.title}</h3>
                  <p className="mt-2 max-w-[54ch] text-sm leading-relaxed text-slate-400">{pillar.desc}</p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-violet-500">
                    {pillar.cta}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1" />
                  </span>
                </Link>
              </HomeStaggerItem>
            ))}
          </HomeStagger>

          <HomeStagger className="mt-10 grid grid-cols-2 border-y border-white/10 sm:grid-cols-4" amount={0.3}>
            {[
              { value: LESSONS.length, label: 'lessons' },
              { value: LOCAL_MODELS.length, label: 'local model references' },
              { value: RUNTIMES.length + API_PROVIDERS.length, label: 'runtimes and API providers' },
              { value: RESOURCE_CATEGORIES.reduce((total, category) => total + category.items.length, 0), label: 'curated resources' },
            ].map((stat, index) => (
              <HomeStaggerItem key={stat.label}>
                <div className={`border-r border-white/10 px-4 py-5 sm:px-6 sm:py-6 ${index % 2 === 1 ? 'border-r-0 sm:border-r' : ''} ${index === 3 ? 'sm:border-r-0' : ''}`}>
                  <div className="font-display text-3xl font-semibold tabular-nums text-white sm:text-4xl">{stat.value}</div>
                  <div className="mt-1 max-w-40 text-xs leading-relaxed text-slate-500">{stat.label}</div>
                </div>
              </HomeStaggerItem>
            ))}
          </HomeStagger>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:py-28" aria-labelledby="lessons-title">
        <div className="mx-auto max-w-7xl">
          <HomeReveal className="mb-10 max-w-3xl sm:mb-12">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-violet-500">Learning path</p>
            <h2 id="lessons-title" className="font-display text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Learn what goes into an agent.
            </h2>
            <p className="mt-4 max-w-[62ch] text-sm leading-relaxed text-slate-400 sm:text-base">
              Ten short lessons cover architecture, models, tools, memory, retrieval, and planning. Each lesson has a knowledge check.
            </p>
          </HomeReveal>
          <HomeStagger className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-5" amount={0.15}>
            {LESSONS.map((lesson, index) => {
              const lessonDone = done.includes(lesson.id);

              return (
                <HomeStaggerItem key={lesson.id}>
                  <Link
                    to={`/learn/${lesson.id}`}
                    className="group flex h-full min-h-36 flex-col border-t border-white/10 py-4 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-violet-500"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs tabular-nums text-cyan-400">{String(index + 1).padStart(2, '0')}</span>
                      {lessonDone
                        ? <CheckCircle2 aria-label="Completed" className="h-4 w-4 text-cyan-400" />
                        : <span className="text-[10px] text-slate-600">{lesson.minutes} min</span>}
                    </div>
                    <span className="mt-3 font-display text-sm font-semibold leading-snug text-white transition-colors duration-300 group-hover:text-violet-500">
                      {formatHomepageCopy(lesson.title)}
                    </span>
                    <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{formatHomepageCopy(lesson.subtitle)}</span>
                  </Link>
                </HomeStaggerItem>
              );
            })}
          </HomeStagger>
          <HomeReveal className="mt-8">
            <Link to="/learn" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-500 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-white">
              Open the full learning path <ArrowRight className="h-4 w-4" />
            </Link>
          </HomeReveal>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:py-28" aria-label="How AgentForge approaches agent building">
        <div className="mx-auto grid max-w-7xl gap-x-14 lg:grid-cols-[0.8fr_1.2fr]">
          <HomeReveal className="mb-8 lg:mb-0">
            <h2 className="max-w-[10ch] font-display text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              Built around clear choices.
            </h2>
          </HomeReveal>
          <HomeStagger className="grid gap-x-8 sm:grid-cols-3" amount={0.2}>
            {REASONS.map((reason, index) => (
              <HomeStaggerItem key={reason.title}>
                <article className="h-full border-t border-white/10 py-5 sm:py-6">
                  <reason.icon className={`h-5 w-5 ${index === 1 ? 'text-cyan-400' : 'text-violet-500'}`} strokeWidth={1.5} />
                  <h3 className="mt-5 font-display text-base font-semibold text-white">{reason.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{reason.desc}</p>
                </article>
              </HomeStaggerItem>
            ))}
          </HomeStagger>
        </div>
      </section>

      <section className="px-4 pb-24 pt-12 sm:px-6 lg:pb-32" aria-labelledby="closing-title">
        <HomeReveal>
          <div className="relative mx-auto max-w-7xl overflow-hidden border-y border-violet-500/35 bg-[var(--surface-panel)] px-6 py-12 sm:px-10 sm:py-16">
            <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_90%_50%,rgba(255,120,61,0.09),transparent_66%)]" />
            <div className="relative max-w-3xl">
              <h2 id="closing-title" className="font-display text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                Start with the idea. Leave with a project to inspect.
              </h2>
              <p className="mt-4 max-w-[62ch] text-sm leading-relaxed text-slate-400 sm:text-base">
                Follow the lessons, or open the builder to configure a starter project and learn as you go.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/learn"
                  className="af-primary-btn btn-sheen group inline-flex min-h-12 items-center justify-center gap-3 whitespace-nowrap px-5 py-3 text-sm font-semibold transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 active:translate-y-px"
                >
                  Begin the path
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-black/10">
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5" />
                  </span>
                </Link>
                <Link
                  to="/builder"
                  className="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap border border-white/15 px-5 py-3 text-sm font-medium text-white transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-cyan-500/60 hover:text-cyan-400"
                >
                  <Workflow className="h-4 w-4 text-cyan-400" strokeWidth={1.5} />
                  Skip to builder
                </Link>
              </div>
            </div>
          </div>
        </HomeReveal>
      </section>
    </div>
  );
}
