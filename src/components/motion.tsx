/* ── Framer Motion toolkit ───────────────────────────────────────
   Reusable physics-driven effects used across the app. */

import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  animate, motion, useInView, useMotionValue, useMotionValueEvent,
  useReducedMotion, useScroll, useSpring, useTransform, Variants,
} from 'framer-motion';
import { cn } from '../utils/cn';

export const EASE = [0.22, 1, 0.36, 1] as const;
export const SPRING = { type: 'spring', stiffness: 180, damping: 22 } as const;

/* Cursor glow — ambient light that follows the pointer */
export function CursorGlow() {
  const reduced = useReducedMotion();
  const x = useMotionValue(-600);
  const y = useMotionValue(-600);
  const sx = useSpring(x, { stiffness: 90, damping: 20, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 90, damping: 20, mass: 0.5 });
  const gx = useTransform(sx, (v) => v - 280);
  const gy = useTransform(sy, (v) => v - 280);

  useEffect(() => {
    const move = (e: PointerEvent) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [x, y]);

  if (reduced) return null;
  return (
    <motion.div aria-hidden
      className="pointer-events-none fixed z-0 h-[560px] w-[560px] rounded-full blur-3xl"
      style={{
        x: gx, y: gy, opacity: 0.32,
        background: 'radial-gradient(circle, rgba(139,92,246,0.30), rgba(34,211,238,0.10) 45%, transparent 68%)',
      }} />
  );
}

/* Top scroll progress bar */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.3 });
  return (
    <motion.div aria-hidden
      className="fixed left-0 right-0 top-0 z-50 h-[2.5px] origin-left bg-gradient-to-r from-violet-500 via-fuchsia-400 to-cyan-400"
      style={{ scaleX }} />
  );
}

/* Magnetic hover — element leans toward the pointer */
export function Magnetic({ children, strength = 0.35, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 16, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 250, damping: 16, mass: 0.3 });
  const reduced = useReducedMotion();
  if (reduced) return <div className={cn('inline-block', className)}>{children}</div>;
  return (
    <motion.div ref={ref} className={cn('inline-block', className)} style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}>
      {children}
    </motion.div>
  );
}

/* 3D tilt on hover */
export function Tilt({ children, className, max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 300, damping: 22, mass: 0.4 });
  const sry = useSpring(ry, { stiffness: 300, damping: 22, mass: 0.4 });
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div ref={ref} className={className}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 1000, transformStyle: 'preserve-3d' }}
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        const relX = (e.clientX - r.left) / r.width - 0.5;
        const relY = (e.clientY - r.top) / r.height - 0.5;
        ry.set(relX * max * 2);
        rx.set(-relY * max * 2);
      }}
      onPointerLeave={() => { rx.set(0); ry.set(0); }}>
      {children}
    </motion.div>
  );
}

/* Animated number that counts up when scrolled into view */
export function Counter({ value, suffix = '', className, duration = 1.6 }: { value: number; suffix?: string; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  useMotionValueEvent(mv, 'change', (v) => setDisplay(Math.round(v)));
  useEffect(() => {
    if (inView) {
      const controls = animate(mv, value, { duration, ease: EASE });
      return () => controls.stop();
    }
  }, [inView, value, duration, mv]);
  return <span ref={ref} className={className}>{display}{suffix}</span>;
}

/* Infinite marquee strip */
export function Marquee({ children, speed = 30, className, reverse }: { children: ReactNode; speed?: number; className?: string; reverse?: boolean }) {
  return (
    <div className={cn('overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]', className)}>
      <motion.div className="flex w-max"
        animate={{ x: reverse ? ['-50%', '0%'] : ['0%', '-50%'] }}
        transition={{ duration: speed, ease: 'linear', repeat: Infinity }}>
        <div className="flex items-center gap-3 pr-3">{children}</div>
        <div className="flex items-center gap-3 pr-3">{children}</div>
      </motion.div>
    </div>
  );
}

/* Stagger container + item (scroll-triggered, springy entrances) */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 26, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: SPRING },
};

export function Stagger({ children, className, amount = 0.15 }: { children: ReactNode; className?: string; amount?: number }) {
  return (
    <motion.div className={className} variants={staggerContainer} initial="hidden"
      whileInView="show" viewport={{ once: true, amount }}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return <motion.div className={className} variants={staggerItem}>{children}</motion.div>;
}

/* Gentle idle floating */
export function Float({ children, className, duration = 5, distance = 8, delay = 0 }: {
  children: ReactNode; className?: string; duration?: number; distance?: number; delay?: number;
}) {
  return (
    <motion.div className={className} animate={{ y: [0, -distance, 0] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}>
      {children}
    </motion.div>
  );
}

/* Word-by-word masked headline reveal (for hero titles) */
export function WordReveal({ text, className, delay = 0, stagger = 0.055 }: {
  text: string; className?: string; delay?: number; stagger?: number;
}) {
  return (
    <span className={className}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] -mb-[0.08em] align-bottom">
          <motion.span className="inline-block will-change-transform"
            initial={{ y: '112%' }} animate={{ y: 0 }}
            transition={{ delay: delay + i * stagger, duration: 0.75, ease: EASE }}>
            {w}{i < text.split(' ').length - 1 ? '\u00A0' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* Directional variants for wizard-like flows */
export const slideVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: 64 * dir, filter: 'blur(4px)' }),
  center: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.35, ease: EASE } },
  exit: (dir: number) => ({ opacity: 0, x: -64 * dir, filter: 'blur(4px)', transition: { duration: 0.25, ease: EASE } }),
};
