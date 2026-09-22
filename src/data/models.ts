/* ── Model database ──────────────────────────────────────────────
   Central, updatable registry of local models, API providers and
   runtimes. All requirements are conservative real-world estimates
   for the recommended quantization. Add new entries freely — the
   recommendation engine reads everything from this file. */

export type AgentType = 'general' | 'coding' | 'research' | 'rag' | 'creative';

export const AGENT_TYPES: { id: AgentType; label: string; blurb: string }[] = [
  { id: 'general',  label: 'General Assistant', blurb: 'Answers questions, chats, helps with everyday tasks' },
  { id: 'coding',   label: 'Coding Agent',      blurb: 'Writes, explains and debugs code' },
  { id: 'research', label: 'Research Agent',    blurb: 'Multi-step reasoning, summarising and analysis' },
  { id: 'rag',      label: 'RAG / Knowledge Agent', blurb: 'Answers from your documents with a long memory' },
  { id: 'creative', label: 'Creative Writer',   blurb: 'Stories, tone, style and long-form writing' },
];

export interface Quant {
  name: string;        // e.g. Q4_K_M
  sizeGB: number;      // download size
  ramGB: number;       // comfortable RAM (or unified memory) needed
  note: string;
}

export interface LocalModel {
  id: string;
  name: string;
  maker: string;
  params: string;          // "8B"
  tagline: string;
  bestFor: AgentType[];
  context: string;
  quants: Quant[];
  recommendedQuant: string;      // quant name used by the engine
  minRamGB: number;
  recRamGB: number;
  minVramGB: number;             // for full GPU offload at rec quant
  storageGB: number;
  speed: 1 | 2 | 3 | 4 | 5;      // relative tokens/sec feel
  quality: 1 | 2 | 3 | 4 | 5;    // answer quality feel
  runtimes: string[];            // runtime ids
  ollama: string;                // ollama run command
  source: string;                // official / huggingface url
  license: string;
}

export const LOCAL_MODELS: LocalModel[] = [
  {
    id: 'llama32-1b', name: 'Llama 3.2 1B', maker: 'Meta', params: '1B',
    tagline: 'Tiny and fast — the “hello world” of local models.',
    bestFor: ['general'], context: '128K',
    quants: [
      { name: 'Q4_K_M', sizeGB: 0.8, ramGB: 2, note: 'Best balance' },
      { name: 'Q8_0',   sizeGB: 1.3, ramGB: 3, note: 'Higher quality' },
    ],
    recommendedQuant: 'Q4_K_M',
    minRamGB: 2, recRamGB: 4, minVramGB: 2, storageGB: 1,
    speed: 5, quality: 2,
    runtimes: ['ollama', 'lmstudio', 'jan', 'gpt4all'],
    ollama: 'ollama run llama3.2:1b',
    source: 'https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct',
    license: 'Llama 3.2 Community License',
  },
  {
    id: 'llama32-3b', name: 'Llama 3.2 3B', maker: 'Meta', params: '3B',
    tagline: 'Surprisingly capable small model, great first agent brain.',
    bestFor: ['general', 'creative'], context: '128K',
    quants: [
      { name: 'Q4_K_M', sizeGB: 2.0, ramGB: 4, note: 'Best balance' },
      { name: 'Q8_0',   sizeGB: 3.4, ramGB: 6, note: 'Higher quality' },
    ],
    recommendedQuant: 'Q4_K_M',
    minRamGB: 4, recRamGB: 6, minVramGB: 3, storageGB: 2.5,
    speed: 5, quality: 3,
    runtimes: ['ollama', 'lmstudio', 'jan', 'gpt4all'],
    ollama: 'ollama run llama3.2:3b',
    source: 'https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct',
    license: 'Llama 3.2 Community License',
  },
  {
    id: 'qwen25-3b', name: 'Qwen 2.5 3B', maker: 'Alibaba', params: '3B',
    tagline: 'Strong reasoning in a small package, very tool-friendly.',
    bestFor: ['general', 'rag', 'research'], context: '32K',
    quants: [
      { name: 'Q4_K_M', sizeGB: 1.9, ramGB: 4, note: 'Best balance' },
      { name: 'Q5_K_M', sizeGB: 2.3, ramGB: 5, note: 'A little smarter' },
    ],
    recommendedQuant: 'Q4_K_M',
    minRamGB: 4, recRamGB: 6, minVramGB: 3, storageGB: 2.5,
    speed: 5, quality: 3,
    runtimes: ['ollama', 'lmstudio', 'jan'],
    ollama: 'ollama run qwen2.5:3b',
    source: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF',
    license: 'Apache 2.0',
  },
  {
    id: 'phi35-mini', name: 'Phi-3.5 Mini', maker: 'Microsoft', params: '3.8B',
    tagline: 'Microsoft’s efficiency champion — great on laptops.',
    bestFor: ['general', 'research'], context: '128K',
    quants: [
      { name: 'Q4_K_M', sizeGB: 2.4, ramGB: 5, note: 'Best balance' },
      { name: 'Q6_K',   sizeGB: 3.1, ramGB: 6, note: 'Higher quality' },
    ],
    recommendedQuant: 'Q4_K_M',
    minRamGB: 5, recRamGB: 8, minVramGB: 4, storageGB: 3,
    speed: 4, quality: 3,
    runtimes: ['ollama', 'lmstudio', 'jan'],
    ollama: 'ollama run phi3.5',
    source: 'https://huggingface.co/microsoft/Phi-3.5-mini-instruct',
    license: 'MIT',
  },
  {
    id: 'gemma3-4b', name: 'Gemma 3 4B', maker: 'Google', params: '4B',
    tagline: 'Google’s compact all-rounder with a huge context window.',
    bestFor: ['general', 'rag', 'creative'], context: '128K',
    quants: [
      { name: 'Q4_K_M', sizeGB: 2.5, ramGB: 5, note: 'Best balance' },
      { name: 'Q8_0',   sizeGB: 4.5, ramGB: 7, note: 'Higher quality' },
    ],
    recommendedQuant: 'Q4_K_M',
    minRamGB: 5, recRamGB: 8, minVramGB: 4, storageGB: 3,
    speed: 4, quality: 3,
    runtimes: ['ollama', 'lmstudio', 'jan'],
    ollama: 'ollama run gemma3:4b',
    source: 'https://huggingface.co/google/gemma-3-4b-it',
    license: 'Gemma Terms of Use',
  },
  {
    id: 'mistral-7b', name: 'Mistral 7B v0.3', maker: 'Mistral AI', params: '7B',
    tagline: 'The classic — native function calling, battle-tested.',
    bestFor: ['general', 'research'], context: '32K',
    quants: [
      { name: 'Q4_K_M', sizeGB: 4.4, ramGB: 8, note: 'Best balance' },
      { name: 'Q6_K',   sizeGB: 5.9, ramGB: 10, note: 'Higher quality' },
    ],
    recommendedQuant: 'Q4_K_M',
    minRamGB: 8, recRamGB: 12, minVramGB: 6, storageGB: 5,
    speed: 4, quality: 3,
    runtimes: ['ollama', 'lmstudio', 'jan', 'gpt4all'],
    ollama: 'ollama run mistral:7b',
    source: 'https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3',
    license: 'Apache 2.0',
  },
  {
    id: 'llama31-8b', name: 'Llama 3.1 8B', maker: 'Meta', params: '8B',
    tagline: 'The sweet spot — excellent general agent brain with 128K context.',
    bestFor: ['general', 'research', 'rag', 'creative'], context: '128K',
    quants: [
      { name: 'Q4_K_M', sizeGB: 4.9, ramGB: 8, note: 'Best balance' },
      { name: 'Q6_K',   sizeGB: 6.6, ramGB: 10, note: 'Sharper answers' },
      { name: 'Q8_0',   sizeGB: 8.5, ramGB: 12, note: 'Near full quality' },
    ],
    recommendedQuant: 'Q4_K_M',
    minRamGB: 8, recRamGB: 12, minVramGB: 7, storageGB: 6,
    speed: 3, quality: 4,
    runtimes: ['ollama', 'lmstudio', 'jan', 'gpt4all'],
    ollama: 'ollama run llama3.1:8b',
    source: 'https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct',
    license: 'Llama 3.1 Community License',
  },
  {
    id: 'qwen25-7b', name: 'Qwen 2.5 7B', maker: 'Alibaba', params: '7B',
    tagline: 'Brilliant at following structured instructions and tools.',
    bestFor: ['general', 'research', 'rag'], context: '128K',
    quants: [
      { name: 'Q4_K_M', sizeGB: 4.7, ramGB: 8, note: 'Best balance' },
      { name: 'Q6_K',   sizeGB: 6.3, ramGB: 10, note: 'Sharper answers' },
    ],
    recommendedQuant: 'Q4_K_M',
    minRamGB: 8, recRamGB: 12, minVramGB: 6, storageGB: 6,
    speed: 3, quality: 4,
    runtimes: ['ollama', 'lmstudio', 'jan'],
    ollama: 'ollama run qwen2.5:7b',
    source: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF',
    license: 'Apache 2.0',
  },
  {
    id: 'qwen25-coder-7b', name: 'Qwen 2.5 Coder 7B', maker: 'Alibaba', params: '7B',
    tagline: 'The go-to local coding brain — rivals much larger models.',
    bestFor: ['coding'], context: '128K',
    quants: [
      { name: 'Q4_K_M', sizeGB: 4.7, ramGB: 8, note: 'Best balance' },
      { name: 'Q6_K',   sizeGB: 6.3, ramGB: 10, note: 'Sharper code' },
    ],
    recommendedQuant: 'Q4_K_M',
    minRamGB: 8, recRamGB: 12, minVramGB: 6, storageGB: 6,
    speed: 3, quality: 4,
    runtimes: ['ollama', 'lmstudio', 'jan'],
    ollama: 'ollama run qwen2.5-coder:7b',
    source: 'https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF',
    license: 'Apache 2.0',
  },
  {
    id: 'deepseek-r1-8b', name: 'DeepSeek-R1 Distill 8B', maker: 'DeepSeek', params: '8B',
    tagline: 'A reasoning model that “thinks out loud” before answering.',
    bestFor: ['research'], context: '64K',
    quants: [
      { name: 'Q4_K_M', sizeGB: 4.9, ramGB: 8, note: 'Best balance' },
      { name: 'Q6_K',   sizeGB: 6.6, ramGB: 10, note: 'Deeper reasoning' },
    ],
    recommendedQuant: 'Q4_K_M',
    minRamGB: 8, recRamGB: 12, minVramGB: 7, storageGB: 6,
    speed: 2, quality: 4,
    runtimes: ['ollama', 'lmstudio'],
    ollama: 'ollama run deepseek-r1:8b',
    source: 'https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Llama-8B',
    license: 'MIT',
  },
  {
    id: 'phi4-14b', name: 'Phi-4 14B', maker: 'Microsoft', params: '14B',
    tagline: 'Exceptional reasoning-per-gigabyte, great for study agents.',
    bestFor: ['research', 'coding', 'general'], context: '16K',
    quants: [
      { name: 'Q4_K_M', sizeGB: 9.1, ramGB: 14, note: 'Best balance' },
      { name: 'Q6_K',   sizeGB: 12.1, ramGB: 18, note: 'Sharper answers' },
    ],
    recommendedQuant: 'Q4_K_M',
    minRamGB: 14, recRamGB: 20, minVramGB: 11, storageGB: 10,
    speed: 2, quality: 4,
    runtimes: ['ollama', 'lmstudio'],
    ollama: 'ollama run phi4',
    source: 'https://huggingface.co/microsoft/phi-4',
    license: 'MIT',
  },
  {
    id: 'qwen25-14b', name: 'Qwen 2.5 14B', maker: 'Alibaba', params: '14B',
    tagline: 'Step-up intelligence for serious research and RAG agents.',
    bestFor: ['research', 'rag', 'general'], context: '128K',
    quants: [
      { name: 'Q4_K_M', sizeGB: 9.0, ramGB: 14, note: 'Best balance' },
      { name: 'Q5_K_M', sizeGB: 10.6, ramGB: 16, note: 'Sharper answers' },
    ],
    recommendedQuant: 'Q4_K_M',
    minRamGB: 14, recRamGB: 20, minVramGB: 11, storageGB: 10,
    speed: 2, quality: 4,
    runtimes: ['ollama', 'lmstudio'],
    ollama: 'ollama run qwen2.5:14b',
    source: 'https://huggingface.co/Qwen/Qwen2.5-14B-Instruct-GGUF',
    license: 'Apache 2.0',
  },
  {
    id: 'qwen25-coder-32b', name: 'Qwen 2.5 Coder 32B', maker: 'Alibaba', params: '32B',
    tagline: 'Local coding performance that approaches frontier models.',
    bestFor: ['coding', 'research'], context: '128K',
    quants: [
      { name: 'Q4_K_M', sizeGB: 19.9, ramGB: 28, note: 'Best balance' },
      { name: 'Q5_K_M', sizeGB: 23.2, ramGB: 32, note: 'Sharper code' },
    ],
    recommendedQuant: 'Q4_K_M',
    minRamGB: 28, recRamGB: 36, minVramGB: 22, storageGB: 22,
    speed: 2, quality: 5,
    runtimes: ['ollama', 'lmstudio', 'vllm'],
    ollama: 'ollama run qwen2.5-coder:32b',
    source: 'https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct-GGUF',
    license: 'Apache 2.0',
  },
  {
    id: 'qwen25-32b', name: 'Qwen 2.5 32B', maker: 'Alibaba', params: '32B',
    tagline: 'Heavyweight open model for demanding agent workflows.',
    bestFor: ['research', 'rag', 'general'], context: '128K',
    quants: [
      { name: 'Q4_K_M', sizeGB: 19.9, ramGB: 28, note: 'Best balance' },
      { name: 'Q5_K_M', sizeGB: 23.2, ramGB: 32, note: 'Sharper answers' },
    ],
    recommendedQuant: 'Q4_K_M',
    minRamGB: 28, recRamGB: 36, minVramGB: 22, storageGB: 22,
    speed: 2, quality: 5,
    runtimes: ['ollama', 'lmstudio', 'vllm'],
    ollama: 'ollama run qwen2.5:32b',
    source: 'https://huggingface.co/Qwen/Qwen2.5-32B-Instruct-GGUF',
    license: 'Apache 2.0',
  },
  {
    id: 'llama33-70b', name: 'Llama 3.3 70B', maker: 'Meta', params: '70B',
    tagline: 'Frontier-class open weights — needs a serious machine.',
    bestFor: ['research', 'rag', 'general', 'creative'], context: '128K',
    quants: [
      { name: 'Q4_K_M', sizeGB: 42.5, ramGB: 56, note: 'Best balance' },
      { name: 'Q5_K_M', sizeGB: 49.9, ramGB: 64, note: 'Sharper answers' },
    ],
    recommendedQuant: 'Q4_K_M',
    minRamGB: 56, recRamGB: 72, minVramGB: 44, storageGB: 45,
    speed: 1, quality: 5,
    runtimes: ['ollama', 'lmstudio', 'vllm'],
    ollama: 'ollama run llama3.3:70b',
    source: 'https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct',
    license: 'Llama 3.3 Community License',
  },
];

/* ── Cloud / API providers ── */

export interface ApiProvider {
  id: string;
  name: string;
  tagline: string;
  models: { name: string; note: string; bestFor: AgentType[] }[];
  freeTier: string;
  pricingNote: string;
  getKeyUrl: string;
  docsUrl: string;
  signupHint: string;
  sdkPy: string;
  sdkJs: string;
}

export const API_PROVIDERS: ApiProvider[] = [
  {
    id: 'openai', name: 'OpenAI', tagline: 'GPT-4o family — the most popular agent brains.',
    models: [
      { name: 'GPT-4o mini', note: 'Cheap, fast, great first agent', bestFor: ['general', 'rag', 'creative'] },
      { name: 'GPT-4o', note: 'Strong all-round reasoning and tools', bestFor: ['general', 'research', 'coding', 'rag'] },
    ],
    freeTier: 'Free credits for new accounts (varies by region)',
    pricingNote: 'Pay per token. GPT-4o mini is one of the cheapest quality models — a typical agent chat costs fractions of a cent.',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    docsUrl: 'https://platform.openai.com/docs',
    signupHint: 'platform.openai.com → API keys → Create new secret key',
    sdkPy: 'openai', sdkJs: 'openai',
  },
  {
    id: 'anthropic', name: 'Anthropic', tagline: 'Claude — careful reasoning and excellent coding.',
    models: [
      { name: 'Claude Haiku', note: 'Fast and affordable', bestFor: ['general', 'rag'] },
      { name: 'Claude Sonnet', note: 'Superb coding & agentic reasoning', bestFor: ['coding', 'research', 'general'] },
    ],
    freeTier: 'Occasional free credit promotions',
    pricingNote: 'Pay per token. Haiku is budget-friendly; Sonnet costs more but is a favourite for coding agents.',
    getKeyUrl: 'https://console.anthropic.com/settings/keys',
    docsUrl: 'https://docs.anthropic.com',
    signupHint: 'console.anthropic.com → Settings → API Keys',
    sdkPy: 'anthropic', sdkJs: '@anthropic-ai/sdk',
  },
  {
    id: 'google', name: 'Google AI (Gemini)', tagline: 'Generous free tier and giant context windows.',
    models: [
      { name: 'Gemini 3.6 Flash', note: 'Fast, current stable Gemini runtime', bestFor: ['general', 'rag', 'research'] },
    ],
    freeTier: 'Free tier with rate limits — the easiest way to start for $0',
    pricingNote: 'Free tier for light use; paid usage is per token and very competitive.',
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
    docsUrl: 'https://ai.google.dev/docs',
    signupHint: 'aistudio.google.com → Get API key (Google account only)',
    sdkPy: 'google-generativeai', sdkJs: '@google/generative-ai',
  },
  {
    id: 'groq', name: 'Groq', tagline: 'Open models served at insane speed — feels instant.',
    models: [
      { name: 'Llama 3.3 70B (hosted)', note: 'Open model, ~300 tokens/sec', bestFor: ['general', 'research', 'rag'] },
      { name: 'Llama 3.1 8B (hosted)', note: 'Ultra-fast responses', bestFor: ['general', 'rag'] },
    ],
    freeTier: 'Free tier with generous rate limits',
    pricingNote: 'Free tier available; paid throughput priced per token.',
    getKeyUrl: 'https://console.groq.com/keys',
    docsUrl: 'https://console.groq.com/docs',
    signupHint: 'console.groq.com → API Keys → Create',
    sdkPy: 'groq', sdkJs: 'groq-sdk',
  },
  {
    id: 'mistral', name: 'Mistral AI', tagline: 'European provider with strong open-weight models.',
    models: [
      { name: 'Mistral Small', note: 'Efficient and cheap', bestFor: ['general'] },
      { name: 'Mistral Large', note: 'Strong reasoning and multilingual', bestFor: ['research', 'coding'] },
    ],
    freeTier: 'Free “experiment” tier on La Plateforme',
    pricingNote: 'Pay per token; free tier available for testing.',
    getKeyUrl: 'https://console.mistral.ai/api-keys',
    docsUrl: 'https://docs.mistral.ai',
    signupHint: 'console.mistral.ai → API keys',
    sdkPy: 'mistralai', sdkJs: '@mistralai/mistralai',
  },
  {
    id: 'openrouter', name: 'OpenRouter', tagline: 'One key → hundreds of models from many providers.',
    models: [
      { name: 'Many models', note: 'Access OpenAI, Anthropic, open weights & more', bestFor: ['general', 'coding', 'research', 'rag', 'creative'] },
    ],
    freeTier: 'Some models tagged “:free” cost nothing',
    pricingNote: 'Pay-as-you-go credits; prices vary per model. Great for experimenting.',
    getKeyUrl: 'https://openrouter.ai/keys',
    docsUrl: 'https://openrouter.ai/docs',
    signupHint: 'openrouter.ai → Keys → Create Key',
    sdkPy: 'openai', sdkJs: 'openai',
  },
];

/* ── Local runtimes ── */

export interface Runtime {
  id: string;
  name: string;
  kind: 'beginner' | 'gui' | 'advanced' | 'apple';
  tagline: string;
  platforms: string;
  url: string;
  installHint: string;
}

export const RUNTIMES: Runtime[] = [
  { id: 'ollama', name: 'Ollama', kind: 'beginner', tagline: 'The recommended way to run local models. One command, done.', platforms: 'macOS · Windows · Linux', url: 'https://ollama.com', installHint: 'Download from ollama.com, then: ollama run <model>' },
  { id: 'lmstudio', name: 'LM Studio', kind: 'gui', tagline: 'Beautiful desktop app — browse, download and chat with models.', platforms: 'macOS · Windows · Linux', url: 'https://lmstudio.ai', installHint: 'Great if you prefer clicking over typing commands.' },
  { id: 'jan', name: 'Jan', kind: 'gui', tagline: 'Open-source, offline ChatGPT alternative with a friendly UI.', platforms: 'macOS · Windows · Linux', url: 'https://jan.ai', installHint: 'Download the app, pick a model from the hub.' },
  { id: 'gpt4all', name: 'GPT4All', kind: 'gui', tagline: 'Desktop app that also does local RAG on your files out of the box.', platforms: 'macOS · Windows · Linux', url: 'https://gpt4all.io', installHint: 'LocalDocs feature chats with your documents privately.' },
  { id: 'llamacpp', name: 'llama.cpp', kind: 'advanced', tagline: 'The engine under most tools — maximum control and performance.', platforms: 'All platforms', url: 'https://github.com/ggml-org/llama.cpp', installHint: 'For when you want to tinker under the hood.' },
  { id: 'vllm', name: 'vLLM', kind: 'advanced', tagline: 'High-throughput serving for production and multi-user setups.', platforms: 'Linux (GPU)', url: 'https://github.com/vllm-project/vllm', installHint: 'Overkill for a first agent — great later.' },
  { id: 'mlx', name: 'MLX', kind: 'apple', tagline: 'Apple’s framework tuned for M-series chips.', platforms: 'Apple Silicon', url: 'https://github.com/ml-explore/mlx', installHint: 'Runs models efficiently on unified memory.' },
];

export const localModelById = (id: string) => LOCAL_MODELS.find((m) => m.id === id);
export const providerById = (id: string) => API_PROVIDERS.find((p) => p.id === id);
