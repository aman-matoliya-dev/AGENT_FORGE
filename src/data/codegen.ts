/* ── Starter-project generator ───────────────────────────────────
   Turns an AgentConfig into a complete minimal project with real,
   runnable code — plus beginner explanations for every file. */

import { localModelById, providerById } from './models';
import type { AgentType } from './models';

export type MemoryMode = 'buffer' | 'window' | 'summary';
export type KnowledgeMode = 'none' | 'rag';
export type OutputStyle = 'concise' | 'detailed' | 'steps';

export interface AgentConfig {
  id: string;
  name: string;
  purpose: string;
  personality: string;
  brain: 'local' | 'api';
  agentType: AgentType;
  modelId: string;        // local model id
  providerId: string;     // api provider id
  apiModel: string;       // api model display name
  tools: string[];        // tool ids
  memory: MemoryMode;
  knowledge: KnowledgeMode;
  language: 'python' | 'javascript';
  outputStyle: OutputStyle;
  createdAt: number;
}

export const DEFAULT_CONFIG: Omit<AgentConfig, 'id' | 'createdAt'> = {
  name: '', purpose: '', personality: 'Friendly and patient',
  brain: 'local', agentType: 'general',
  modelId: 'llama32-3b', providerId: 'google', apiModel: 'Gemini 3.6 Flash',
  tools: ['calculator', 'datetime'],
  memory: 'buffer', knowledge: 'none',
  language: 'python', outputStyle: 'concise',
};

export interface ToolDef { id: string; name: string; desc: string; why: string; danger?: boolean }
export const TOOL_CATALOG: ToolDef[] = [
  { id: 'calculator', name: 'Calculator', desc: 'Evaluates math expressions safely', why: 'Models are notoriously bad at arithmetic — a 5-line calculator tool beats a 70B model doing mental math.' },
  { id: 'datetime', name: 'Date & Time', desc: 'Tells the agent the current date/time', why: 'Models have a training cutoff and no clock — “What’s next Friday?” is impossible without this tool.' },
  { id: 'notes', name: 'Notes file', desc: 'Reads & appends to a local notes.txt', why: 'The simplest form of long-term memory: persistence across sessions in a file you own.' },
  { id: 'web_search', name: 'Web search', desc: 'Searches the web for fresh information', why: 'Breaks the training-data wall — the agent can answer about today, not just its training era.' },
];

export const MEMORY_OPTIONS: { id: MemoryMode; name: string; desc: string; why: string }[] = [
  { id: 'buffer', name: 'Full buffer', desc: 'Keeps the entire conversation', why: 'Perfect recall for short sessions; simplest possible code. Best default for learning.' },
  { id: 'window', name: 'Sliding window', desc: 'Keeps the last 10 messages', why: 'Bounded memory usage — the agent never overflows its context window, but forgets old details.' },
  { id: 'summary', name: 'Summary memory', desc: 'Compresses old messages into a running summary', why: 'Keeps the plot of long conversations at a fraction of the tokens. A real-world staple.' },
];

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'my-agent';

export function buildSystemPrompt(c: AgentConfig): string {
  const style = c.outputStyle === 'concise'
    ? 'Keep answers short and direct unless the user asks for more.'
    : c.outputStyle === 'detailed'
    ? 'Give thorough, well-structured answers with examples when helpful.'
    : 'Always reason step by step and show your working before the final answer.';
  return [
    `You are ${c.name || 'Agent'}${c.purpose ? `, an agent whose job is: ${c.purpose}` : ''}.`,
    `Personality: ${c.personality}.`,
    style,
    'Rules:',
    '- Use a tool whenever it gives you real data (math, time, files, search).',
    '- Never invent tool results — if a tool fails, say so and suggest an alternative.',
    '- If the request is outside your purpose, say so politely and offer what you CAN do.',
    '- Prefer being helpful and honest over sounding smart.',
  ].join('\n');
}

export interface ProjectFile {
  path: string;
  lang: string;
  code: string;
  explain: string;   // beginner explanation shown next to the code
  concepts: string[];
}

/* ── provider → concrete SDK wiring ── */
interface ApiWiring { model: string; baseURL?: string; sdk: 'openai' | 'anthropic' }

function apiWiring(c: AgentConfig): ApiWiring {
  const m = c.apiModel;
  switch (c.providerId) {
    case 'openai':
      return { model: m === 'GPT-4o' ? 'gpt-4o' : 'gpt-4o-mini', sdk: 'openai' };
    case 'google':
      return { model: 'gemini-3.6-flash', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', sdk: 'openai' };
    case 'groq':
      return { model: m.includes('70B') ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant', baseURL: 'https://api.groq.com/openai/v1', sdk: 'openai' };
    case 'mistral':
      return { model: m.includes('Large') ? 'mistral-large-latest' : 'mistral-small-latest', baseURL: 'https://api.mistral.ai/v1', sdk: 'openai' };
    case 'openrouter':
      return { model: 'meta-llama/llama-3.3-70b-instruct', baseURL: 'https://openrouter.ai/api/v1', sdk: 'openai' };
    case 'anthropic':
    default:
      return { model: m.includes('Sonnet') ? 'claude-3-5-sonnet-latest' : 'claude-3-5-haiku-latest', sdk: 'anthropic' };
  }
}

/* ─── PYTHON ─── */

function pyTools(c: AgentConfig): string {
  const defs: string[] = [];
  const runners: string[] = [];
  if (c.tools.includes('calculator')) {
    defs.push(`    {
        "type": "function",
        "function": {
            "name": "calculator",
            "description": "Evaluate a math expression. Use for ANY arithmetic.",
            "parameters": {
                "type": "object",
                "properties": {"expression": {"type": "string", "description": "e.g. '18 * 4.99 + 12'"}},
                "required": ["expression"],
            },
        },
    }`);
    runners.push(`def _calculator(expression: str) -> str:
    # Safe-ish eval: only digits, operators and parentheses are allowed.
    allowed = set("0123456789+-*/(). %")
    if not set(expression) <= allowed:
        return "Error: only basic arithmetic is allowed."
    try:
        return str(eval(expression, {"__builtins__": {}}, {}))
    except Exception as exc:
        return f"Error: {exc}"`);
  }
  if (c.tools.includes('datetime')) {
    defs.push(`    {
        "type": "function",
        "function": {
            "name": "current_datetime",
            "description": "Get the current date and time. Use for anything involving 'now', dates or schedules.",
            "parameters": {"type": "object", "properties": {}},
        },
    }`);
    runners.push(`def _current_datetime() -> str:
    from datetime import datetime
    return datetime.now().strftime("%A, %Y-%m-%d %H:%M")`);
  }
  if (c.tools.includes('notes')) {
    defs.push(`    {
        "type": "function",
        "function": {
            "name": "save_note",
            "description": "Save a short note to the agent's notes file for future sessions.",
            "parameters": {
                "type": "object",
                "properties": {"text": {"type": "string", "description": "The note to store"}},
                "required": ["text"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_notes",
            "description": "Read everything the agent previously stored in its notes file.",
            "parameters": {"type": "object", "properties": {}},
        },
    }`);
    runners.push(`NOTES_FILE = "notes.txt"

def _save_note(text: str) -> str:
    with open(NOTES_FILE, "a", encoding="utf-8") as f:
        f.write("- " + text.strip() + "\\n")
    return "Note saved."

def _read_notes() -> str:
    try:
        with open(NOTES_FILE, "r", encoding="utf-8") as f:
            return f.read() or "(no notes yet)"
    except FileNotFoundError:
        return "(no notes yet)"`);
  }
  if (c.tools.includes('web_search')) {
    defs.push(`    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for current information. Use for recent events or facts you don't know.",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string", "description": "Search query"}},
                "required": ["query"],
            },
        },
    }`);
    runners.push(`def _web_search(query: str) -> str:
    # Free, key-less starter: DuckDuckGo instant answers.
    # For richer results swap in Tavily/SerpAPI later — one function to change.
    import requests
    try:
        r = requests.get("https://api.duckduckgo.com/",
                         params={"q": query, "format": "json", "no_html": 1}, timeout=10)
        data = r.json()
        abstract = data.get("AbstractText") or ""
        topics = [t.get("Text", "") for t in data.get("RelatedTopics", []) if isinstance(t, dict)]
        result = abstract or " | ".join([t for t in topics if t][:3])
        return result or "No instant answer found. Try rephrasing the query."
    except Exception as exc:
        return f"Search failed: {exc}"`);
  }

  const dispatch = c.tools.map((t) => {
    if (t === 'calculator') return `    "calculator": lambda a: _calculator(a.get("expression", "")),`;
    if (t === 'datetime') return `    "current_datetime": lambda a: _current_datetime(),`;
    if (t === 'notes') return `    "save_note": lambda a: _save_note(a.get("text", "")),\n    "read_notes": lambda a: _read_notes(),`;
    if (t === 'web_search') return `    "web_search": lambda a: _web_search(a.get("query", "")),`;
    return '';
  }).filter(Boolean).join('\n');

  return `"""Tools — the agent's hands. The model only *requests* these; this file executes them."""

TOOLS = [
${defs.join(',\n') || '    # no tools selected'
}
]

${runners.join('\n\n\n') || '# add tool functions here as you grow'}

RUNNERS = {
${dispatch}
}


def run_tool(name: str, args: dict) -> str:
    fn = RUNNERS.get(name)
    if fn is None:
        return f"Error: unknown tool '{name}'."
    try:
        return fn(args)
    except Exception as exc:
        return f"Tool '{name}' failed: {exc}"
`;
}

function pyMemory(c: AgentConfig): string {
  const body = c.memory === 'window'
    ? `    def add(self, role: str, content: str, **extra):
        self.messages.append({"role": role, "content": content, **extra})
        # Sliding window: keep the newest messages, drop the rest.
        keepers = [m for m in self.messages if m["role"] == "tool"]
        convo = [m for m in self.messages if m["role"] != "tool"]
        self.messages = (convo[-self.limit:] if len(convo) > self.limit else convo) + keepers[-4:]`
    : c.memory === 'summary'
    ? `    def __init__(self, summarizer=None, max_recent: int = 6):
        self.summary = ""
        self.recent: list[dict] = []
        self.max_recent = max_recent
        self._summarizer = summarizer  # function(old_text) -> summary

    def add(self, role: str, content: str, **extra):
        self.recent.append({"role": role, "content": content, **extra})
        if len(self.recent) > self.max_recent and self._summarizer:
            old = self.recent[:-2]
            text = "\\n".join(f"{m['role']}: {m['content']}" for m in old)
            self.summary = self._summarizer((self.summary + "\\n" + text).strip())
            self.recent = self.recent[-2:]`
    : `    def add(self, role: str, content: str, **extra):
        self.messages.append({"role": role, "content": content, **extra})`;

  const header = c.memory === 'window'
    ? `    def __init__(self, limit: int = 10):
        self.limit = limit
        self.messages: list[dict] = []`
    : c.memory === 'summary'
    ? `    # Summary memory: old messages are compressed into a running summary.`
    : `    def __init__(self):
        self.messages: list[dict] = []`;

  const toMessages = c.memory === 'summary'
    ? `    def to_messages(self, system: str) -> list[dict]:
        msgs = [{"role": "system", "content": system}]
        if self.summary:
            msgs.append({"role": "system", "content": "Conversation so far (summary): " + self.summary})
        return msgs + self.recent`
    : `    def to_messages(self, system: str) -> list[dict]:
        return [{"role": "system", "content": system}] + self.messages`;

  const rawStore = c.memory === 'summary' ? 'self.recent' : 'self.messages';
  return `"""Memory — models are stateless, so this class decides what the agent remembers."""

class Memory:
${header}

${body}

    def add_raw(self, msg: dict):
        # Store an assistant message that contains tool_calls, untouched.
        ${rawStore}.append(msg)

${toMessages}
`;
}

function pyRag(): string {
  return `"""Tiny zero-dependency RAG: keyword retrieval over ./knowledge/*.txt,*.md files.
Real systems swap _score() for embedding + vector search — the flow stays identical."""

import os
import re

KNOWLEDGE_DIR = "knowledge"


def _chunks(text: str, size: int = 500) -> list[str]:
    words = text.split()
    return [" ".join(words[i:i + size]) for i in range(0, len(words), size)]


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", text.lower()))


def load_knowledge() -> list[str]:
    chunks: list[str] = []
    if not os.path.isdir(KNOWLEDGE_DIR):
        return chunks
    for fname in os.listdir(KNOWLEDGE_DIR):
        if fname.endswith((".txt", ".md")):
            with open(os.path.join(KNOWLEDGE_DIR, fname), encoding="utf-8") as f:
                chunks.extend(_chunks(f.read()))
    return chunks


def retrieve(question: str, chunks: list[str], k: int = 3) -> list[str]:
    q = _tokenize(question)
    scored = sorted(chunks, key=lambda c: len(q & _tokenize(c)), reverse=True)
    return [c for c in scored[:k] if q & _tokenize(c)]
`;
}

function pyMain(c: AgentConfig): string {
  const model = localModelById(c.modelId);
  const modelName = model ? model.ollama.replace('ollama run ', '') : 'llama3.2:3b';
  const systemPrompt = buildSystemPrompt(c).replace(/"""/g, '\\"\\"\\"');
  const isApi = c.brain === 'api';
  const provider = providerById(c.providerId);

  const w = apiWiring(c);
  const brainCall = isApi
    ? (w.sdk === 'anthropic'
      ? `"""LLM access — API brain via Anthropic (Claude).
Get your key: ${provider?.signupHint ?? ''}"""
import os
import anthropic

client = anthropic.Anthropic(api_key=os.environ.get("API_KEY", "paste-your-key-here"))
MODEL = "${w.model}"

# Claude wants plain tool specs (not the OpenAI wrapper) — tiny converter:
ATOOLS = [{"name": t["function"]["name"],
           "description": t["function"]["description"],
           "input_schema": t["function"]["parameters"]} for t in TOOLS]


def llm(messages: list[dict]) -> dict:
    # Anthropic takes 'system' separately; tool results can ride as user text.
    system = next((m["content"] for m in messages if m["role"] == "system"), "")
    conv = []
    for m in messages:
        if m["role"] == "system":
            continue
        if m["role"] == "tool":
            conv.append({"role": "user",
                         "content": f"Tool '{m.get('name', 'tool')}' returned: {m['content']}"})
        else:
            conv.append({"role": m["role"], "content": m.get("content", "") or ""})
    resp = client.messages.create(model=MODEL, max_tokens=1024, system=system,
                                  messages=conv, tools=ATOOLS or anthropic.NOT_GIVEN,
                                  temperature=0.4)
    text = "".join(b.text for b in resp.content if b.type == "text")
    calls = [{"function": {"name": b.name, "arguments": b.input}}
             for b in resp.content if b.type == "tool_use"]
    msg = {"role": "assistant", "content": text}
    if calls:
        msg["tool_calls"] = calls
    return msg`
      : `"""LLM access — API brain via ${provider?.name ?? 'OpenAI'}.
Get your key: ${provider?.signupHint ?? ''}"""
import os
import json
from openai import OpenAI

client = OpenAI(api_key=os.environ.get("API_KEY", "paste-your-key-here")${w.baseURL ? `,\n              base_url="${w.baseURL}"  # ${provider?.name} speaks the OpenAI protocol` : ''})
MODEL = "${w.model}"


def llm(messages: list[dict]) -> dict:
    resp = client.chat.completions.create(model=MODEL, messages=messages,
                                          tools=TOOLS or None, temperature=0.4)
    m = resp.choices[0].message
    msg = {"role": "assistant", "content": m.content or ""}
    if m.tool_calls:
        msg["tool_calls"] = [{"function": {"name": t.function.name,
                                           "arguments": json.loads(t.function.arguments)}}
                             for t in m.tool_calls]
    return msg`)
    : `"""LLM access — LOCAL brain via Ollama (free, private, offline).
1. Install Ollama from https://ollama.com
2. Pull this model: ${model?.ollama.replace('ollama run', 'ollama pull') ?? 'ollama pull llama3.2:3b'}"""
import requests
import json

MODEL = "${modelName}"
OLLAMA_URL = "http://localhost:11434/api/chat"


def llm(messages: list[dict]) -> dict:
    r = requests.post(OLLAMA_URL, timeout=600, json={
        "model": MODEL, "messages": messages,
        "tools": TOOLS or None, "stream": False,
        "options": {"temperature": 0.4},
    })
    r.raise_for_status()
    return r.json()["message"]`;

  return `"""${c.name || 'my-agent'} — generated by AgentForge.
Purpose: ${c.purpose || 'general assistant'}
The 20-line engine of every agent: think -> act -> observe -> repeat."""

from tools import TOOLS, run_tool
from memory import Memory
${c.knowledge === 'rag' ? 'import rag\n' : ''}
${brainCall}

SYSTEM = """${systemPrompt}"""
MAX_STEPS = 6  # safety stop so the agent always terminates


def ask(memory: Memory, user_text: str) -> str:
${c.knowledge === 'rag' ? `    chunks = rag.retrieve(user_text, KNOWLEDGE)
    if chunks:
        user_text += "\\n\\nContext from my knowledge base:\\n" + "\\n---\\n".join(chunks)
` : ''}    memory.add("user", user_text)
    for step in range(MAX_STEPS):               # the agent loop
        msg = llm(memory.to_messages(SYSTEM))   # 1. THINK
        if msg.get("tool_calls"):               # 2. ACT (model requested tools)
            memory.add_raw(msg)
            for call in msg["tool_calls"]:
                name, args = call["function"]["name"], call["function"]["arguments"]
                if isinstance(args, str):
                    import json as _json
                    args = _json.loads(args)
                print(f"  [tool] {name}({args})")
                result = run_tool(name, args)   # 3. OBSERVE
                print(f"  [result] {result[:120]}")
                memory.add("tool", str(result), name=name)
        else:                                   # no tools requested -> final answer
            memory.add("assistant", msg["content"] or "")
            return msg["content"] or "(empty answer)"
    return "I hit my step limit — try a smaller task or rephrase."


if __name__ == "__main__":
${c.knowledge === 'rag' ? `    KNOWLEDGE = rag.load_knowledge()
    print(f"(loaded {len(KNOWLEDGE)} knowledge chunks from ./knowledge)")
` : ''}    memory = Memory()
    print(f"${c.name || 'Agent'} ready. Type 'quit' to exit.")
    while True:
        user_text = input("\\nyou> ").strip()
        if user_text.lower() in {"quit", "exit"}:
            break
        print(f"\\n${slugify(c.name)}> " + ask(memory, user_text))
`;
}

/* ─── JAVASCRIPT ─── */

function jsTools(c: AgentConfig): string {
  const defs: string[] = [];
  const impls: string[] = [];
  if (c.tools.includes('calculator')) {
    defs.push(`  { type: 'function', function: { name: 'calculator',
    description: 'Evaluate a math expression. Use for ANY arithmetic.',
    parameters: { type: 'object', required: ['expression'],
      properties: { expression: { type: 'string', description: "e.g. '18 * 4.99 + 12'" } } } } }`);
    impls.push(`// Safe-ish eval: whitelisted characters only.
function calculator({ expression }) {
  if (!/^[0-9+\\-*/(). %]+$/.test(expression)) return 'Error: only basic arithmetic is allowed.';
  try { return String(Function('return (' + expression + ')')()); }
  catch (e) { return 'Error: ' + e.message; }
}`);
  }
  if (c.tools.includes('datetime')) {
    defs.push(`  { type: 'function', function: { name: 'current_datetime',
    description: "Get the current date and time. Use for anything involving 'now', dates or schedules.",
    parameters: { type: 'object', properties: {} } } } }`);
    impls.push(`function current_datetime() {
  return new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric',
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}`);
  }
  if (c.tools.includes('notes')) {
    defs.push(`  { type: 'function', function: { name: 'save_note',
    description: "Save a short note to the agent's notes file for future sessions.",
    parameters: { type: 'object', required: ['text'],
      properties: { text: { type: 'string', description: 'The note to store' } } } } },
  { type: 'function', function: { name: 'read_notes',
    description: 'Read everything the agent previously stored in its notes file.',
    parameters: { type: 'object', properties: {} } } } }`);
    impls.push(`import fs from 'node:fs';

function save_note({ text }) {
  fs.appendFileSync('notes.txt', '- ' + text.trim() + '\\n');
  return 'Note saved.';
}
function read_notes() {
  try { return fs.readFileSync('notes.txt', 'utf8') || '(no notes yet)'; }
  catch { return '(no notes yet)'; }
}`);
  }
  if (c.tools.includes('web_search')) {
    defs.push(`  { type: 'function', function: { name: 'web_search',
    description: "Search the web for current information. Use for recent events or facts you don't know.",
    parameters: { type: 'object', required: ['query'],
      properties: { query: { type: 'string', description: 'Search query' } } } } }`);
    impls.push(`// Free, key-less starter: DuckDuckGo instant answers.
// For richer results swap in Tavily/SerpAPI later — one function to change.
async function web_search({ query }) {
  try {
    const url = 'https://api.duckduckgo.com/?format=json&no_html=1&q=' + encodeURIComponent(query);
    const data = await (await fetch(url)).json();
    const topics = (data.RelatedTopics || []).filter(t => t.Text).slice(0, 3).map(t => t.Text);
    return data.AbstractText || topics.join(' | ') || 'No instant answer found. Try rephrasing.';
  } catch (e) { return 'Search failed: ' + e.message; }
}`);
  }
  const dispatch: string[] = [];
  if (c.tools.includes('calculator')) dispatch.push(`  calculator,`);
  if (c.tools.includes('datetime')) dispatch.push(`  current_datetime,`);
  if (c.tools.includes('notes')) dispatch.push(`  save_note, read_notes,`);
  if (c.tools.includes('web_search')) dispatch.push(`  web_search,`);

  return `// Tools — the agent's hands. The model only *requests* these; this file executes them.

export const TOOLS = [
${defs.join(',\n') || "  // no tools selected"}
];

${impls.join('\n\n') || '// add tool functions here as you grow'}

const RUNNERS = {
${dispatch.join('\n')}
};

export async function runTool(name, args) {
  const fn = RUNNERS[name];
  if (!fn) return "Error: unknown tool '" + name + "'.";
  try { return String(await fn(args)); }
  catch (e) { return "Tool '" + name + "' failed: " + e.message; }
}
`;
}

function jsMemory(c: AgentConfig): string {
  const add = c.memory === 'window'
    ? `  add(role, content, extra = {}) {
    this.messages.push({ role, content, ...extra });
    // Sliding window: keep the newest messages, drop the rest.
    const convo = this.messages.filter(m => m.role !== 'tool');
    const tools = this.messages.filter(m => m.role === 'tool');
    this.messages = (convo.length > this.limit ? convo.slice(-this.limit) : convo)
      .concat(tools.slice(-4));
  }`
    : c.memory === 'summary'
    ? `  constructor(summarizer = null, maxRecent = 6) {
    this.summary = '';
    this.recent = [];
    this.maxRecent = maxRecent;
    this.summarizer = summarizer; // async (text) => summary
  }

  async add(role, content, extra = {}) {
    this.recent.push({ role, content, ...extra });
    if (this.recent.length > this.maxRecent && this.summarizer) {
      const old = this.recent.slice(0, -2);
      const text = old.map(m => m.role + ': ' + m.content).join('\\n');
      this.summary = await this.summarizer((this.summary + '\\n' + text).trim());
      this.recent = this.recent.slice(-2);
    }
  }`
    : `  add(role, content, extra = {}) {
    this.messages.push({ role, content, ...extra });
  }`;
  const init = c.memory === 'buffer'
    ? `  constructor() { this.messages = []; }`
    : c.memory === 'window'
    ? `  constructor(limit = 10) { this.limit = limit; this.messages = []; }`
    : '';
  const toMessages = c.memory === 'summary'
    ? `  toMessages(system) {
    const msgs = [{ role: 'system', content: system }];
    if (this.summary) msgs.push({ role: 'system', content: 'Conversation so far (summary): ' + this.summary });
    return msgs.concat(this.recent);
  }`
    : `  toMessages(system) {
    return [{ role: 'system', content: system }].concat(this.messages);
  }`;
  const rawStore = c.memory === 'summary' ? 'this.recent' : 'this.messages';
  return `// Memory — models are stateless, so this class decides what the agent remembers.

export class Memory {
${init}
${add}

  addRaw(msg) {
    // Store an assistant message that contains tool_calls, untouched.
    ${rawStore}.push(msg);
  }

${toMessages}
}
`;
}

function jsRag(): string {
  return `// Tiny zero-dependency RAG: keyword retrieval over ./knowledge/*.txt,*.md files.
// Real systems swap score() for embedding + vector search — the flow stays identical.

import fs from 'node:fs';
import path from 'node:path';

const KNOWLEDGE_DIR = 'knowledge';

function chunkText(text, size = 120) {
  const words = text.split(/\\s+/);
  const out = [];
  for (let i = 0; i < words.length; i += size) out.push(words.slice(i, i + size).join(' '));
  return out;
}

const tokenize = t => new Set((t.toLowerCase().match(/[a-z0-9]+/g) || []));

export function loadKnowledge() {
  if (!fs.existsSync(KNOWLEDGE_DIR)) return [];
  const chunks = [];
  for (const f of fs.readdirSync(KNOWLEDGE_DIR)) {
    if (f.endsWith('.txt') || f.endsWith('.md'))
      chunks.push(...chunkText(fs.readFileSync(path.join(KNOWLEDGE_DIR, f), 'utf8')));
  }
  return chunks;
}

export function retrieve(question, chunks, k = 3) {
  const q = tokenize(question);
  const overlap = c => [...tokenize(c)].filter(w => q.has(w)).length;
  return chunks.map(c => [overlap(c), c]).filter(([s]) => s > 0)
    .sort((a, b) => b[0] - a[0]).slice(0, k).map(([, c]) => c);
}
`;
}

function jsMain(c: AgentConfig): string {
  const model = localModelById(c.modelId);
  const modelName = model ? model.ollama.replace('ollama run ', '') : 'llama3.2:3b';
  const isApi = c.brain === 'api';
  const provider = providerById(c.providerId);
  const systemPrompt = JSON.stringify(buildSystemPrompt(c));

  const w = apiWiring(c);
  const brainCall = isApi
    ? (w.sdk === 'anthropic'
      ? `// LLM access — API brain via Anthropic (Claude).
// Get your key: ${provider?.signupHint ?? ''}
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.API_KEY || 'paste-your-key-here' });
const MODEL = '${w.model}';

// Claude wants plain tool specs (not the OpenAI wrapper) — tiny converter:
const ATOOLS = TOOLS.map(t => ({ name: t.function.name,
  description: t.function.description, input_schema: t.function.parameters }));

async function llm(messages) {
  // Anthropic takes 'system' separately; tool results can ride as user text.
  const sys = (messages.find(m => m.role === 'system') || {}).content || '';
  const conv = messages.filter(m => m.role !== 'system').map(m =>
    m.role === 'tool'
      ? { role: 'user', content: "Tool '" + (m.name || 'tool') + "' returned: " + m.content }
      : { role: m.role, content: m.content || '' });
  const resp = await client.messages.create({
    model: MODEL, max_tokens: 1024, system: sys, messages: conv,
    tools: ATOOLS.length ? ATOOLS : undefined, temperature: 0.4 });
  const msg = { role: 'assistant', content: resp.content.filter(b => b.type === 'text').map(b => b.text).join('') };
  const calls = resp.content.filter(b => b.type === 'tool_use');
  if (calls.length) msg.tool_calls = calls.map(b => ({ function: { name: b.name, arguments: b.input } }));
  return msg;
}`
      : `// LLM access — API brain via ${provider?.name ?? 'OpenAI'}.
// Get your key: ${provider?.signupHint ?? ''}
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.API_KEY || 'paste-your-key-here'${w.baseURL ? `,\n  baseURL: '${w.baseURL}', // ${provider?.name} speaks the OpenAI protocol` : ''} });
const MODEL = '${w.model}';

async function llm(messages) {
  const resp = await client.chat.completions.create({
    model: MODEL, messages, tools: TOOLS.length ? TOOLS : undefined, temperature: 0.4,
  });
  const m = resp.choices[0].message;
  const msg = { role: 'assistant', content: m.content || '' };
  if (m.tool_calls) msg.tool_calls = m.tool_calls.map(t => ({
    function: { name: t.function.name, arguments: JSON.parse(t.function.arguments) },
  }));
  return msg;
}`)
    : `// LLM access — LOCAL brain via Ollama (free, private, offline).
// 1. Install Ollama from https://ollama.com
// 2. Pull this model: ${model?.ollama.replace('ollama run', 'ollama pull') ?? 'ollama pull llama3.2:3b'}
const MODEL = '${modelName}';
const OLLAMA_URL = 'http://localhost:11434/api/chat';

async function llm(messages) {
  const r = await fetch(OLLAMA_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages,
      tools: TOOLS.length ? TOOLS : undefined, stream: false,
      options: { temperature: 0.4 } }),
  });
  const data = await r.json();
  return data.message;
}`;

  return `// ${c.name || 'my-agent'} — generated by AgentForge.
// Purpose: ${c.purpose || 'general assistant'}
// The engine of every agent: think -> act -> observe -> repeat.

import readline from 'node:readline';
import { TOOLS, runTool } from './tools.js';
import { Memory } from './memory.js';
${c.knowledge === 'rag' ? "import { loadKnowledge, retrieve } from './rag.js';\n" : ''}${brainCall}

const SYSTEM = ${systemPrompt};
const MAX_STEPS = 6; // safety stop so the agent always terminates

async function ask(memory, userText) {
${c.knowledge === 'rag' ? `  const chunks = retrieve(userText, KNOWLEDGE);
  if (chunks.length) userText += '\\n\\nContext from my knowledge base:\\n' + chunks.join('\\n---\\n');
` : ''}  memory.add('user', userText);
  for (let step = 0; step < MAX_STEPS; step++) {   // the agent loop
    const msg = await llm(memory.toMessages(SYSTEM)); // 1. THINK
    if (msg.tool_calls && msg.tool_calls.length) {   // 2. ACT
      memory.addRaw(msg);
      for (const call of msg.tool_calls) {
        const { name } = call.function;
        let args = call.function.arguments;
        if (typeof args === 'string') args = JSON.parse(args || '{}');
        console.log('  [tool] ' + name + '(' + JSON.stringify(args) + ')');
        const result = await runTool(name, args);    // 3. OBSERVE
        console.log('  [result] ' + result.slice(0, 120));
        memory.add('tool', String(result), { name });
      }
    } else {                                         // final answer
      memory.add('assistant', msg.content || '');
      return msg.content || '(empty answer)';
    }
  }
  return 'I hit my step limit — try a smaller task or rephrase.';
}

${c.knowledge === 'rag' ? 'const KNOWLEDGE = loadKnowledge();\nconsole.log("(loaded " + KNOWLEDGE.length + " knowledge chunks from ./knowledge)");\n' : ''}const memory = new Memory();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log('${(c.name || 'Agent').replace(/'/g, "\\'")} ready. Type "quit" to exit.');
rl.setPrompt('\\nyou> ');
rl.prompt();
rl.on('line', async line => {
  const text = line.trim();
  if (text === 'quit' || text === 'exit') return rl.close();
  if (text) console.log('\\n${slugify(c.name)}> ' + (await ask(memory, text)));
  rl.prompt();
});
`;
}

/* ─── Docs + meta files ─── */

function readme(c: AgentConfig): string {
  const isPy = c.language === 'python';
  const isApi = c.brain === 'api';
  const model = localModelById(c.modelId);
  const provider = providerById(c.providerId);
  return `# ${c.name || 'my-agent'}

> ${c.purpose || 'A small AI agent'} — starter project generated by **AgentForge**.

## What this is
A complete, minimal AI agent you can actually run, read and modify. Every file is
commented for beginners. The agent loop lives in \`${isPy ? 'agent.py' : 'agent.js'}\` —
it thinks, calls tools, observes results, and repeats until it can answer.

## Setup
${isApi
  ? `1. Get an API key — ${provider?.signupHint ?? 'from your provider console'}
2. ${isPy ? 'python -m venv .venv && source .venv/bin/activate  (Windows: .venv\\Scripts\\activate)' : 'Use Node.js 18 or newer'}
3. ${isPy ? 'pip install -r requirements.txt' : 'npm install'}
4. export API_KEY=your-key-here   (Windows PowerShell: $env:API_KEY="...")
5. ${isPy ? 'python agent.py' : 'node agent.js'}`
  : `1. Install Ollama from https://ollama.com  (or LM Studio for a GUI)
2. ${model?.ollama.replace('ollama run', 'ollama pull') ?? 'ollama pull llama3.2:3b'}
3. ${isPy ? 'python -m venv .venv && source .venv/bin/activate, then pip install -r requirements.txt' : 'Use Node.js 18 or newer — no other dependencies for a local brain'}
4. ${isPy ? 'python agent.py' : 'node agent.js'}`}

## Try asking
- "What is 18% of 249.99 plus 3?"${c.tools.includes('datetime') ? '\n- "What day of the week is today?"' : ''}${c.tools.includes('notes') ? '\n- "Remember that my exam is on the 12th" then restart and ask "when is my exam?"' : ''}${c.tools.includes('web_search') ? '\n- "Search the web for today\'s AI news and summarise"' : ''}

## Where to go next
- Add a tool: copy any function in \`${isPy ? 'tools.py' : 'tools.js'}\` — name, description, parameters.
- Read the trace: every \`[tool]\` line is the agent deciding to act.
- Swap the brain: local ↔ API changes only the \`llm()\` function.
`;
}

export function generateProject(c: AgentConfig): ProjectFile[] {
  const slug = slugify(c.name);
  const isPy = c.language === 'python';
  const isApi = c.brain === 'api';
  const files: ProjectFile[] = [];

  files.push({
    path: `${slug}/README.md`, lang: 'markdown', code: readme(c),
    explain: 'Your runway: what this project is, how to install everything, and suggested first prompts. Start here.',
    concepts: ['project setup', 'running an agent'],
  });

  if (isPy) {
    files.push({
      path: `${slug}/requirements.txt`, lang: 'plaintext',
      code: isApi
        ? (apiWiring(c).sdk === 'anthropic' ? 'anthropic>=0.39.0\nrequests>=2.31.0' : 'openai>=1.40.0\nrequests>=2.31.0')
        : 'requests>=2.31.0',
      explain: 'Python dependencies. For a local Ollama brain you only need "requests" — the model itself runs in Ollama, outside your code.',
      concepts: ['dependencies'],
    });
  } else {
    files.push({
      path: `${slug}/package.json`, lang: 'json',
      code: JSON.stringify({
        name: slug, version: '1.0.0', type: 'module', private: true,
        scripts: { start: 'node agent.js' },
        dependencies: c.brain === 'api'
          ? (apiWiring(c).sdk === 'anthropic' ? { '@anthropic-ai/sdk': '^0.32.0' } : { openai: '^4.60.0' })
          : {},
      }, null, 2),
      explain: c.brain === 'api'
        ? 'Node project manifest — the only dependency is the provider SDK.'
        : 'Node project manifest. Fun fact: a LOCAL brain needs zero dependencies — the agent talks to Ollama over plain HTTP.',
      concepts: ['dependencies', 'npm'],
    });
  }

  files.push({
    path: `${slug}/${isPy ? 'agent.py' : 'agent.js'}`, lang: isPy ? 'python' : 'javascript',
    code: isPy ? pyMain(c) : jsMain(c),
    explain: 'The heart of your agent: the think → act → observe loop from Lesson 2, plus the brain connector ('
      + (isApi ? `${providerById(c.providerId)?.name} API` : 'local Ollama') + '). Read top to bottom — it is shorter than it looks.',
    concepts: ['agent loop', 'system prompt', isApi ? 'API calls' : 'local inference', 'step limits'],
  });

  files.push({
    path: `${slug}/${isPy ? 'tools.' + (isPy ? 'py' : 'js') : 'tools.js'}`, lang: isPy ? 'python' : 'javascript',
    code: isPy ? pyTools(c) : jsTools(c),
    explain: 'Every tool your agent can use, in the two-part pattern from Lesson 5: a JSON definition the model reads, and a plain function your code runs.',
    concepts: ['function calling', 'tool schemas', 'least privilege'],
  });

  files.push({
    path: `${slug}/${isPy ? 'memory.py' : 'memory.js'}`, lang: isPy ? 'python' : 'javascript',
    code: isPy ? pyMemory(c) : jsMemory(c),
    explain: `Memory strategy: “${MEMORY_OPTIONS.find((m) => m.id === c.memory)?.name}”. ${MEMORY_OPTIONS.find((m) => m.id === c.memory)?.why}`,
    concepts: ['memory', 'context window'],
  });

  if (c.knowledge === 'rag') {
    files.push({
      path: `${slug}/${isPy ? 'rag.py' : 'rag.js'}`, lang: isPy ? 'python' : 'javascript',
      code: isPy ? pyRag() : jsRag(),
      explain: 'A working mini-RAG with zero dependencies: it chunks text files in ./knowledge and retrieves relevant passages by keyword overlap, injected as context before answering. Upgrade the scoring to embeddings later — same architecture.',
      concepts: ['RAG', 'chunking', 'retrieval'],
    });
  }

  return files;
}
