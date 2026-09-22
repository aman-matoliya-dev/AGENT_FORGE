import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Clock, GraduationCap, Lock, Play, Trophy } from 'lucide-react';
import { LESSONS } from '../data/learning';
import { useApp } from '../context/AppContext';
import { ProgressBar, Reveal, SectionHead } from '../components/ui';
import { Stagger, StaggerItem } from '../components/motion';
import { cn } from '../utils/cn';

export default function Learn() {
  const { done } = useApp();
  const pct = Math.round((done.length / LESSONS.length) * 100);
  const nextIdx = LESSONS.findIndex((l) => !done.includes(l.id));

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <SectionHead kicker="Learning path" title={<>From curious to <span className="grad-text">agent builder</span></>}
        sub="Ten short lessons, each with interactive diagrams and a 2-question check. No math degree required — just curiosity. Your progress saves automatically." />

      {/* progress summary */}
      <Reveal>
        <div className="panel mb-12 flex flex-wrap items-center gap-6 p-6">
          <div className="relative grid h-20 w-20 place-items-center">
            <svg className="h-20 w-20 -rotate-90">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#ffffff12" strokeWidth="7" />
              <motion.circle cx="40" cy="40" r="34" fill="none" stroke="url(#lg)" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`} animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - pct / 100) }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
              <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8b5cf6" /><stop offset="1" stopColor="#22d3ee" /></linearGradient></defs>
            </svg>
            <span className="absolute font-display text-lg font-bold text-white">{pct}%</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg font-bold text-white">
              {done.length === 0 ? 'Ready when you are' : done.length === LESSONS.length ? 'Path complete — go build!' : `${done.length} of ${LESSONS.length} lessons done`}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              {done.length === LESSONS.length
                ? 'You know the theory. The builder is waiting.'
                : nextIdx >= 0 ? `Up next: ${LESSONS[nextIdx].title}` : 'Keep going — one lesson at a time.'}
            </p>
            <div className="mt-3 max-w-md"><ProgressBar value={pct} /></div>
          </div>
          {done.length === LESSONS.length
            ? <Link to="/builder" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110"><Trophy className="h-4 w-4" /> Build your agent</Link>
            : <Link to={`/learn/${LESSONS[Math.max(0, nextIdx)].id}`} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110"><Play className="h-4 w-4" /> {done.length === 0 ? 'Start lesson 1' : 'Continue'}</Link>}
        </div>
      </Reveal>

      {/* path */}
      <div className="relative">
        <motion.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute bottom-6 left-[27px] top-6 w-px origin-top bg-gradient-to-b from-violet-500/50 via-cyan-400/30 to-transparent sm:left-[31px]" />
        <Stagger className="space-y-4" amount={0.1}>
          {LESSONS.map((l, i) => {
            const isDone = done.includes(l.id);
            const isNext = i === nextIdx;
            return (
              <StaggerItem key={l.id}>
                <Link to={`/learn/${l.id}`}
                  className={cn('panel panel-hover group relative flex items-center gap-5 p-5 pl-4 sm:p-6 sm:pl-5',
                    isNext && 'border-violet-400/40 bg-violet-500/[0.06]')}>
                  <span className={cn('relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl border font-display text-lg font-bold transition-all sm:h-16 sm:w-16',
                    isDone ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300'
                    : isNext ? 'border-violet-400/60 bg-violet-500/15 text-violet-200 tick-ring'
                    : 'border-white/10 bg-[#101022] text-slate-500')}>
                    {isDone ? <Check className="h-6 w-6" /> : String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-bold text-white sm:text-lg">{l.title}</h3>
                      {isNext && <span className="chip border border-violet-400/40 bg-violet-500/15 text-violet-300">Up next</span>}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">{l.subtitle}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {l.minutes} min</span>
                      <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> {l.outcomes.length} takeaways</span>
                      <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> quiz to unlock next</span>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-slate-600 transition-all group-hover:translate-x-1 group-hover:text-violet-300" />
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </div>
  );
}
