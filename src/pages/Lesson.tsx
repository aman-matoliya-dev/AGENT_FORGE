import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Magnetic, staggerContainer, staggerItem, WordReveal } from '../components/motion';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, Lightbulb, Quote,
  Sparkles, Target, TriangleAlert, XCircle,
} from 'lucide-react';
import { Block, LESSONS, lessonById } from '../data/learning';
import { useApp } from '../context/AppContext';
import { Code } from '../components/ui';
import { LessonDiagram } from '../components/lessonDiagrams';
import ArchitectureDiagram from '../components/ArchitectureDiagram';
import { cn } from '../utils/cn';

function BlockView({ b, accent }: { b: Block; accent: string }) {
  switch (b.type) {
    case 'text':
      return (
        <section>
          <h2 className="font-display text-xl font-bold text-white sm:text-2xl">{b.heading}</h2>
          <p className="mt-3 text-[15px] leading-[1.85] text-slate-400">{b.body}</p>
        </section>
      );
    case 'analogy':
      return (
        <aside className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-6">
          <Quote className="absolute -right-3 -top-3 h-16 w-16 text-cyan-400/10" />
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-300"><Lightbulb className="h-4 w-4" /> Analogy · {b.title}</div>
          <p className="mt-3 text-sm leading-[1.8] text-slate-300">{b.body}</p>
        </aside>
      );
    case 'points':
      return (
        <section>
          <h2 className="mb-4 font-display text-xl font-bold text-white">{b.heading}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {b.items.map((it, i) => (
              <motion.div key={it.title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
                <div className="flex items-center gap-2 font-semibold text-white" style={{ color: undefined }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                  {it.title}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{it.body}</p>
              </motion.div>
            ))}
          </div>
        </section>
      );
    case 'diagram':
      return (
        <figure>
          {b.key === 'architecture' ? (
            <div className="diagram-shell rounded-2xl border border-white/10 bg-[#0b0b18] p-5 sm:p-7">
              <ArchitectureDiagram />
            </div>
          ) : <LessonDiagram k={b.key} />}
          <figcaption className="mt-3 text-center text-xs text-slate-500">{b.caption}</figcaption>
        </figure>
      );
    case 'code':
      return (
        <section>
          <Code title={b.title} code={b.code} />
          <div className="mt-3 flex gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
            <p className="text-sm leading-relaxed text-slate-400">{b.explain}</p>
          </div>
        </section>
      );
    case 'tip':
      return (
        <div className="flex gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4">
          <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-400" />
          <p className="text-sm leading-relaxed text-emerald-100/90"><span className="font-semibold text-emerald-300">Pro tip — </span>{b.body}</p>
        </div>
      );
    case 'warn':
      return (
        <div className="flex gap-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4">
          <TriangleAlert className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-300" />
          <p className="text-sm leading-relaxed text-amber-100/90">{b.body}</p>
        </div>
      );
  }
}

function Quiz({ lesson, onPass }: { lesson: NonNullable<ReturnType<typeof lessonById>>; onPass: () => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(lesson.quiz.map(() => null));
  const [checked, setChecked] = useState(false);
  const correct = lesson.quiz.filter((q, i) => answers[i] === q.answer).length;
  const allAnswered = answers.every((a) => a !== null);
  const passed = checked && correct === lesson.quiz.length;

  useEffect(() => { if (passed) onPass(); }, [passed]);

  return (
    <section className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.04] p-6 sm:p-8">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-violet-300">
        <Target className="h-4 w-4" /> Understanding check
      </div>
      <p className="mt-2 text-sm text-slate-400">Answer both to complete the lesson. Wrong answers explain themselves — no penalty.</p>
      <div className="mt-6 space-y-8">
        {lesson.quiz.map((q, qi) => {
          const chosen = answers[qi];
          const right = checked && chosen === q.answer;
          const wrong = checked && chosen !== null && chosen !== q.answer;
          return (
            <div key={qi}>
              <div className="flex items-start gap-2 text-[15px] font-semibold text-white">
                <span className="font-mono text-xs text-violet-300">Q{qi + 1}</span>{q.q}
              </div>
              <div className="mt-3 grid gap-2">
                {q.options.map((opt, oi) => {
                  const isChosen = chosen === oi;
                  const isRight = oi === q.answer;
                  return (
                    <button key={oi} onClick={() => { const next = [...answers]; next[qi] = oi; setAnswers(next); }}
                      className={cn('flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all',
                        checked && isRight ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-100'
                        : checked && isChosen && !isRight ? 'border-rose-400/50 bg-rose-400/10 text-rose-100'
                        : isChosen ? 'border-violet-400/50 bg-violet-500/15 text-white'
                        : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-slate-200')}>
                      {opt}
                      {checked && isRight && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
                      {checked && isChosen && !isRight && <XCircle className="h-4 w-4 shrink-0 text-rose-400" />}
                    </button>
                  );
                })}
              </div>
              {(right || wrong) && (
                <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className={cn('mt-2 rounded-lg px-3 py-2 text-xs leading-relaxed', right ? 'bg-emerald-400/10 text-emerald-200/90' : 'bg-rose-400/10 text-rose-200/90')}>
                  {q.why}
                </motion.p>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        {!passed ? (
          <button onClick={() => setChecked(true)} disabled={!allAnswered}
            className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition enabled:hover:brightness-110 disabled:opacity-40">
            Check answers
          </button>
        ) : (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-300">
            <Check className="h-4 w-4" /> Lesson complete — nice work!
          </motion.div>
        )}
        {checked && !passed && <span className="text-sm text-slate-500">{correct}/{lesson.quiz.length} correct — adjust and re-check.</span>}
        {passed && <ConfettiOnce />}
      </div>
    </section>
  );
}

function ConfettiOnce() {
  useEffect(() => { /* mount-only celebratory dots */ }, []);
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.i key={i} className="absolute h-1.5 w-1.5 rounded-full"
          style={{ left: `${8 + i * 6.5}%`, background: i % 3 === 0 ? '#8b5cf6' : i % 3 === 1 ? '#22d3ee' : '#34d399' }}
          initial={{ y: 10, opacity: 0 }} animate={{ y: [-6, -46 - (i % 5) * 14], opacity: [0, 1, 0] }}
          transition={{ duration: 1.4, delay: i * 0.05 }} />
      ))}
    </span>
  );
}

export default function Lesson() {
  const { id } = useParams();
  const nav = useNavigate();
  const lesson = lessonById(id ?? '');
  const { done, toggleLesson } = useApp();
  const idx = useMemo(() => LESSONS.findIndex((l) => l.id === id), [id]);

  const articleRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: articleRef, offset: ['start 0.35', 'end 0.92'] });
  const readX = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 });

  useEffect(() => { window.scrollTo({ top: 0 }); }, [id]);

  if (!lesson) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-slate-400">Lesson not found.</p>
        <Link to="/learn" className="mt-4 inline-block text-violet-300 underline">Back to the path</Link>
      </div>
    );
  }

  const prev = LESSONS[idx - 1];
  const next = LESSONS[idx + 1];
  const isDone = done.includes(lesson.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* header */}
      <Link to="/learn" className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-violet-300">
        <ArrowLeft className="h-4 w-4" /> Learning path
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <motion.span initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="grid h-12 w-12 place-items-center rounded-2xl border font-display text-lg font-bold"
          style={{ borderColor: lesson.accent + '66', background: lesson.accent + '14', color: lesson.accent }}>
          {String(idx + 1).padStart(2, '0')}
        </motion.span>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            <WordReveal text={lesson.title} />
          </h1>
          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {lesson.minutes} min read</span>
            {isDone && (
              <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 text-emerald-400">
                <Check className="h-3.5 w-3.5" /> completed
              </motion.span>
            )}
          </div>
        </div>
      </div>
      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }}
        className="mt-4 text-lg leading-relaxed text-slate-400">{lesson.subtitle}</motion.p>

      {/* outcomes */}
      <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">You'll walk away able to…</div>
        <motion.ul className="mt-3 grid gap-2 sm:grid-cols-3"
          variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
          {lesson.outcomes.map((o) => (
            <motion.li key={o} variants={staggerItem} className="flex items-start gap-2 text-sm text-slate-300">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: lesson.accent }} />{o}
            </motion.li>
          ))}
        </motion.ul>
      </div>

      {/* reading progress */}
      <div className="fade-top sticky top-16 z-20 -mx-4 mt-8 px-4 pb-3 pt-2 sm:-mx-6 sm:px-6">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div className="h-full origin-left rounded-full"
            style={{ scaleX: readX, background: `linear-gradient(90deg, ${lesson.accent}, #22d3ee)` }} />
        </div>
      </div>

      {/* blocks */}
      <div ref={articleRef} className="mt-4 space-y-10">
        {lesson.blocks.map((b, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
            <BlockView b={b} accent={lesson.accent} />
          </motion.div>
        ))}
      </div>

      {/* quiz */}
      <div className="relative mt-14">
        <Quiz key={lesson.id} lesson={lesson} onPass={() => { if (!isDone) toggleLesson(lesson.id); }} />
      </div>

      {/* nav */}
      <div className="mt-12 flex items-center justify-between gap-4 border-t border-white/[0.07] pt-8">
        {prev ? (
          <Link to={`/learn/${prev.id}`} className="group flex items-center gap-3 text-left">
            <ArrowLeft className="h-4 w-4 text-slate-600 transition group-hover:-translate-x-1 group-hover:text-violet-300" />
            <span><span className="block text-[11px] uppercase tracking-wider text-slate-600">Previous</span>
            <span className="text-sm font-semibold text-slate-300 group-hover:text-white">{prev.title}</span></span>
          </Link>
        ) : <span />}
        {next ? (
          <Link to={`/learn/${next.id}`} className="group flex items-center gap-3 text-right">
            <span><span className="block text-[11px] uppercase tracking-wider text-slate-600">Next lesson</span>
            <span className="text-sm font-semibold text-slate-300 group-hover:text-white">{next.title}</span></span>
            <ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-violet-300" />
          </Link>
        ) : (
          <Magnetic strength={0.3}>
            <button onClick={() => nav('/builder')} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110">
              Finish: build your agent <ArrowRight className="h-4 w-4" />
            </button>
          </Magnetic>
        )}
      </div>
    </div>
  );
}