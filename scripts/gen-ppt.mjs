/* ── PPTX generator — AgentForge training presentation ──────────
   Builds a genuine OOXML .pptx with zero external deps (jszip). */

import JSZip from 'jszip';
import fs from 'node:fs';

/* ── constants ── */
const EMU = 914400;
const IN = (v) => Math.round(v * EMU);
const SLIDE_W = 12192000;   // 13.333in
const SLIDE_H = 6858000;    // 7.5in

const C = {
  bg: '0B0B16', panel: '14142B', panel2: '101022', edge: '2E2E50',
  violet: '8B5CF6', violetDk: '3B2A72', cyan: '22D3EE', cyanDk: '134A5C',
  white: 'FFFFFF', slate: 'AEB4CC', dim: '6F7590',
  mint: '34D399', amber: 'FBBF24', rose: 'FB7185', pink: 'F472B6',
  deco1: '191735', deco2: '0F2B33',
};
const FONT = 'Segoe UI';

/* ── xml helpers ── */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
let spId = 10;
const nid = () => (spId += 1);

function rect(x, y, w, h, { fill = C.panel, line = null, lw = 1, prst = 'rect', radius = null } = {}) {
  const lnXml = line
    ? `<a:ln w="${Math.round(lw * 12700)}"><a:solidFill><a:srgbClr val="${line}"/></a:solidFill></a:ln>`
    : `<a:ln><a:noFill/></a:ln>`;
  const av = radius !== null ? `<a:avLst><a:gd name="adj" fmla="val ${Math.round(radius * 100000)}"/></a:avLst>` : '';
  return `<p:sp><p:nvSpPr><p:cNvPr id="${nid()}" name="shape"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
  <p:spPr><a:xfrm><a:off x="${IN(x)}" y="${IN(y)}"/><a:ext cx="${IN(w)}" cy="${IN(h)}"/></a:xfrm>
  <a:prstGeom prst="${prst}">${av}</a:prstGeom><a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>${lnXml}</p:spPr>
  <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>`;
}

function text(x, y, w, h, paras, { align = 'l', anchor = 't', lIns = 0.02, tIns = 0.01 } = {}) {
  /* paras: [{runs:[{t,color,size,bold,italic}], align?, spcAft?, spcBef?, line?}] */
  const ps = paras.map((p) => {
    const algn = p.align ?? align;
    const spc = p.spcBef ? `<a:spcBef><a:spcPts val="${p.spcBef * 100}"/></a:spcBef>` : '';
    const spa = p.spcAft ? `<a:spcAft><a:spcPts val="${p.spcAft * 100}"/></a:spcAft>` : '';
    const line = p.line ? `<a:lnSpc><a:spcPct val="${p.line * 1000}"/></a:lnSpc>` : '';
    const runs = p.runs.map((r) => {
      const col = r.color ?? C.slate;
      return `<a:r><a:rPr lang="en-US" sz="${Math.round((r.size ?? 12) * 100)}"${r.bold ? ' b="1"' : ''}${r.italic ? ' i="1"' : ''}><a:solidFill><a:srgbClr val="${col}"/></a:solidFill><a:latin typeface="${FONT}"/><a:cs typeface="${FONT}"/></a:rPr><a:t>${esc(r.t)}</a:t></a:r>`;
    }).join('');
    return `<a:p><a:pPr algn="${algn}">${line}${spc}${spa}</a:pPr>${runs}</a:p>`;
  }).join('');
  return `<p:sp><p:nvSpPr><p:cNvPr id="${nid()}" name="text"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
  <p:spPr><a:xfrm><a:off x="${IN(x)}" y="${IN(y)}"/><a:ext cx="${IN(w)}" cy="${IN(h)}"/></a:xfrm>
  <a:prstGeom prst="rect"/><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>
  <p:txBody><a:bodyPr wrap="square" lIns="${IN(lIns)}" tIns="${IN(tIns)}" rIns="${IN(0.02)}" bIns="${IN(0.01)}" anchor="${anchor}"/><a:lstStyle/>${ps}</p:txBody></p:sp>`;
}

const T = (t, opts = {}) => ({ t, ...opts });     // run helper
const P = (runs, opts = {}) => ({ runs: Array.isArray(runs) ? runs : [runs], ...opts });

/* ── slide scaffold ── */
const FOOTER_L = 'AgentForge — AI Agent Learning & Building Platform';
function deco(slideNo, total, shapes) {
  shapes.push(rect(-1.6, -1.9, 4.6, 4.6, { fill: C.deco1, prst: 'ellipse' }));
  shapes.push(rect(11.4, 6.0, 3.4, 3.4, { fill: C.deco2, prst: 'ellipse' }));
  shapes.push(rect(0.55, 0.52, 0.5, 0.055, { fill: C.violet }));
  shapes.push(rect(1.08, 0.52, 0.28, 0.055, { fill: C.cyan }));
  shapes.push(rect(0, 7.18, 13.333, 0.012, { fill: C.edge }));
  shapes.push(text(0.55, 7.24, 7, 0.24, [P(T(FOOTER_L, { size: 8, color: C.dim }))]));
  shapes.push(text(11.9, 7.24, 0.9, 0.24, [P(T(`${slideNo} / ${total}`, { size: 8, color: C.dim }), { align: 'r' })]));
}
function header(shapes, kicker, titleRuns, sub = null) {
  shapes.push(text(0.55, 0.66, 12, 0.3, [P(T(kicker.toUpperCase(), { size: 11, color: C.violet, bold: true }))]));
  shapes.push(text(0.55, 0.98, 12.2, 0.75, [P(titleRuns.map((r) => ({ size: 30, bold: true, color: C.white, ...r })))]));
  if (sub) shapes.push(text(0.55, 1.62, 12.2, 0.4, [P(T(sub, { size: 12.5, color: C.slate }))]));
}
function numBadge(x, y, n, color = C.violet) {
  return [
    rect(x, y, 0.62, 0.62, { fill: C.panel, line: color + '', lw: 1.2, prst: 'roundRect', radius: 0.22 }),
    text(x, y + 0.045, 0.62, 0.5, [P(T(n, { size: 17, bold: true, color }), { align: 'c' })]),
  ];
}

/* ── slide builders ── */
const slides = [];
const TOTAL = 13;
const add = (shapes) => slides.push(shapes);

/* 1 — title */
{
  const s = [];
  s.push(rect(0, 0, 13.333, 7.5, { fill: C.bg }));
  s.push(rect(-2.2, -2.6, 7, 7, { fill: C.deco1, prst: 'ellipse' }));
  s.push(rect(9.2, 3.4, 6.4, 6.4, { fill: C.deco2, prst: 'ellipse' }));
  s.push(rect(8.15, 1.5, 3.6, 3.6, { fill: '161330', prst: 'ellipse' }));
  s.push(rect(9.02, 2.37, 1.85, 1.85, { fill: C.panel, line: C.violet, lw: 2, prst: 'roundRect', radius: 0.22 }));
  s.push(text(9.02, 2.52, 1.85, 1.5, [P(T('AF', { size: 40, bold: true, color: C.violet }), { align: 'c' })]));
  s.push(text(0.85, 1.12, 8, 0.32, [P(T('TRAINING PROJECT PRESENTATION', { size: 13, color: C.cyan, bold: true }))]));
  s.push(rect(0.87, 1.52, 0.6, 0.06, { fill: C.violet }));
  s.push(rect(1.52, 1.52, 0.34, 0.06, { fill: C.cyan }));
  s.push(text(0.82, 1.78, 9.5, 1.5, [P(T('AgentForge', { size: 66, bold: true, color: C.white }))]));
  s.push(text(0.85, 3.06, 9.2, 1.1, [
    P([T('Learn ', { size: 19, color: C.slate }), T('→', { size: 19, color: C.violet, bold: true }),
       T(' Check ', { size: 19, color: C.slate }), T('→', { size: 19, color: C.violet, bold: true }),
       T(' Choose ', { size: 19, color: C.slate }), T('→', { size: 19, color: C.violet, bold: true }),
       T(' Build ', { size: 19, color: C.slate }), T('→', { size: 19, color: C.violet, bold: true }),
       T(' Run', { size: 19, color: C.slate })]),
    P(T('An interactive platform that takes a complete beginner to a running AI agent — with real understanding at every step.', { size: 13.5, color: C.dim }), { spcBef: 8 }),
  ]));
  /* team strip */
  const meta = [['Presented by', 'Team Name / Members (add here)'], ['Guided by', 'Mentor / Trainer name'], ['Program', 'Training / Internship — 2025']];
  meta.forEach(([k, v], i) => {
    const x = 0.85 + i * 2.95;
    s.push(rect(x, 5.35, 2.72, 1.0, { fill: C.panel, line: C.edge, lw: 1, prst: 'roundRect', radius: 0.1 }));
    s.push(text(x + 0.16, 5.5, 2.45, 0.3, [P(T(k.toUpperCase(), { size: 9, color: C.dim }))]));
    s.push(text(x + 0.16, 5.76, 2.45, 0.5, [P(T(v, { size: 11.5, color: C.white, bold: true }))]));
  });
  add(s);
}

/* 2 — agenda */
{
  const s = [];
  s.push(rect(0, 0, 13.333, 7.5, { fill: C.bg }));
  deco(2, TOTAL, s);
  header(s, 'Agenda', [T('What we will cover today')]);
  const items = [
    ['Problem & Motivation', 'Why beginners struggle to enter the world of AI agents'],
    ['Our Solution', 'AgentForge: learn → check → choose → build → run'],
    ['Key Features', 'Learning path, agent builder, device advisor, brain choice, dashboard'],
    ['Team & Roles', 'Who built what — responsibilities and ownership'],
    ['Technology Stack', 'Every technology used, and the reason behind each choice'],
    ['Design, Learnings & Future Scope', 'UI/UX system, challenges, and what comes next'],
  ];
  items.forEach(([t, d], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.55 + col * 6.25, y = 2.15 + row * 1.62;
    s.push(rect(x, y, 5.95, 1.38, { fill: C.panel, line: C.edge, lw: 1, prst: 'roundRect', radius: 0.09 }));
    s.push(...numBadge(x + 0.22, y + 0.38, String(i + 1).padStart(2, '0')));
    s.push(text(x + 1.05, y + 0.22, 4.7, 0.4, [P(T(t, { size: 15.5, bold: true, color: C.white }))]));
    s.push(text(x + 1.05, y + 0.62, 4.75, 0.65, [P(T(d, { size: 11, color: C.slate }))]));
  });
  add(s);
}

/* 3 — problem */
{
  const s = [];
  s.push(rect(0, 0, 13.333, 7.5, { fill: C.bg }));
  deco(3, TOTAL, s);
  header(s, 'Problem statement', [T('Getting into AI agents is harder than it should be')], 'Students and beginners face three walls at once — our project removes all three.');
  const probs = [
    ['01 · Scattered knowledge', C.violet, '• Concepts spread across papers, videos and docs', '• Tutorials assume prior ML background', '• No single guided path from zero to working agent'],
    ['02 · Copy-paste learning', C.amber, '• Tutorials hand out code with no explanation', '• Beginners ship agents they cannot debug', '• “It works but I don’t know why” — no real skill built'],
    ['03 · Hardware confusion', C.cyan, '• “Can my laptop even run a model?” goes unanswered', '• RAM / VRAM / quantization jargon scares newcomers', '• People give up — or overspend on hardware they don’t need'],
  ];
  probs.forEach(([t, c, ...lines], i) => {
    const x = 0.55 + i * 4.25, y = 2.35;
    s.push(rect(x, y, 3.95, 3.6, { fill: C.panel, line: C.edge, lw: 1, prst: 'roundRect', radius: 0.06 }));
    s.push(rect(x, y, 3.95, 0.09, { fill: c }));
    s.push(text(x + 0.25, y + 0.35, 3.5, 0.6, [P(T(t, { size: 16, bold: true, color: c }))]));
    s.push(text(x + 0.25, y + 1.05, 3.5, 2.3, [
      P(T(lines[0], { size: 11.5, color: C.slate }), { spcAft: 10, line: 115 }),
      P(T(lines[1], { size: 11.5, color: C.slate }), { spcAft: 10, line: 115 }),
      P(T(lines[2], { size: 11.5, color: C.slate }), { line: 115 }),
    ]));
  });
  s.push(text(0.55, 6.35, 12.2, 0.4, [P([T('Goal: ', { size: 13, bold: true, color: C.white }), T('zero knowledge → understand agents → check your device → pick a model → build → run it locally or via API.', { size: 13, color: C.slate })])]));
  add(s);
}

/* 4 — solution flow */
{
  const s = [];
  s.push(rect(0, 0, 13.333, 7.5, { fill: C.bg }));
  deco(4, TOTAL, s);
  header(s, 'Our solution', [T('AgentForge — one guided journey'), T(' from zero to a running agent', { color: C.violet })], 'A single website that chains five steps into one flow. Free, browser-based, no sign-up, fully private (all data stays in the browser).');
  const flow = [
    ['1 · Learn', '10 interactive lessons with animated diagrams & quizzes', C.violet],
    ['2 · Check', 'Device advisor detects hardware & classifies it into 5 tiers', C.cyan],
    ['3 · Choose', 'Honest Local-vs-API brain comparison with real trade-offs', C.amber],
    ['4 · Build', '8-step wizard that explains WHY behind every choice', C.pink],
    ['5 · Run', 'Downloads a complete, commented starter project (ZIP)', C.mint],
  ];
  flow.forEach(([t, d, c], i) => {
    const x = 0.55 + i * 2.53, y = 2.4;
    s.push(rect(x, y, 2.3, 2.5, { fill: C.panel, line: C.edge, lw: 1, prst: 'roundRect', radius: 0.08 }));
    s.push(rect(x, y, 2.3, 0.07, { fill: c }));
    s.push(text(x + 0.18, y + 0.28, 2.0, 0.5, [P(T(t, { size: 16, bold: true, color: c }))]));
    s.push(text(x + 0.18, y + 0.85, 2.0, 1.5, [P(T(d, { size: 10.5, color: C.slate }), { line: 118 })]));
    if (i < 4) s.push(text(x + 2.3, y + 0.95, 0.3, 0.5, [P(T('›', { size: 22, bold: true, color: C.dim }), { align: 'c' })]));
  });
  s.push(rect(0.55, 5.45, 12.25, 1.15, { fill: C.panel2, line: C.violetDk, lw: 1, prst: 'roundRect', radius: 0.12 }));
  s.push(text(0.85, 5.68, 11.7, 0.8, [P([T('Core philosophy:  ', { size: 12.5, bold: true, color: C.violet }), T('concepts before code. Every animation explains an idea, every generated file has a plain-English explanation, and every recommendation shows its reasoning.', { size: 12.5, color: C.slate })])]));
  add(s);
}

/* 5 — feature: learning path */
{
  const s = [];
  s.push(rect(0, 0, 13.333, 7.5, { fill: C.bg }));
  deco(5, TOTAL, s);
  header(s, 'Feature 01', [T('Guided learning path'), T(' — 10 lessons, zero jargon', { color: C.cyan })]);
  const lessons = ['What is an AI agent?', 'How an agent works (the loop)', 'Agent architecture', 'LLMs, tokens & quantization', 'Tools & function calling', 'Memory & context windows', 'RAG & knowledge bases', 'Planning & reasoning', 'APIs vs Local AI', 'Build & test your first agent'];
  lessons.forEach((l, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.55 + col * 3.45, y = 2.15 + row * 0.92;
    s.push(rect(x, y, 3.3, 0.76, { fill: C.panel, line: C.edge, lw: 0.75, prst: 'roundRect', radius: 0.14 }));
    s.push(text(x + 0.15, y + 0.15, 0.5, 0.45, [P(T(String(i + 1).padStart(2, '0'), { size: 13, bold: true, color: C.violet }))]));
    s.push(text(x + 0.62, y + 0.11, 2.6, 0.55, [P(T(l, { size: 11, color: C.white, bold: true }), { line: 105 })]));
  });
  /* right card */
  const x = 7.6, y = 2.15;
  s.push(rect(x, y, 5.2, 4.35, { fill: C.panel, line: C.edge, lw: 1, prst: 'roundRect', radius: 0.05 }));
  s.push(rect(x, y, 5.2, 0.09, { fill: C.cyan }));
  s.push(text(x + 0.3, y + 0.32, 4.6, 0.4, [P(T('How each lesson teaches', { size: 16, bold: true, color: C.white }))]));
  const how = [
    ['Interactive animated diagrams', 'the agent loop cycles, tokens light up, memory fills — drag and watch'],
    ['Plain-language analogies', 'intern, GPS, open-book exam — ideas stick without math'],
    ['2-question understanding checks', 'wrong answers explain themselves; progress saves automatically'],
    ['“Why this matters” callouts', 'every concept tied to a real decision you will make in the builder'],
  ];
  how.forEach(([t, d], i) => {
    const yy = y + 0.95 + i * 0.85;
    s.push(rect(x + 0.3, yy + 0.06, 0.16, 0.16, { fill: C.cyan, prst: 'ellipse' }));
    s.push(text(x + 0.62, yy - 0.02, 4.35, 0.75, [
      P(T(t, { size: 12, bold: true, color: C.white })),
      P(T(d, { size: 10.5, color: C.slate }), { line: 110 }),
    ]));
  });
  add(s);
}

/* 6 — feature: builder */
{
  const s = [];
  s.push(rect(0, 0, 13.333, 7.5, { fill: C.bg }));
  deco(6, TOTAL, s);
  header(s, 'Feature 02', [T('Agent builder wizard'), T(' — from config to runnable code', { color: C.amber })]);
  const steps = ['Identity & purpose', 'Personality + live system prompt', 'Brain: local or API', 'Model picker with device fit badges', 'Tools (function calling)', 'Memory strategy', 'Knowledge base (RAG)', 'Language: Python or JavaScript'];
  steps.forEach((t, i) => {
    const yy = 2.15 + i * 0.56;
    s.push(rect(0.55, yy, 5.3, 0.46, { fill: C.panel, line: C.edge, lw: 0.75, prst: 'roundRect', radius: 0.18 }));
    s.push(text(0.72, yy + 0.07, 0.4, 0.3, [P(T(String(i + 1), { size: 11, bold: true, color: C.amber }))]));
    s.push(text(1.06, yy + 0.065, 4.6, 0.3, [P(T(t, { size: 11, color: C.white }))]));
  });
  const x = 6.25, y = 2.15;
  s.push(rect(x, y, 6.55, 4.35, { fill: C.panel, line: C.edge, lw: 1, prst: 'roundRect', radius: 0.05 }));
  s.push(rect(x, y, 6.55, 0.09, { fill: C.amber }));
  s.push(text(x + 0.3, y + 0.3, 6.0, 0.4, [P(T('The output is a real project, not a snippet', { size: 16, bold: true, color: C.white }))]));
  const outs = [
    ['Complete starter project as ZIP', 'README, dependencies, agent loop, tools, memory, RAG — ready to run'],
    ['Two languages × two brain types', 'Python / JavaScript · local Ollama / 5 API providers with correct SDKs'],
    ['Commented for beginners', 'the 20-line agent loop is explained line by line, in the code'],
    ['“What this file does” panels', 'each generated file pairs with a plain-English learning card'],
    ['Safety built in', 'step limits, tool-failure honesty, API keys via environment variables'],
  ];
  outs.forEach(([t, d], i) => {
    const yy = y + 0.9 + i * 0.68;
    s.push(rect(x + 0.3, yy + 0.05, 0.16, 0.16, { fill: C.amber, prst: 'ellipse' }));
    s.push(text(x + 0.62, yy - 0.02, 5.7, 0.62, [
      P([T(t + ' — ', { size: 11.5, bold: true, color: C.white }), T(d, { size: 11, color: C.slate })]),
    ]));
  });
  add(s);
}

/* 7 — feature: device advisor */
{
  const s = [];
  s.push(rect(0, 0, 13.333, 7.5, { fill: C.bg }));
  deco(7, TOTAL, s);
  header(s, 'Feature 03', [T('Device check + model recommendation engine')]);
  const x1 = 0.55, y = 2.15;
  s.push(rect(x1, y, 5.9, 4.4, { fill: C.panel, line: C.edge, lw: 1, prst: 'roundRect', radius: 0.05 }));
  s.push(rect(x1, y, 5.9, 0.09, { fill: C.cyan }));
  s.push(text(x1 + 0.3, y + 0.28, 5.3, 0.4, [P(T('“Can my device run this model?”', { size: 15.5, bold: true, color: C.white }))]));
  const left = [
    ['Safe browser auto-detection', 'CPU cores, RAM, WebGL GPU name, free storage — no installs, no uploads'],
    ['5 device tiers', 'Basic → Entry → Mid Range → High Performance → AI/Enthusiast'],
    ['16-model database', 'Llama, Qwen, Phi, Gemma, Mistral, DeepSeek — 1B to 70B'],
    ['Quantization aware', 'Q4_K_M and friends, with real RAM/VRAM/storage estimates'],
  ];
  left.forEach(([t, d], i) => {
    const yy = y + 0.85 + i * 0.9;
    s.push(rect(x1 + 0.3, yy + 0.05, 0.16, 0.16, { fill: C.cyan, prst: 'ellipse' }));
    s.push(text(x1 + 0.62, yy - 0.02, 5.05, 0.85, [
      P(T(t, { size: 12.5, bold: true, color: C.white })),
      P(T(d, { size: 10.5, color: C.slate }), { line: 112 }),
    ]));
  });
  const x2 = 6.85;
  s.push(rect(x2, y, 5.95, 4.4, { fill: C.panel, line: C.edge, lw: 1, prst: 'roundRect', radius: 0.05 }));
  s.push(rect(x2, y, 5.95, 0.09, { fill: C.mint }));
  s.push(text(x2 + 0.3, y + 0.28, 5.3, 0.4, [P(T('Recommendations that explain themselves', { size: 15.5, bold: true, color: C.white }))]));
  const right = [
    ['Fit score per model', 'Runs great / Runs well / Tight fit / Too large — from YOUR RAM, VRAM & disk'],
    ['Agent-type matching', 'general, coding, research, RAG, creative — ranked by purpose fit'],
    ['Written reasoning', '“Recommended because your 16 GB RAM covers its 8 GB Q4 quant with headroom”'],
    ['Honest alternatives', 'smaller models suggested when one is too big; free API tiers as fallback'],
  ];
  right.forEach(([t, d], i) => {
    const yy = y + 0.85 + i * 0.9;
    s.push(rect(x2 + 0.3, yy + 0.05, 0.16, 0.16, { fill: C.mint, prst: 'ellipse' }));
    s.push(text(x2 + 0.62, yy - 0.02, 5.05, 0.85, [
      P(T(t, { size: 12.5, bold: true, color: C.white })),
      P(T(d, { size: 10.5, color: C.slate }), { line: 112 }),
    ]));
  });
  add(s);
}

/* 8 — feature: brain choice + platform */
{
  const s = [];
  s.push(rect(0, 0, 13.333, 7.5, { fill: C.bg }));
  deco(8, TOTAL, s);
  header(s, 'More features', [T('Brain choice, resource hub & personal dashboard')]);
  const cards = [
    ['Local vs API brain', C.pink, 'Two honest paths compared head-to-head: privacy, cost, speed, setup. API keys only from official consoles. Your choice flows into the builder.'],
    ['Resource hub', C.cyan, '8 curated categories — models, runtimes, providers, frameworks, vector DBs, courses, beginner projects. Official sources only.'],
    ['Dashboard', C.violet, 'My agents with full configs, device profile + tier, top-3 model matches, lesson progress and quick actions — all browser-local.'],
    ['Architecture visualizer', C.mint, 'After building, an interactive User → Agent → LLM → Tools → Memory → Knowledge → Response map explains each component.'],
  ];
  cards.forEach(([t, c, d], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.55 + col * 6.25, y = 2.25 + row * 2.15;
    s.push(rect(x, y, 5.95, 1.9, { fill: C.panel, line: C.edge, lw: 1, prst: 'roundRect', radius: 0.07 }));
    s.push(rect(x, y, 0.09, 1.9, { fill: c }));
    s.push(text(x + 0.35, y + 0.26, 5.3, 0.4, [P(T(t, { size: 16, bold: true, color: c }))]));
    s.push(text(x + 0.35, y + 0.75, 5.35, 1.05, [P(T(d, { size: 11.5, color: C.slate }), { line: 120 })]));
  });
  add(s);
}

/* 9 — team & roles */
{
  const s = [];
  s.push(rect(0, 0, 13.333, 7.5, { fill: C.bg }));
  deco(9, TOTAL, s);
  header(s, 'Team & roles', [T('Who built what'), T(' — ownership by module', { color: C.violet })], 'Replace placeholder names with your actual team members before presenting.');
  const roles = [
    ['Member 1 (name)', 'Team Lead & Integration', C.violet, ['Project architecture & planning', 'React Router + global state/context', 'Code reviews & final integration']],
    ['Member 2 (name)', 'Frontend Developer', C.cyan, ['Pages: builder, dashboard, resources', 'Forms, wizard logic & validation', 'Responsive layouts']],
    ['Member 3 (name)', 'UI/UX & Motion Design', C.pink, ['Design system (colors, type, tokens)', 'Framer Motion animations & 3D canvas', 'Dark/light theme & accessibility']],
    ['Member 4 (name)', 'Content & Research', C.amber, ['10-lesson learning path & quizzes', 'Model database & hardware data', 'Resource hub curation (official links)']],
    ['Member 5 (name)', 'Data Engines & Testing', C.mint, ['Recommendation & fit algorithm', 'Starter-project code generator', 'QA, syntax validation of generated code']],
  ];
  roles.forEach(([name, role, c, resp], i) => {
    const x = 0.55 + (i % 3) * 4.25, y = i < 3 ? 2.3 : 4.55;
    const w = i < 3 ? 3.95 : 5.95;
    const xx = i < 3 ? x : 0.55 + (i - 3) * 6.25;
    s.push(rect(xx, y, w, 2.05, { fill: C.panel, line: C.edge, lw: 1, prst: 'roundRect', radius: 0.06 }));
    s.push(rect(xx, y, w, 0.07, { fill: c }));
    s.push(text(xx + 0.22, y + 0.2, w - 0.45, 0.3, [P(T(name, { size: 12.5, bold: true, color: C.white }))]));
    s.push(text(xx + 0.22, y + 0.5, w - 0.45, 0.3, [P(T(role.toUpperCase(), { size: 9.5, bold: true, color: c }))]));
    s.push(text(xx + 0.22, y + 0.86, w - 0.4, 1.1, resp.map((r, k) => P(T('• ' + r, { size: 10, color: C.slate }), { spcAft: k === resp.length - 1 ? 0 : 4 }))));
  });
  add(s);
}

/* 10 — tech stack & why */
{
  const s = [];
  s.push(rect(0, 0, 13.333, 7.5, { fill: C.bg }));
  deco(10, TOTAL, s);
  header(s, 'Technology stack', [T('Every technology — and'), T(' why we chose it', { color: C.cyan })]);
  const cols = [[0.55, 2.9, 'TECHNOLOGY'], [3.5, 3.4, 'USED FOR'], [6.95, 5.85, 'WHY WE CHOSE IT']];
  const y0 = 2.1, hh = 0.46, rh = 0.485;
  cols.forEach(([x, w, label]) => {
    s.push(rect(x, y0, w, hh, { fill: C.violetDk }));
    s.push(text(x + 0.12, y0 + 0.09, w - 0.2, 0.3, [P(T(label, { size: 10.5, bold: true, color: C.white }))]));
  });
  const rows = [
    ['React 19 + TypeScript', 'Entire UI & data models', 'Component reuse across 8 pages; types catch errors across the large model/lesson databases'],
    ['Vite + vite-plugin-singlefile', 'Build tooling', 'Instant dev builds; output is ONE portable HTML file — deployable anywhere by drag-and-drop'],
    ['Tailwind CSS v4', 'Design system & theming', 'Token-based design; the dark→light switch flips its CSS palette variables — zero class rewrites'],
    ['Framer Motion', 'All animation', 'Physics springs, shared-element transitions, scroll-linked reveals — motion that explains agent concepts'],
    ['React Router (HashRouter)', 'Client-side navigation', 'URL routing that still works from a single static HTML file — no server rules needed'],
    ['Lucide React', 'Icon system', 'Consistent, lightweight SVG icons; professional look with no emoji and no image assets'],
    ['JSZip (in-browser)', 'Project downloads', 'Users download complete agent starter projects as ZIP — generated 100% client-side'],
    ['Canvas 2D API', '3D neural-sphere hero', 'Hand-rolled 3D particle sphere: the wow of WebGL with zero heavy dependencies'],
    ['localStorage', 'All persistence', 'Agents, progress & device profiles stay private in the browser — no backend, no accounts, no cost'],
  ];
  rows.forEach(([a, b, c], i) => {
    const y = y0 + hh + i * rh;
    const fill = i % 2 === 0 ? C.panel : C.panel2;
    cols.forEach(([x, w]) => s.push(rect(x, y, w, rh, { fill })));
    s.push(text(cols[0][0] + 0.12, y + 0.1, cols[0][1] - 0.2, 0.3, [P(T(a, { size: 10.5, bold: true, color: C.white }))]));
    s.push(text(cols[1][0] + 0.12, y + 0.1, cols[1][1] - 0.2, 0.3, [P(T(b, { size: 10.5, color: C.slate }))]));
    s.push(text(cols[2][0] + 0.12, y + 0.055, cols[2][1] - 0.2, 0.42, [P(T(c, { size: 10, color: C.slate }), { line: 104 })]));
  });
  add(s);
}

/* 11 — architecture */
{
  const s = [];
  s.push(rect(0, 0, 13.333, 7.5, { fill: C.bg }));
  deco(11, TOTAL, s);
  header(s, 'System architecture', [T('Data-driven and future-proof'), T(' — no backend required', { color: C.mint })]);
  const flow = [
    ['Pages (8 routes)', 'Home · Learn · Lesson · Builder · Device · Brain · Resources · Dashboard', C.violet],
    ['Data registries (/data)', 'models · hardware engine · lessons · resources · code generator', C.cyan],
    ['Shared components', 'motion toolkit · diagrams · UI primitives · 3D canvas', C.amber],
    ['Browser localStorage', 'theme · agents · progress · device profile — private by design', C.pink],
  ];
  flow.forEach(([t, d, c], i) => {
    const y = 2.25 + i * 1.12;
    s.push(rect(0.55, y, 5.7, 0.92, { fill: C.panel, line: C.edge, lw: 1, prst: 'roundRect', radius: 0.1 }));
    s.push(rect(0.55, y, 0.09, 0.92, { fill: c }));
    s.push(text(0.85, y + 0.12, 5.2, 0.35, [P(T(t, { size: 13, bold: true, color: c }))]));
    s.push(text(0.85, y + 0.47, 5.2, 0.35, [P(T(d, { size: 10, color: C.slate }))]));
    if (i < 3) s.push(text(3.2, y + 0.86, 0.4, 0.3, [P(T('▾', { size: 13, color: C.dim }), { align: 'c' })]));
  });
  const x = 6.75, y = 2.25;
  s.push(rect(x, y, 6.05, 4.3, { fill: C.panel, line: C.edge, lw: 1, prst: 'roundRect', radius: 0.05 }));
  s.push(text(x + 0.3, y + 0.25, 5.5, 0.4, [P(T('Why this architecture?', { size: 15, bold: true, color: C.white }))]));
  const pts = [
    ['Update without redeploy risk', 'new models, lessons or providers = one data-file edit'],
    ['Single-file deployment', 'the whole app ships as one HTML file — works on any static host, even offline'],
    ['Privacy-first by default', 'no servers, no tracking; hardware specs never leave the device'],
    ['Testable generators', 'output code was syntax-validated (Python AST + Node) for every config combination'],
  ];
  pts.forEach(([t, d], i) => {
    const yy = y + 0.85 + i * 0.88;
    s.push(rect(x + 0.3, yy + 0.05, 0.16, 0.16, { fill: C.mint, prst: 'ellipse' }));
    s.push(text(x + 0.62, yy - 0.02, 5.2, 0.8, [
      P(T(t, { size: 12, bold: true, color: C.white })),
      P(T(d, { size: 10.5, color: C.slate }), { line: 112 }),
    ]));
  });
  add(s);
}

/* 12 — challenges & learnings */
{
  const s = [];
  s.push(rect(0, 0, 13.333, 7.5, { fill: C.bg }));
  deco(12, TOTAL, s);
  header(s, 'Challenges & learnings', [T('What was hard — and what it taught us')]);
  const items = [
    ['Theme without rewrites', C.violet, 'Supporting dark AND light across hundreds of hardcoded classes pushed us to a CSS-variable palette-flip strategy — one override file themes the whole app.'],
    ['Generating correct code', C.amber, 'A code generator for 2 languages × 5 providers × memory modes explodes in combinations — solved with a template pipeline + real syntax validation of every output.'],
    ['Hardware honesty', C.cyan, 'Browsers expose limited specs (privacy). We combine safe detection APIs with a manual-override form, and always show the reasoning behind every fit verdict.'],
    ['Motion with meaning', C.pink, 'We banned decorative animation: every loop, packet and particle demonstrates how agents think. Performance guarded with IntersectionObserver + DPR caps.'],
  ];
  items.forEach(([t, c, d], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.55 + col * 6.25, y = 2.25 + row * 2.2;
    s.push(rect(x, y, 5.95, 1.95, { fill: C.panel, line: C.edge, lw: 1, prst: 'roundRect', radius: 0.07 }));
    s.push(rect(x, y, 5.95, 0.07, { fill: c }));
    s.push(text(x + 0.28, y + 0.28, 5.4, 0.4, [P(T(t, { size: 15, bold: true, color: c }))]));
    s.push(text(x + 0.28, y + 0.78, 5.45, 1.1, [P(T(d, { size: 11, color: C.slate }), { line: 120 })]));
  });
  add(s);
}

/* 13 — future + thanks */
{
  const s = [];
  s.push(rect(0, 0, 13.333, 7.5, { fill: C.bg }));
  s.push(rect(-2.2, -2.6, 7, 7, { fill: C.deco1, prst: 'ellipse' }));
  s.push(rect(9.2, 3.4, 6.4, 6.4, { fill: C.deco2, prst: 'ellipse' }));
  s.push(text(0.85, 0.85, 8, 0.32, [P(T('FUTURE SCOPE & CLOSING', { size: 12, color: C.cyan, bold: true }))]));
  s.push(text(0.82, 1.3, 9.5, 0.9, [P(T('Where AgentForge goes next', { size: 30, bold: true, color: C.white }))]));
  const future = [
    ['Live in-browser agent playground', 'run the generated agent in the page via WebLLM / Wasm inference'],
    ['Deeper hardware profiles', 'benchmark-based speed estimates per GPU and Apple-Silicon tier'],
    ['More tracks & languages', 'multi-agent systems lesson track; Rust/Go starter templates'],
    ['Community agent gallery', 'share configs as links; import an agent from a single URL'],
  ];
  future.forEach(([t, d], i) => {
    const y = 2.35 + i * 0.86;
    s.push(rect(0.85, y, 7.6, 0.72, { fill: C.panel, line: C.edge, lw: 1, prst: 'roundRect', radius: 0.14 }));
    s.push(text(1.05, y + 0.1, 7.2, 0.5, [P([T(t + ' — ', { size: 12, bold: true, color: C.white }), T(d, { size: 11, color: C.slate })])]));
  });
  s.push(rect(0.85, 5.95, 7.6, 1.05, { fill: C.panel, line: C.violetDk, lw: 1.2, prst: 'roundRect', radius: 0.12 }));
  s.push(text(1.1, 6.2, 7.1, 0.6, [P([T('Thank you!  ', { size: 18, bold: true, color: C.violet }), T('Questions & live demo welcome.', { size: 14, color: C.slate })])]));
  s.push(text(9.35, 2.6, 2.6, 2.2, [
    P(T('Agent', { size: 34, bold: true, color: C.violet }), { align: 'c' }),
    P(T('Forge', { size: 34, bold: true, color: C.cyan }), { align: 'c' }),
    P(T('learn · check · choose · build · run', { size: 10, color: C.dim }), { align: 'c', spcBef: 10 }),
  ]));
  s.push(text(0.85, 7.24, 8, 0.24, [P(T(FOOTER_L, { size: 8, color: C.dim }))]));
  s.push(text(11.9, 7.24, 0.9, 0.24, [P(T(`13 / 13`, { size: 8, color: C.dim }), { align: 'r' })]));
  add(s);
}

/* ── OOXML assembly ── */
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';

const slideXml = (shapes) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld ${NS}><p:cSld><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
${shapes.join('\n')}
</p:spTree></p:cSld><p:clrMapOvr><a:overrideClrMapping bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/></p:clrMapOvr></p:sld>`;

const relsXml = (rels) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${rels.map(([id, type, target]) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`).join('\n')}
</Relationships>`;

const sldIds = slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join('');

const presentationXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation ${NS} saveSubsetFonts="1">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
<p:sldIdLst>${sldIds}</p:sldIdLst>
<p:sldSz cx="${SLIDE_W}" cy="${SLIDE_H}" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;

const masterXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster ${NS}><p:cSld><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
</p:spTree></p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
<p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>
</p:sldMaster>`;

const layoutXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout ${NS} type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;

const themeXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="AgentForge">
<a:themeElements>
<a:clrScheme name="AgentForge">
<a:dk1><a:srgbClr val="0B0B16"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
<a:dk2><a:srgbClr val="14142B"/></a:dk2><a:lt2><a:srgbClr val="AEB4CC"/></a:lt2>
<a:accent1><a:srgbClr val="${C.violet}"/></a:accent1><a:accent2><a:srgbClr val="${C.cyan}"/></a:accent2>
<a:accent3><a:srgbClr val="${C.mint}"/></a:accent3><a:accent4><a:srgbClr val="${C.amber}"/></a:accent4>
<a:accent5><a:srgbClr val="${C.pink}"/></a:accent5><a:accent6><a:srgbClr val="${C.rose}"/></a:accent6>
<a:hlink><a:srgbClr val="${C.cyan}"/></a:hlink><a:folHlink><a:srgbClr val="${C.violet}"/></a:folHlink>
</a:clrScheme>
<a:fontScheme name="AgentForge"><a:majorFont><a:latin typeface="${FONT}"/></a:majorFont><a:minorFont><a:latin typeface="${FONT}"/></a:minorFont></a:fontScheme>
<a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>
</a:themeElements></a:theme>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
${slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('\n')}
</Types>`;

/* ── build zip ── */
const zip = new JSZip();
zip.file('[Content_Types].xml', contentTypes);
zip.file('_rels/.rels', relsXml([
  ['rId1', 'officeDocument', 'ppt/presentation.xml'],
]));
zip.file('ppt/presentation.xml', presentationXml);
zip.file('ppt/_rels/presentation.xml.rels', relsXml([
  ['rId1', 'slideMaster', 'slideMasters/slideMaster1.xml'],
  ...slides.map((_, i) => [`rId${i + 2}`, 'slide', `slides/slide${i + 1}.xml`]),
  [`rId${slides.length + 2}`, 'theme', 'theme/theme1.xml'],
]));
zip.file('ppt/slideMasters/slideMaster1.xml', masterXml);
zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels', relsXml([
  ['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'],
  ['rId2', 'theme', '../theme/theme1.xml'],
]));
zip.file('ppt/slideLayouts/slideLayout1.xml', layoutXml);
zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels', relsXml([
  ['rId1', 'slideMaster', '../slideMasters/slideMaster1.xml'],
]));
zip.file('ppt/theme/theme1.xml', themeXml);
slides.forEach((shapes, i) => {
  zip.file(`ppt/slides/slide${i + 1}.xml`, slideXml(shapes));
  zip.file(`ppt/slides/_rels/slide${i + 1}.xml.rels`, relsXml([
    ['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'],
  ]));
});

const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/AgentForge-Training-Presentation.pptx', buf);
fs.writeFileSync('AgentForge-Training-Presentation.pptx', buf);
console.log('PPTX written:', slides.length, 'slides,', (buf.length / 1024).toFixed(1), 'KB');
