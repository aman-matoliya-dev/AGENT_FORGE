# AgentForge — Design System Reference

> Use this as the single source of truth for any future design work on this
> project — and as a template for writing `design.md` files for other sites.

---

## 1 · Design intent

**Personality:** futuristic · friendly · honest · hands-on · never intimidating.

We are equal parts **learning platform**, **developer tool**, and **interactive
toy**. The UI should feel like a well-lit cockpit: advanced technology, calm
surfaces, zero clutter. A first-year student should never feel lost; a developer
should never feel talked down to.

**Three rules above all:**
1. Concepts before code — every visual dramatizes an idea (loops orbit, memory fills, tokens light up).
2. Motion has meaning — animation explains cause and effect, never decorates for its own sake.
3. Honesty over hype — fit badges, trade-off tables, and real numbers, not marketing.

---

## 2 · Color system

Dark-first, with a **full light theme** (toggle in nav, persisted, zero-flash via pre-paint application). The light theme flips Tailwind's `--color-white/slate-*` variables, so all existing utilities re-theme automatically — with one rule: **framed media stays dark in both themes.** Terminals, code windows, and diagram canvases are wrapped in `.codeblock / .diagram-shell / .dark-canvas`, which restores dark palette variables locally.

"Deep space" backgrounds (light: soft paper `#edf0f7`) with a violet→cyan aurora as the signature in both themes.

| Token | Value | Usage |
|---|---|---|
| `void` | `#07070d` | Page background |
| `ink` | `#0b0b16` | Sunken surfaces, code blocks (`#0a0a14`) |
| `panel` | `#10101d` | Card base (used with 3–5% white overlays) |
| `edge` | `rgba(148,163,255,.09)` | Default hairline borders |
| `accent` | `#8b5cf6` (violet-500) | Primary accent, CTAs, active states |
| `accent-2` | `#22d3ee` (cyan-400) | Secondary accent, gradient partner |
| `mint` | `#34d399` | Success, "local", fits/great |
| `amber` | `#fbbf24` | Tools, warnings, "tight fit" |
| `rose` | `#fb7185` | Errors, "too large", destructive |
| text primary | `#e2e8f0` / `#fff` | Headings white, body slate-200 |
| text secondary | `#64748b`…`#94a3b8` | Captions, labels, placeholders |

**Signature gradient:** `linear-gradient(100deg, #c4b5fd, #8b5cf6 35%, #22d3ee)` — used for `grad-text` headings, CTA backgrounds, progress bars.

**Semantic fit colors (hardware advisor):** perfect `#34d399` · good `#a3e635` · tight `#fbbf24` · too-big `#fb7185` · cloud `#38bdf8` · local `#34d399`.

**Background scene:** two soft radial auroras (violet top-left, cyan top-right) + a 56px grid pattern faded with a radial mask. Fixed, behind everything.

**Don'ts:** no pure `#000`, no saturated blues for text, no more than one accent gradient per viewport.

---

## 3 · Typography

| Role | Font | Notes |
|---|---|---|
| Display | `"Space Grotesk"` | Headings, numbers, logo. `tracking-tight`, weights 600–700 |
| Body | `"Inter"` | 14–15px, `leading-relaxed` for prose (1.8 in lessons) |
| Mono | `"JetBrains Mono"` | Code, chips, specs, step numbers, tiny labels |

**Scale:** hero 42–60px display bold → section titles 30–36px → card titles 18–20px display → body 14–15px → captions/labels 11–12px uppercase `tracking-widest` for "kickers".

Section headers always follow: **kicker pill → display title → 15px slate-400 sub**.

---

## 4 · Surfaces, radius, shadows

- **Radius:** cards `1.25rem` (20px) · inner elements `0.75–0.9rem` · pills full.
- **Panels:** `linear-gradient(160deg, 4.5% white → 1.5%)` + 1px `edge` border. No solid grays.
- **Hover lift:** `translateY(-4px)` + border→violet/35% + soft violet shadow (`0 20px 50px -20px, 25% alpha`). For tilt cards, 3D rotation replaces the lift.
- **`grad-border`:** 1px gradient hairline via masked `::before` — reserved for hero moments (verdicts, final CTAs).
- **Code windows:** `#0a0a14`, mac-traffic dots, light syntax tints: keywords `#c4b5fd`, strings `#6ee7b7`, functions `#7dd3fc`, comments `#64748b`.

---

## 5 · Iconography

**Lucide only — never emojis.** Stroke icons at 16–20px in circles/rounded-squares tinted at 12–18% of the icon's color + border at 25–40%. Every concept owns a consistent icon (Brain=LLM, Wrench=tools, Database=memory, BookOpen=knowledge, Workflow=orchestrator…).

---

## 6 · Motion language (Framer Motion)

| Token | Value | Used for |
|---|---|---|
| `EASE` | `cubic-bezier(0.22, 1, 0.36, 1)` | reveals, slides, opacity |
| `SPRING` | `stiffness 180, damping 22` | interactive entrances |
| Buttons | `whileHover y:-2 scale:1.02` / `whileTap scale:.96`, spring 400/18 | all buttons |
| Stagger | `staggerChildren .08s` | card grids |
| Page transition | `y:18 + blur(6px) → 0`, .4s | route changes |
| Wizard | directional slide ±64px + blur | steps |

**Signature effects:** cursor-follow ambient glow (spring 90/20, 560px blur circle) · scroll progress bar (spring 140/28) · magnetic CTAs (0.35 strength) · word-mask headline reveals (55–70ms/word) · infinite marquees with edge fade masks · count-up stats · layout-animated deletions · **film grain** (SVG turbulence, 3.5% overlay blend) · **shine sweeps** on hero-moment cards · **live agent-trace terminal** that types the think→act→observe loop forever · **outlined ghost type** (`.text-outline`) for section indices and the giant footer wordmark · **3D neural sphere** (hand-rolled canvas: Fibonacci point cloud, depth-sorted links, pointer-reactive rotation — zero dependencies, theme-aware) behind the hero · **animated theme knob** (spring slide + icon spin).

**Rules:** movement implies causality in diagrams (packets travel, loops cycle); ambient loops are slow (2–5s) and subtle; everything honors `prefers-reduced-motion` (glow, magnetism, tilt disabled); never animate `width/height` when a transform works.

---

## 7 · Layout & components

- Max width `7xl` (1280px), `px-4 sm:px-6`. Reading pages (lessons) narrow to `3xl`.
- **Nav:** 64px sticky, blur, hide-on-scroll-down; active route gets a shared-element pill (`layoutId`).
- **Badges:** 11px chips, 1px border at 25% color, 8–12% tint bg, 6px status dot.
- **Forms:** `field` class — 3% white bg, 10% border, violet-400/60 focus ring (4px, 10% violet). Sliders with gradient fill track.
- **Wizard stepper:** circles + connectors that fill with a spring gradient; completed = check + violet fill.
- **Compatibility system:** `FitBadge` (runs great / well / tight / too large) + `LocalBadge` + `CloudBadge` — these are the platform's visual vocabulary; keep forever.
- **Diagrams:** nodes = icon in tinted rounded square + 11px label; connectors = dashed animated SVG lines (`stroke-dasharray 6 10`, 1.6s); clicking opens a spring panel, never a new page.

---

## 8 · Accessibility & craft

- Text contrast ≥ AA on all panel backgrounds (body ≥ slate-300 on glass).
- Focus states on every interactive element (violet ring).
- Reduced-motion fallbacks for all decorative animation.
- Data stored in browser localStorage only — surface that promise in the UI.

---

## 9 · Anti-patterns (never do)

- Enterprise-style dense dashboards or gray "admin" tables.
- Emojis, gradient text on long paragraphs, more than 2 font families.
- Modals for core flows (the wizard uses steps; diagrams use inline panels).
- "AI sparkle" clichés everywhere — one Sparkles icon per screen, max.
- Empty hype ("revolutionary") — the copy style is concrete, warm, second-person.
