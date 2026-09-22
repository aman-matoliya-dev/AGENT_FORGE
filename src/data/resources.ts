/* ── Resource hub ────────────────────────────────────────────────
   Curated, official-source links. Grouped by category. */

export interface ResourceItem {
  name: string;
  desc: string;
  url: string;
  badge?: string; // e.g. "official", "free", "open source"
}

export interface ResourceCategory {
  id: string;
  title: string;
  blurb: string;
  icon: string; // lucide icon key resolved in the page
  items: ResourceItem[];
}

export const EXTERNAL_LINKS_NOTE = {
  title: 'Safety rule of the AI ecosystem:',
  body: 'only download models from Hugging Face or the model maker’s official pages, and only create API keys inside the provider’s official console. Third-party “free key” or “repacked model” sites are the most common way beginners get burned. Every link below goes to the official source.',
};

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    id: 'models', title: 'AI Models', blurb: 'Where open models actually live.',
    icon: 'Boxes',
    items: [
      { name: 'Hugging Face', desc: 'The GitHub of AI — every major open model, dataset and demo.', url: 'https://huggingface.co', badge: 'official' },
      { name: 'Ollama Model Library', desc: 'One-command installs for the best open models.', url: 'https://ollama.com/library', badge: 'official' },
      { name: 'Meta Llama', desc: 'Official Llama model pages and license info.', url: 'https://www.llama.com' },
      { name: 'Qwen (Alibaba)', desc: 'The Qwen family — top open models for agents and coding.', url: 'https://huggingface.co/Qwen' },
      { name: 'Mistral AI Models', desc: 'Efficient open-weight models from Europe.', url: 'https://huggingface.co/mistralai' },
      { name: 'Gemma (Google)', desc: 'Google’s open models, great for small devices.', url: 'https://ai.google.dev/gemma' },
    ],
  },
  {
    id: 'runtimes', title: 'Local AI Runtimes', blurb: 'Software that runs models on your machine.',
    icon: 'Cpu',
    items: [
      { name: 'Ollama', desc: 'Recommended for beginners — one command per model.', url: 'https://ollama.com', badge: 'recommended' },
      { name: 'LM Studio', desc: 'Polished desktop app with a built-in model browser.', url: 'https://lmstudio.ai' },
      { name: 'Jan', desc: 'Open-source offline ChatGPT alternative.', url: 'https://jan.ai', badge: 'open source' },
      { name: 'GPT4All', desc: 'Desktop app with built-in private document chat.', url: 'https://gpt4all.io', badge: 'open source' },
      { name: 'llama.cpp', desc: 'The inference engine underneath almost everything.', url: 'https://github.com/ggml-org/llama.cpp', badge: 'github' },
      { name: 'MLX (Apple)', desc: 'Apple’s ML framework for M-series chips.', url: 'https://github.com/ml-explore/mlx', badge: 'github' },
    ],
  },
  {
    id: 'apis', title: 'API Providers', blurb: 'Get API keys from the official consoles only.',
    icon: 'Cloud',
    items: [
      { name: 'OpenAI Platform', desc: 'GPT-4o family. Keys: platform.openai.com/api-keys', url: 'https://platform.openai.com/api-keys', badge: 'official' },
      { name: 'Anthropic Console', desc: 'Claude models. Keys: console.anthropic.com', url: 'https://console.anthropic.com/settings/keys', badge: 'official' },
      { name: 'Google AI Studio', desc: 'Gemini with a real free tier — best $0 start.', url: 'https://aistudio.google.com/app/apikey', badge: 'free tier' },
      { name: 'Groq Cloud', desc: 'Open models at extreme speed, generous free tier.', url: 'https://console.groq.com/keys', badge: 'free tier' },
      { name: 'Mistral La Plateforme', desc: 'Mistral API with free experiment tier.', url: 'https://console.mistral.ai/api-keys' },
      { name: 'OpenRouter', desc: 'One key, hundreds of models, some free.', url: 'https://openrouter.ai/keys' },
    ],
  },
  {
    id: 'frameworks', title: 'Agent Frameworks', blurb: 'Once you outgrow hand-rolled loops.',
    icon: 'Workflow',
    items: [
      { name: 'LangChain', desc: 'The most popular agent/tooling framework (Python & JS).', url: 'https://www.langchain.com', badge: 'popular' },
      { name: 'LangGraph', desc: 'Graph-based, production-grade agent orchestration.', url: 'https://langchain-ai.github.io/langgraph/' },
      { name: 'LlamaIndex', desc: 'Data framework focused on RAG and knowledge agents.', url: 'https://www.llamaindex.ai' },
      { name: 'Vercel AI SDK', desc: 'TypeScript-first toolkit for AI apps and agents.', url: 'https://sdk.vercel.ai' },
      { name: 'CrewAI', desc: 'Role-playing multi-agent teams, beginner friendly.', url: 'https://www.crewai.com' },
      { name: 'smolagents (Hugging Face)', desc: 'Tiny, readable agent library — great for learning.', url: 'https://github.com/huggingface/smolagents', badge: 'github' },
    ],
  },
  {
    id: 'vectordb', title: 'Vector Databases', blurb: 'Memory for RAG and long-term facts.',
    icon: 'Database',
    items: [
      { name: 'Chroma', desc: 'The easiest local vector DB — perfect for first RAG.', url: 'https://www.trychroma.com', badge: 'beginner' },
      { name: 'FAISS (Meta)', desc: 'Blazing-fast similarity search library.', url: 'https://github.com/facebookresearch/faiss', badge: 'github' },
      { name: 'Qdrant', desc: 'Open-source vector DB, runs locally or cloud.', url: 'https://qdrant.tech' },
      { name: 'pgvector', desc: 'Vector search inside good old PostgreSQL.', url: 'https://github.com/pgvector/pgvector', badge: 'github' },
      { name: 'Pinecone', desc: 'Managed vector DB with a free tier.', url: 'https://www.pinecone.io' },
    ],
  },
  {
    id: 'learning', title: 'Tutorials & Courses', blurb: 'High-quality, beginner-tested learning material.',
    icon: 'GraduationCap',
    items: [
      { name: 'Hugging Face Agents Course', desc: 'Free, hands-on course: build agents from zero to certified.', url: 'https://huggingface.co/learn/agents-course', badge: 'free' },
      { name: 'DeepLearning.AI Short Courses', desc: 'Bite-sized courses on agents, RAG and tool use.', url: 'https://www.deeplearning.ai/short-courses/', badge: 'free' },
      { name: 'Prompt Engineering Guide', desc: 'Open guide to prompting and reasoning techniques.', url: 'https://www.promptingguide.ai', badge: 'free' },
      { name: 'Anthropic: Building Effective Agents', desc: 'The seminal essay on agent patterns — read it twice.', url: 'https://www.anthropic.com/research/building-effective-agents' },
      { name: 'OpenAI Cookbook', desc: 'Practical, runnable agent and RAG examples.', url: 'https://cookbook.openai.com', badge: 'github' },
      { name: 'The Illustrated GPT-2 / Transformers', desc: 'Jay Alammar’s legendary visual explanations.', url: 'https://jalammar.github.io' },
    ],
  },
  {
    id: 'projects', title: 'Beginner Project Ideas', blurb: 'Small enough to finish, real enough to matter.',
    icon: 'Lightbulb',
    items: [
      { name: 'Study Buddy', desc: 'RAG over your lecture PDFs with citations. Teaches: chunking, retrieval, honest answers.', url: 'https://github.com/topics/rag' },
      { name: 'CLI Task Agent', desc: 'Natural-language file organiser for your downloads folder. Teaches: tools, confirmation steps.', url: 'https://github.com/topics/ai-agent' },
      { name: 'News Digest Agent', desc: 'Daily search + summarise + save to notes. Teaches: loops, scheduling, summarisation.', url: 'https://github.com/topics/ai-agent' },
      { name: 'Personal Finance Q&A', desc: 'Chat with your exported bank CSVs locally. Teaches: privacy-first local AI.', url: 'https://github.com/topics/local-llm' },
      { name: 'LeetCode Coach', desc: 'Coding agent that hints instead of solving. Teaches: system prompts, guardrails.', url: 'https://github.com/topics/coding-assistant' },
    ],
  },
  {
    id: 'community', title: 'Communities & Docs', blurb: 'Where to ask questions without feeling dumb.',
    icon: 'Users',
    items: [
      { name: 'r/LocalLLaMA', desc: 'The most active local-AI community on the internet.', url: 'https://www.reddit.com/r/LocalLLaMA/' },
      { name: 'Hugging Face Discord', desc: 'Friendly channels for agents, models and help.', url: 'https://huggingface.co/join/discord' },
      { name: 'Ollama Discord', desc: 'Support and showcase for local model setups.', url: 'https://discord.gg/ollama' },
      { name: 'Stack Overflow [llm] tag', desc: 'Searchable answers for concrete coding problems.', url: 'https://stackoverflow.com/questions/tagged/large-language-model' },
    ],
  },
];
