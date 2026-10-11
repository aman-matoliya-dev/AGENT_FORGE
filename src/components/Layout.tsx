import { ReactNode, useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Bot, LayoutDashboard, GraduationCap, Hammer, CircuitBoard, Scale, Library, Menu, X, ChevronRight, BookOpen, History } from 'lucide-react';
import { cn } from '../utils/cn';
import { useApp } from '../context/AppContext';
import { LESSONS } from '../data/learning';
import { CursorGlow, ScrollProgress } from './motion';
import ThemeToggle from './ThemeToggle';

const NAV = [
  { to: '/learn', label: 'Learn', icon: GraduationCap },
  { to: '/builder', label: 'Build', icon: Hammer },
  { to: '/agents', label: 'My Agents', icon: Bot },
  { to: '/history', label: 'Execution History', icon: History },
  { to: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { to: '/device', label: 'Device Check', icon: CircuitBoard },
  { to: '/brain', label: 'Local vs API', icon: Scale },
  { to: '/resources', label: 'Resources', icon: Library },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export function Logo({ small }: { small?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <span className="af-logo-mark relative grid h-9 w-9 place-items-center rounded-md border">
        <Bot className="h-5 w-5 transition-transform group-hover:scale-105" />
      </span>
      {!small && (
        <span className="font-display text-lg font-bold tracking-[-0.04em] text-white">
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
        className={cn('shell-nav sticky top-0 z-40 border-b transition-colors duration-300',
          scrolled ? 'border-white/[0.08]' : 'border-transparent')}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-0.5 xl:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) => cn(
                  'af-nav-link relative flex items-center gap-1 rounded-md px-2 py-2 text-[11px] font-medium xl:px-2.5 xl:text-xs',
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200')}>
                {({ isActive }) => (<>
                  <Icon className="h-3.5 w-3.5 shrink-0" />{label}
                  {isActive && <motion.span layoutId="nav-pill" className="af-nav-active absolute inset-0 -z-10" />}
                </>)}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-3 xl:flex">
            <ThemeToggle />
            <Link to="/learn" className="af-shell-action group flex items-center gap-2 border px-3 py-1.5">
              <div className="h-1 w-14 overflow-hidden rounded-sm bg-white/10">
                <div className="h-full bg-violet-400" style={{ width: `${pct}%` }} />
              </div>
              <span className="font-mono text-[11px] font-semibold tabular-nums text-slate-400 group-hover:text-slate-200">{pct}%</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-violet-300" />
            </Link>
            <Link to="/builder" className="af-shell-action border px-3 py-2 text-xs font-semibold">
              Build an Agent
            </Link>
          </div>
          <button className="af-shell-action grid h-10 w-10 place-items-center border p-2 text-slate-300 xl:hidden"
            onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/[0.08] xl:hidden">
              <div className="flex items-center justify-between px-4 pt-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Appearance</span>
                <ThemeToggle />
              </div>
              <div className="space-y-1 px-4 py-4">
                {NAV.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} onClick={() => setOpen(false)}
                    className={({ isActive }) => cn('af-menu-link flex items-center gap-3 px-4 py-3 text-sm font-medium',
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
      <footer className="af-footer mt-24 border-t">
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
        <div className="af-footer-rule border-t py-6 text-center text-xs text-slate-400">
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