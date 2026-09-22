import { ReactNode, useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Bot, LayoutDashboard, GraduationCap, Hammer, CircuitBoard, Scale, Library, Menu, X, ChevronRight, BookOpen } from 'lucide-react';
import { cn } from '../utils/cn';
import { useApp } from '../context/AppContext';
import { LESSONS } from '../data/learning';
import { CursorGlow, ScrollProgress } from './motion';
import ThemeToggle from './ThemeToggle';

const NAV = [
  { to: '/learn', label: 'Learn', icon: GraduationCap },
  { to: '/builder', label: 'Build', icon: Hammer },
  { to: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { to: '/device', label: 'Device Check', icon: CircuitBoard },
  { to: '/brain', label: 'Local vs API', icon: Scale },
  { to: '/resources', label: 'Resources', icon: Library },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export function Logo({ small }: { small?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-400/20 border border-violet-400/30">
        <Bot className="h-5 w-5 text-violet-300 transition-transform group-hover:scale-110" />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
      </span>
      {!small && (
        <span className="font-display text-lg font-bold tracking-tight text-white">
          Agent<span className="grad-text">Forge</span>
        </span>
      )}
    </Link>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { done } = useApp();
  const loc = useLocation();
  const pct = Math.round((done.length / LESSONS.length) * 100);

  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > prev && y > 160);
    setScrolled(y > 24);
  });

  useEffect(() => { window.scrollTo({ top: 0 }); }, [loc.pathname]);

  return (
    <div className="min-h-screen">
      <div className="scene" />
      <ScrollProgress />
      <CursorGlow />
      {/* ── Nav ── */}
      <motion.header
        animate={{ y: hidden && !open ? '-100%' : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn('glass-nav sticky top-0 z-40 border-b backdrop-blur-xl transition-colors duration-300',
          scrolled ? 'border-white/[0.08]' : 'border-transparent')}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) => cn(
                  'relative flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors',
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200')}>
                {({ isActive }) => (<>
                  <Icon className="h-4 w-4" />{label}
                  {isActive && <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-lg bg-white/[0.07] border border-white/10" />}
                </>)}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <ThemeToggle />
            <Link to="/learn" className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 transition hover:border-violet-400/40 hover:bg-white/[0.06]">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-200">{pct}%</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-violet-300" />
            </Link>
            <Link to="/builder"
              className="rounded-lg border border-white/12 bg-white/[0.04] px-4 py-2 text-[13px] font-semibold text-slate-200 transition hover:border-violet-400/40 hover:bg-white/[0.08]">
              Build an Agent
            </Link>
          </div>
          <button className="lg:hidden text-slate-300 p-2" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/[0.06] lg:hidden">
              <div className="flex items-center justify-between px-4 pt-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Appearance</span>
                <ThemeToggle />
              </div>
              <div className="space-y-1 px-4 py-4">
                {NAV.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} onClick={() => setOpen(false)}
                    className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium',
                      isActive ? 'bg-violet-500/15 text-violet-200' : 'text-slate-400 hover:bg-white/5')}>
                    <Icon className="h-4 w-4" />{label}
                  </NavLink>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ── Page ── */}
      <AnimatePresence mode="wait">
        <motion.main key={loc.pathname}
          initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          {children}
        </motion.main>
      </AnimatePresence>

      {/* ── Footer ── */}
      <footer className="mt-24 border-t border-white/[0.06]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              From zero AI knowledge to a running agent on your own machine. Learn the concepts, check your hardware, build for real.
            </p>
          </div>
          <FooterCol title="Learn" links={[['Learning path', '/learn'], ['Local vs API', '/brain'], ['Resource hub', '/resources']]} />
          <FooterCol title="Build" links={[['Agent builder', '/builder'], ['Device check', '/device'], ['Dashboard', '/dashboard']]} />
          <FooterCol title="Official docs" external links={[
            ['Ollama', 'https://ollama.com'], ['Hugging Face', 'https://huggingface.co'], ['OpenAI Platform', 'https://platform.openai.com'], ['Anthropic Docs', 'https://docs.anthropic.com'],
          ]} />
        </div>
        <div className="pointer-events-none select-none overflow-hidden" aria-hidden>
          <div className="text-outline bg-gradient-to-b from-white/[0.03] to-transparent bg-clip-text pt-4 text-center font-display font-bold uppercase leading-[0.82] tracking-tight [mask-image:linear-gradient(to_bottom,black_55%,transparent_96%)]"
            style={{ fontSize: 'clamp(72px, 15vw, 200px)' }}>
            AgentForge
          </div>
        </div>
        <div className="border-t border-white/[0.05] py-6 text-center text-xs text-slate-400">
          AgentForge — an educational platform. Always download models and API keys from official sources.
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links, external }: { title: string; links: [string, string][]; external?: boolean }) {
  return (
    <div>
      <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</div>
      <ul className="space-y-2.5">
        {links.map(([label, to]) => (
          <li key={label}>
            {external
              ? <a href={to} target="_blank" rel="noreferrer" className="text-sm text-slate-400 transition hover:text-violet-300">{label}</a>
              : <Link to={to} className="text-sm text-slate-400 transition hover:text-violet-300">{label}</Link>}
          </li>
        ))}
      </ul>
    </div>
  );
}