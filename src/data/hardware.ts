// /* ── Hardware advisor engine ─────────────────────────────────────
//    Classifies a device, estimates what it can run, and produces
//    explained recommendations by combining hardware + agent type. */

// import { LOCAL_MODELS, AgentType, LocalModel, AGENT_TYPES } from './models';

// export interface DeviceSpecs {
//   os: string;            // windows | macos | linux
//   arch: string;          // x86_64 | arm64
//   cpuCores: number;
//   gpuName: string;       // '' = none / integrated
//   vramGB: number;        // 0 = none
//   ramGB: number;
//   storageGB: number;     // free disk
//   detected: boolean;     // auto-detected or manual
// }

// export const EMPTY_DEVICE: DeviceSpecs = {
//   os: 'windows', arch: 'x86_64', cpuCores: 8, gpuName: '', vramGB: 0, ramGB: 16, storageGB: 100, detected: false,
// };

// export type TierId = 'basic' | 'entry' | 'mid' | 'high' | 'enthusiast';

// export interface Tier {
//   id: TierId;
//   label: string;
//   color: string;         // tailwind-ish hex for badges
//   summary: string;
//   canRun: string;
//   advice: string;
// }

// export const TIERS: Tier[] = [
//   {
//     id: 'basic', label: 'Basic', color: '#94a3b8',
//     summary: 'Light machine — perfect for learning, best paired with cloud APIs.',
//     canRun: 'Tiny 1–3B local models (slow but workable), or any cloud API model.',
//     advice: 'Start with an API brain (Gemini’s free tier or GPT-4o mini) and try Llama 3.2 1B/3B locally to learn how local inference feels.',
//   },
//   {
//     id: 'entry', label: 'Entry Level', color: '#60a5fa',
//     summary: 'Capable starter machine for small local models.',
//     canRun: '1–4B models comfortably (Llama 3.2 3B, Qwen 2.5 3B, Gemma 3 4B, Phi-3.5).',
//     advice: 'You can genuinely run a local agent. Start with Llama 3.2 3B via Ollama, and keep an API key as a fallback for heavy tasks.',
//   },
//   {
//     id: 'mid', label: 'Mid Range', color: '#34d399',
//     summary: 'The local-AI sweet spot — 7–8B models run well here.',
//     canRun: '7–8B models (Llama 3.1 8B, Qwen 2.5 Coder 7B, DeepSeek-R1 8B) smoothly; 14B possible CPU-side.',
//     advice: 'Llama 3.1 8B Q4_K_M is your flagship. For coding agents, Qwen 2.5 Coder 7B is outstanding at this tier.',
//   },
//   {
//     id: 'high', label: 'High Performance', color: '#a78bfa',
//     summary: 'Serious machine — 14B models fly and 32B is within reach.',
//     canRun: '14B models comfortably, 32B models (Qwen 2.5 Coder 32B) with quantization.',
//     advice: 'Qwen 2.5 14B or Phi-4 give you near-frontier reasoning locally. 32B coder models turn this into a real dev workstation.',
//   },
//   {
//     id: 'enthusiast', label: 'AI / Enthusiast', color: '#fbbf24',
//     summary: 'Dream rig — you can run frontier-class open models at home.',
//     canRun: '32B with headroom and 70B models (Llama 3.3 70B) quantized.',
//     advice: 'Llama 3.3 70B Q4_K_M is a genuinely frontier-class brain living on your desk. Add vLLM later if you want to serve it.',
//   },
// ];

// export function classifyDevice(d: DeviceSpecs): Tier {
//   const vram = d.vramGB;
//   const ram = d.ramGB;
//   if (vram >= 24 || ram >= 96) return TIERS[4];
//   if (vram >= 16 || ram >= 48) return TIERS[3];
//   // High-end Apple Silicon: lots of unified memory
//   if (d.arch === 'arm64' && d.os === 'macos' && ram >= 32) return TIERS[3];
//   if (vram >= 8 || ram >= 24 || (d.arch === 'arm64' && d.os === 'macos' && ram >= 16)) return TIERS[2];
//   if (vram >= 4 || ram >= 12) return TIERS[1];
//   return TIERS[0];
// }

// /* ── Fit calculation ── */

// export type Fit = 'perfect' | 'good' | 'tight' | 'too-big';

// export const FIT_META: Record<Fit, { label: string; color: string; blurb: string }> = {
//   perfect:  { label: 'Runs great',   color: '#34d399', blurb: 'Fits in memory with comfortable headroom' },
//   good:     { label: 'Runs well',    color: '#a3e635', blurb: 'Fits with enough room to work' },
//   tight:    { label: 'Tight fit',    color: '#fbbf24', blurb: 'Will run, but close other apps and expect slower speeds' },
//   'too-big':{ label: 'Too large',    color: '#fb7185', blurb: 'Exceeds available memory for a good experience' },
// };

// export function modelFit(m: LocalModel, d: DeviceSpecs): Fit {
//   const q = m.quants.find((x) => x.name === m.recommendedQuant)!;
//   const usableRam = Math.max(2, d.ramGB - 4); // leave headroom for OS + apps
//   // Unified memory (Apple Silicon): RAM acts as VRAM, GPU path available
//   const unified = d.arch === 'arm64' && d.os === 'macos';
//   const gpuMem = unified ? usableRam * 0.75 : d.vramGB;

//   if (d.storageGB < q.sizeGB + 2) return 'too-big';
//   if (gpuMem >= q.ramGB) return 'perfect';                       // full GPU offload
//   if (usableRam >= q.ramGB + 2) return 'good';                   // comfortable CPU/mixed
//   if (usableRam >= q.ramGB) return 'tight';                      // bare minimum
//   return 'too-big';
// }

// export function fitReason(m: LocalModel, d: DeviceSpecs, fit: Fit): string {
//   const q = m.quants.find((x) => x.name === m.recommendedQuant)!;
//   const unified = d.arch === 'arm64' && d.os === 'macos';
//   switch (fit) {
//     case 'perfect':
//       return unified
//         ? `This model's ${q.name} quant needs ~${q.ramGB} GB of memory — your ${d.ramGB} GB of Apple unified memory handles it entirely on the GPU for fast generation.`
//         : `This model's ${q.name} quant needs ~${q.ramGB} GB — your ${d.vramGB} GB of VRAM can hold the whole model on the GPU, so generation will be fast.`;
//     case 'good':
//       return `Your ${d.ramGB} GB of RAM comfortably covers the ~${q.ramGB} GB this ${q.name} quant needs. It will run mostly on your CPU${d.vramGB > 0 ? ' (with some GPU help)' : ''} — perfectly usable, just not instant.`;
//     case 'tight':
//       return `This model barely fits: it needs ~${q.ramGB} GB and you have ~${Math.max(2, d.ramGB - 4)} GB usable after your OS. It will run, but close other apps — a smaller model below would feel smoother.`;
//     default:
//       return d.storageGB < q.sizeGB + 2
//         ? `You only have ${d.storageGB} GB free and this model weighs ${q.sizeGB} GB — free up disk space or pick a smaller model.`
//         : `This model wants ~${q.ramGB} GB of memory but your device realistically has ~${Math.max(2, d.ramGB - 4)} GB usable. It would swap to disk and crawl — see the alternatives instead.`;
//   }
// }

// /* ── Recommendation engine ── */

// export interface Recommendation {
//   model: LocalModel;
//   fit: Fit;
//   score: number;
//   reason: string;
// }

// export function recommendModels(d: DeviceSpecs, agentType: AgentType): Recommendation[] {
//   const recs: Recommendation[] = LOCAL_MODELS.map((m) => {
//     const fit = modelFit(m, d);
//     const typeIdx = m.bestFor.indexOf(agentType);
//     let score = 0;
//     score += fit === 'perfect' ? 100 : fit === 'good' ? 82 : fit === 'tight' ? 45 : -50;
//     score += typeIdx === 0 ? 20 : typeIdx > 0 ? 12 : 0;   // purpose match
//     score += m.quality * 4;                                // smarter is better
//     score += m.speed * 1.5;                                // snappier feels better for beginners
//     return { model: m, fit, score, reason: fitReason(m, d, fit) };
//   });

//   return recs
//     .filter((r) => r.fit !== 'too-big')
//     .sort((a, b) => b.score - a.score);
// }

// export function alternativesFor(d: DeviceSpecs, m: LocalModel): LocalModel[] {
//   const target = m.minRamGB;
//   return LOCAL_MODELS
//     .filter((x) => x.id !== m.id && x.minRamGB < target)
//     .map((x) => ({ x, fit: modelFit(x, d) }))
//     .filter((r) => r.fit === 'perfect' || r.fit === 'good')
//     .sort((a, b) => b.x.quality - a.x.quality)
//     .slice(0, 3)
//     .map((r) => r.x);
// }

// /* ── Browser auto-detection (safe, permission-free APIs) ── */

// export interface DetectionResult {
//   specs: DeviceSpecs;
//   notes: string[];
// }

// export async function detectHardware(): Promise<DetectionResult> {
//   const notes: string[] = [];
//   const d: DeviceSpecs = { ...EMPTY_DEVICE, detected: true };
//   const nav = navigator as Navigator & { deviceMemory?: number };
//   const ua = navigator.userAgent;

//   // OS + architecture
//   if (/Mac OS X|Macintosh/.test(ua)) {
//     d.os = 'macos';
//     d.arch = /arm|ARM/.test(ua) ? 'arm64' : 'arm64'; // modern Safari hides it; Apple Silicon odds are high
//     notes.push('macOS detected — on Apple Silicon your RAM doubles as graphics memory (great for local AI).');
//   } else if (/Linux/.test(ua)) { d.os = 'linux'; }
//   else { d.os = 'windows'; }

//   // CPU cores
//   if (navigator.hardwareConcurrency) {
//     d.cpuCores = navigator.hardwareConcurrency;
//   } else { notes.push('CPU core count was hidden by your browser — using an estimate.'); }

//   // RAM (Chrome/Edge only, rounded by the browser for privacy)
//   if (nav.deviceMemory) {
//     d.ramGB = nav.deviceMemory >= 8 ? 16 : 8; // browser reports max 8; infer typical
//     if (nav.deviceMemory <= 4) d.ramGB = nav.deviceMemory * 2;
//     notes.push(`Browser reports ≈${nav.deviceMemory} GB RAM (browsers cap this value for privacy) — verify below.`);
//   } else {
//     notes.push('Your browser does not share RAM info — the estimate below needs your confirmation.');
//   }

//   // GPU via WebGL
//   try {
//     const canvas = document.createElement('canvas');
//     const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
//     if (gl) {
//       const ext = gl.getExtension('WEBGL_debug_renderer_info');
//       const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
//       if (renderer && typeof renderer === 'string') {
//         d.gpuName = renderer.replace(/ANGLE \((.*)\)/, '$1').split(',')[0].trim();
//         const vramGuess = guessVram(d.gpuName);
//         if (vramGuess > 0) { d.vramGB = vramGuess; }
//         else notes.push(`Found your GPU (“${d.gpuName}”) but VRAM cannot be read from a browser — set it manually below.`);
//         if (d.os === 'macos' && /Apple|M1|M2|M3|M4/.test(d.gpuName)) { d.arch = 'arm64'; d.vramGB = 0; }
//       }
//     } else { notes.push('WebGL unavailable — GPU could not be detected.'); }
//   } catch { notes.push('GPU detection was blocked — set it manually below.'); }

//   // Free storage estimate
//   try {
//     if (navigator.storage?.estimate) {
//       const est = await navigator.storage.estimate();
//       if (est.quota) {
//         const free = Math.round((est.quota - (est.usage ?? 0)) / 1e9);
//         d.storageGB = Math.max(10, Math.min(2000, free));
//         if (free < 50) notes.push('Low free disk space detected — models need a few GB each.');
//       }
//     }
//   } catch { /* ignore */ }

//   notes.push('Browsers can only see so much — please confirm the numbers below.');
//   return { specs: d, notes };
// }

// const VRAM_TABLE: [RegExp, number][] = [
//   [/RTX 4090/, 24], [/RTX 4080/, 16], [/RTX 4070 Ti/, 12], [/RTX 4070/, 12],
//   [/RTX 3090/, 24], [/RTX 3080 Ti/, 12], [/RTX 3080/, 10], [/RTX 3070/, 8],
//   [/RTX 4060 Ti/, 16], [/RTX 4060/, 8], [/RTX 3060 Ti/, 8], [/RTX 3060/, 12],
//   [/RTX 3050/, 8], [/RTX 2080/, 8], [/RTX 2070/, 8], [/RTX 2060/, 6],
//   [/GTX 1660/, 6], [/GTX 1080/, 8], [/GTX 1070/, 8], [/GTX 1060/, 6],
//   [/RX 7900 XTX/, 24], [/RX 7900 XT/, 20], [/RX 7800/, 16], [/RX 7700/, 12],
//   [/RX 6900/, 16], [/RX 6800/, 16], [/RX 6700/, 10], [/RX 6600/, 8], [/RX 5700/, 8],
//   [/Arc A770/, 16], [/Arc A750/, 8],
// ];

// function guessVram(gpuName: string): number {
//   for (const [re, vram] of VRAM_TABLE) if (re.test(gpuName)) return vram;
//   return 0;
// }

// export const AGENT_TYPE_LABEL = (t: AgentType) => AGENT_TYPES.find((a) => a.id === t)?.label ?? t;





/* ── Hardware advisor engine ─────────────────────────────────────
   Classifies a device, estimates what it can run, and produces
   explained recommendations by combining hardware + agent type. */

import { LOCAL_MODELS, AgentType, LocalModel, AGENT_TYPES } from './models';

export interface DeviceSpecs {
  os: string;            // windows | macos | linux
  arch: string;          // x86_64 | arm64
  cpuCores: number;
  gpuName: string;       // '' = none / integrated
  vramGB: number;        // 0 = none
  ramGB: number;
  storageGB: number;     // free disk
  detected: boolean;     // auto-detected or manual
}

export const EMPTY_DEVICE: DeviceSpecs = {
  os: 'windows', arch: 'x86_64', cpuCores: 8, gpuName: '', vramGB: 0, ramGB: 16, storageGB: 100, detected: false,
};

export type TierId = 'basic' | 'entry' | 'mid' | 'high' | 'enthusiast';

export interface Tier {
  id: TierId;
  label: string;
  color: string;         // tailwind-ish hex for badges
  summary: string;
  canRun: string;
  advice: string;
}

export const TIERS: Tier[] = [
  {
    id: 'basic', label: 'Basic', color: '#94a3b8',
    summary: 'Light machine — perfect for learning, best paired with cloud APIs.',
    canRun: 'Tiny 1–3B local models (slow but workable), or any cloud API model.',
    advice: 'Start with an API brain (Gemini’s free tier or GPT-4o mini) and try Llama 3.2 1B/3B locally to learn how local inference feels.',
  },
  {
    id: 'entry', label: 'Entry Level', color: '#60a5fa',
    summary: 'Capable starter machine for small local models.',
    canRun: '1–4B models comfortably (Llama 3.2 3B, Qwen 2.5 3B, Gemma 3 4B, Phi-3.5).',
    advice: 'You can genuinely run a local agent. Start with Llama 3.2 3B via Ollama, and keep an API key as a fallback for heavy tasks.',
  },
  {
    id: 'mid', label: 'Mid Range', color: '#34d399',
    summary: 'The local-AI sweet spot — 7–8B models run well here.',
    canRun: '7–8B models (Llama 3.1 8B, Qwen 2.5 Coder 7B, DeepSeek-R1 8B) smoothly; 14B possible CPU-side.',
    advice: 'Llama 3.1 8B Q4_K_M is your flagship. For coding agents, Qwen 2.5 Coder 7B is outstanding at this tier.',
  },
  {
    id: 'high', label: 'High Performance', color: '#a78bfa',
    summary: 'Serious machine — 14B models fly and 32B is within reach.',
    canRun: '14B models comfortably, 32B models (Qwen 2.5 Coder 32B) with quantization.',
    advice: 'Qwen 2.5 14B or Phi-4 give you near-frontier reasoning locally. 32B coder models turn this into a real dev workstation.',
  },
  {
    id: 'enthusiast', label: 'AI / Enthusiast', color: '#fbbf24',
    summary: 'Dream rig — you can run frontier-class open models at home.',
    canRun: '32B with headroom and 70B models (Llama 3.3 70B) quantized.',
    advice: 'Llama 3.3 70B Q4_K_M is a genuinely frontier-class brain living on your desk. Add vLLM later if you want to serve it.',
  },
];

export function classifyDevice(d: DeviceSpecs): Tier {
  const vram = d.vramGB;
  const ram = d.ramGB;
  if (vram >= 24 || ram >= 96) return TIERS[4];
  if (vram >= 16 || ram >= 48) return TIERS[3];
  // High-end Apple Silicon: lots of unified memory
  if (d.arch === 'arm64' && d.os === 'macos' && ram >= 32) return TIERS[3];
  if (vram >= 8 || ram >= 24 || (d.arch === 'arm64' && d.os === 'macos' && ram >= 16)) return TIERS[2];
  if (vram >= 4 || ram >= 12) return TIERS[1];
  return TIERS[0];
}

/* ── Fit calculation ── */

export type Fit = 'perfect' | 'good' | 'tight' | 'too-big';

export const FIT_META: Record<Fit, { label: string; color: string; blurb: string }> = {
  perfect:  { label: 'Runs great',   color: '#34d399', blurb: 'Fits in memory with comfortable headroom' },
  good:     { label: 'Runs well',    color: '#a3e635', blurb: 'Fits with enough room to work' },
  tight:    { label: 'Tight fit',    color: '#fbbf24', blurb: 'Will run, but close other apps and expect slower speeds' },
  'too-big':{ label: 'Too large',    color: '#fb7185', blurb: 'Exceeds available memory for a good experience' },
};

export function modelFit(m: LocalModel, d: DeviceSpecs): Fit {
  const q = m.quants.find((x) => x.name === m.recommendedQuant)!;
  const usableRam = Math.max(2, d.ramGB - 4); // leave headroom for OS + apps
  // Unified memory (Apple Silicon): RAM acts as VRAM, GPU path available
  const unified = d.arch === 'arm64' && d.os === 'macos';
  const gpuMem = unified ? usableRam * 0.75 : d.vramGB;

  if (d.storageGB < q.sizeGB + 2) return 'too-big';
  if (gpuMem >= q.ramGB) return 'perfect';                       // full GPU offload
  if (usableRam >= q.ramGB + 2) return 'good';                   // comfortable CPU/mixed
  if (usableRam >= q.ramGB) return 'tight';                      // bare minimum
  return 'too-big';
}

export function fitReason(m: LocalModel, d: DeviceSpecs, fit: Fit): string {
  const q = m.quants.find((x) => x.name === m.recommendedQuant)!;
  const unified = d.arch === 'arm64' && d.os === 'macos';
  switch (fit) {
    case 'perfect':
      return unified
        ? `This model's ${q.name} quant needs ~${q.ramGB} GB of memory — your ${d.ramGB} GB of Apple unified memory handles it entirely on the GPU for fast generation.`
        : `This model's ${q.name} quant needs ~${q.ramGB} GB — your ${d.vramGB} GB of VRAM can hold the whole model on the GPU, so generation will be fast.`;
    case 'good':
      return `Your ${d.ramGB} GB of RAM comfortably covers the ~${q.ramGB} GB this ${q.name} quant needs. It will run mostly on your CPU${d.vramGB > 0 ? ' (with some GPU help)' : ''} — perfectly usable, just not instant.`;
    case 'tight':
      return `This model barely fits: it needs ~${q.ramGB} GB and you have ~${Math.max(2, d.ramGB - 4)} GB usable after your OS. It will run, but close other apps — a smaller model below would feel smoother.`;
    default:
      return d.storageGB < q.sizeGB + 2
        ? `You only have ${d.storageGB} GB free and this model weighs ${q.sizeGB} GB — free up disk space or pick a smaller model.`
        : `This model wants ~${q.ramGB} GB of memory but your device realistically has ~${Math.max(2, d.ramGB - 4)} GB usable. It would swap to disk and crawl — see the alternatives instead.`;
  }
}

/* ── Recommendation engine ── */

export interface Recommendation {
  model: LocalModel;
  fit: Fit;
  score: number;
  reason: string;
}

export function recommendModels(d: DeviceSpecs, agentType: AgentType): Recommendation[] {
  const recs: Recommendation[] = LOCAL_MODELS.map((m) => {
    const fit = modelFit(m, d);
    const typeIdx = m.bestFor.indexOf(agentType);
    let score = 0;
    score += fit === 'perfect' ? 100 : fit === 'good' ? 82 : fit === 'tight' ? 45 : -50;
    score += typeIdx === 0 ? 20 : typeIdx > 0 ? 12 : 0;   // purpose match
    score += m.quality * 4;                                // smarter is better
    score += m.speed * 1.5;                                // snappier feels better for beginners
    return { model: m, fit, score, reason: fitReason(m, d, fit) };
  });

  return recs
    .filter((r) => r.fit !== 'too-big')
    .sort((a, b) => b.score - a.score);
}

export function alternativesFor(d: DeviceSpecs, m: LocalModel): LocalModel[] {
  const target = m.minRamGB;
  return LOCAL_MODELS
    .filter((x) => x.id !== m.id && x.minRamGB < target)
    .map((x) => ({ x, fit: modelFit(x, d) }))
    .filter((r) => r.fit === 'perfect' || r.fit === 'good')
    .sort((a, b) => b.x.quality - a.x.quality)
    .slice(0, 3)
    .map((r) => r.x);
}

/* ── Browser auto-detection (safe, permission-free APIs) ── */

export interface DetectionResult {
  specs: DeviceSpecs;
  notes: string[];
}

export async function detectHardware(): Promise<DetectionResult> {
  const notes: string[] = [];
  const d: DeviceSpecs = { ...EMPTY_DEVICE, detected: true };
  const nav = navigator as Navigator & { deviceMemory?: number };
  const ua = navigator.userAgent;

  // OS + architecture
  if (/Mac OS X|Macintosh/.test(ua)) {
    d.os = 'macos';
    // Modern Safari deliberately hides real CPU architecture in the UA string for
    // privacy, so a regex on `ua` alone can never tell Intel vs Apple Silicon Macs
    // apart there. Chromium browsers expose the real value via User-Agent Client
    // Hints, so ask for it there first and only fall back to an assumption
    // when no real signal is available.
    const uaData = (navigator as Navigator & { userAgentData?: any }).userAgentData;
    if (uaData?.getHighEntropyValues) {
      try {
        const hints = await uaData.getHighEntropyValues(['architecture']);
        d.arch = hints.architecture === 'x86' ? 'x86_64' : 'arm64';
      } catch {
        d.arch = 'arm64';
        notes.push('Could not confirm CPU architecture — assuming Apple Silicon (most Macs sold since 2021).');
      }
    } else {
      d.arch = 'arm64';
      notes.push('Your browser doesn\u2019t expose real CPU architecture — assuming Apple Silicon; correct this below if you have an older Intel Mac.');
    }
    notes.push('macOS detected — on Apple Silicon your RAM doubles as graphics memory (great for local AI).');
  } else if (/Linux/.test(ua)) { d.os = 'linux'; }
  else { d.os = 'windows'; }

  // CPU cores
  if (navigator.hardwareConcurrency) {
    d.cpuCores = navigator.hardwareConcurrency;
  } else { notes.push('CPU core count was hidden by your browser — using an estimate.'); }

  // RAM (Chrome/Edge only, rounded by the browser for privacy)
  if (nav.deviceMemory) {
    d.ramGB = nav.deviceMemory >= 8 ? 16 : 8; // browser reports max 8; infer typical
    if (nav.deviceMemory <= 4) d.ramGB = nav.deviceMemory * 2;
    notes.push(`Browser reports ≈${nav.deviceMemory} GB RAM (browsers cap this value for privacy) — verify below.`);
  } else {
    notes.push('Your browser does not share RAM info — the estimate below needs your confirmation.');
  }

  // GPU via WebGL
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      if (renderer && typeof renderer === 'string') {
        d.gpuName = renderer.replace(/ANGLE \((.*)\)/, '$1').split(',')[0].trim();
        const vramGuess = guessVram(d.gpuName);
        if (vramGuess > 0) { d.vramGB = vramGuess; }
        else notes.push(`Found your GPU (“${d.gpuName}”) but VRAM cannot be read from a browser — set it manually below.`);
        if (d.os === 'macos' && /Apple|M1|M2|M3|M4/.test(d.gpuName)) { d.arch = 'arm64'; d.vramGB = 0; }
      }
    } else { notes.push('WebGL unavailable — GPU could not be detected.'); }
  } catch { notes.push('GPU detection was blocked — set it manually below.'); }

  // Free storage estimate
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      if (est.quota) {
        const free = Math.round((est.quota - (est.usage ?? 0)) / 1e9);
        d.storageGB = Math.max(10, Math.min(2000, free));
        if (free < 50) notes.push('Low free disk space detected — models need a few GB each.');
      }
    }
  } catch { /* ignore */ }

  notes.push('Browsers can only see so much — please confirm the numbers below.');
  return { specs: d, notes };
}

const VRAM_TABLE: [RegExp, number][] = [
  [/RTX 4090/, 24], [/RTX 4080/, 16], [/RTX 4070 Ti/, 12], [/RTX 4070/, 12],
  [/RTX 3090/, 24], [/RTX 3080 Ti/, 12], [/RTX 3080/, 10], [/RTX 3070/, 8],
  [/RTX 4060 Ti/, 16], [/RTX 4060/, 8], [/RTX 3060 Ti/, 8], [/RTX 3060/, 12],
  [/RTX 3050/, 8], [/RTX 2080/, 8], [/RTX 2070/, 8], [/RTX 2060/, 6],
  [/GTX 1660/, 6], [/GTX 1080/, 8], [/GTX 1070/, 8], [/GTX 1060/, 6],
  [/RX 7900 XTX/, 24], [/RX 7900 XT/, 20], [/RX 7800/, 16], [/RX 7700/, 12],
  [/RX 6900/, 16], [/RX 6800/, 16], [/RX 6700/, 10], [/RX 6600/, 8], [/RX 5700/, 8],
  [/Arc A770/, 16], [/Arc A750/, 8],
];

function guessVram(gpuName: string): number {
  for (const [re, vram] of VRAM_TABLE) if (re.test(gpuName)) return vram;
  return 0;
}

export const AGENT_TYPE_LABEL = (t: AgentType) => AGENT_TYPES.find((a) => a.id === t)?.label ?? t;

