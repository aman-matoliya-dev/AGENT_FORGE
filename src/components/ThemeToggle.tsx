import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '../utils/cn';

/* Animated dark/light switch — knob springs across, icon spins in. */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useApp();
  const isLight = theme === 'light';

  return (
    <button onClick={toggleTheme} aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      className="relative flex h-9 w-[70px] items-center rounded-full border border-white/12 bg-white/[0.04] px-1 transition-colors hover:border-violet-400/40">
      {/* faint backdrop icons */}
      <Moon className={cn('absolute left-2.5 h-3.5 w-3.5 transition-colors', isLight ? 'text-slate-500' : 'text-slate-600')} />
      <Sun className={cn('absolute right-2.5 h-3.5 w-3.5 transition-colors', isLight ? 'text-slate-600' : 'text-slate-500')} />
      {/* knob */}
      <motion.span layout
        transition={{ type: 'spring', stiffness: 550, damping: 32 }}
        className={cn('relative z-10 grid h-7 w-7 place-items-center rounded-full shadow-lg',
          isLight ? 'ml-auto bg-gradient-to-br from-amber-200 to-amber-400 text-amber-900 shadow-amber-400/30'
                  : 'bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-violet-500/40')}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={theme}
            initial={{ rotate: -120, opacity: 0, scale: 0.4 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 120, opacity: 0, scale: 0.4 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}>
            {isLight ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </button>
  );
}
