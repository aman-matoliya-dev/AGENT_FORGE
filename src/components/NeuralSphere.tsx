/* ── 3D neural sphere ────────────────────────────────────────────
   Hand-rolled canvas 3D: a rotating Fibonacci sphere of particles
   with depth-sorted connections. Zero dependencies, pointer-reactive,
   theme-aware. */

import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

const VIOLET = [139, 92, 246] as const;
const CYAN = [34, 211, 238] as const;

export default function NeuralSphere({ className, density = 130 }: { className?: string; density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useApp();
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0, h = 0;
    let running = true;

    /* fibonacci sphere point cloud */
    const N = density;
    const pts: [number, number, number][] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = golden * i;
      pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
    }

    /* neighbor pairs (rigid shape → precompute once, rotation-invariant) */
    const pairs: [number, number][] = [];
    const LINK = 0.62;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1], dz = pts[i][2] - pts[j][2];
        if (dx * dx + dy * dy + dz * dz < LINK * LINK) pairs.push([i, j]);
      }
    }

    const proj = pts.map(() => ({ x: 0, y: 0, s: 1, z: 0 }));
    let rotY = 0, rotX = 0.34;
    let mouseX = 0.5, mouseY = 0.5;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = rect.width; h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { running = e.isIntersecting; }, { threshold: 0.02 });
    io.observe(canvas);
    const onMove = (e: PointerEvent) => {
      mouseX = e.clientX / window.innerWidth;
      mouseY = e.clientY / window.innerHeight;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!running || w === 0) return;

      rotY += 0.0022 + (mouseX - 0.5) * 0.0035;
      rotX += ((0.34 + (mouseY - 0.5) * 0.28) - rotX) * 0.04;

      const R = Math.min(w, h) * 0.4;
      const cx = w * 0.5, cy = h * 0.5;
      const f = 1.9; // perspective strength
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

      for (let i = 0; i < N; i++) {
        const [x, y, z] = pts[i];
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        const y1 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX; // -1 back … 1 front
        const s = f / (f + (1 - z2) * 0.9);
        proj[i].x = cx + x1 * R * s;
        proj[i].y = cy + y1 * R * s;
        proj[i].s = s;
        proj[i].z = z2;
      }

      ctx.clearRect(0, 0, w, h);
      const light = themeRef.current === 'light';
      const lineBase = light ? 0.16 : 0.20;

      /* connections */
      ctx.lineWidth = 1;
      for (const [a, b] of pairs) {
        const pa = proj[a], pb = proj[b];
        const depth = (pa.z + pb.z) * 0.25 + 0.5; // 0 back … 1 front
        const alpha = lineBase * (0.15 + depth * 0.85);
        if (alpha < 0.015) continue;
        const my = (pa.y + pb.y) * 0.5 / h;
        const r = Math.round(VIOLET[0] + (CYAN[0] - VIOLET[0]) * my);
        const g = Math.round(VIOLET[1] + (CYAN[1] - VIOLET[1]) * my);
        const bl = Math.round(VIOLET[2] + (CYAN[2] - VIOLET[2]) * my);
        ctx.strokeStyle = `rgba(${r},${g},${bl},${alpha})`;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }

      /* particles */
      for (let i = 0; i < N; i++) {
        const p = proj[i];
        const depth = p.z * 0.5 + 0.5;
        const alpha = (light ? 0.35 : 0.45) + depth * 0.55;
        const yMix = (pts[i][1] + 1) * 0.5;
        const r = Math.round(VIOLET[0] + (CYAN[0] - VIOLET[0]) * yMix);
        const g = Math.round(VIOLET[1] + (CYAN[1] - VIOLET[1]) * yMix);
        const bl = Math.round(VIOLET[2] + (CYAN[2] - VIOLET[2]) * yMix);
        ctx.fillStyle = `rgba(${r},${g},${bl},${Math.min(1, alpha)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.8, 1.7 * p.s), 0, Math.PI * 2);
        ctx.fill();
      }
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
    };
  }, [density]);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
