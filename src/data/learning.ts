/* ── Learning path ───────────────────────────────────────────────
   10 guided lessons. Each lesson is a list of renderable blocks so
   content stays data-driven and easy to extend. */

export type Block =
  | { type: 'text'; heading: string; body: string }
  | { type: 'analogy'; title: string; body: string }
  | { type: 'points'; heading: string; items: { title: string; body: string }[] }
  | { type: 'diagram'; key: DiagramKey; caption: string }
  | { type: 'code'; title: string; lang: string; code: string; explain: string }
  | { type: 'tip'; body: string }
  | { type: 'warn'; body: string };

export type DiagramKey =
  | 'chatbot-vs-agent' | 'agent-loop' | 'architecture' | 'tokens' | 'tool-call'
  | 'memory' | 'rag' | 'planning' | 'local-api' | 'build-checklist';

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  minutes: number;
  accent: string;
  outcomes: string[];
  blocks: Block[];
  quiz: { q: string; options: string[]; answer: number; why: string }[];
}

export const LESSONS: Lesson[] = [
  {
    id: 'what-is-an-agent',
    title: 'What is an AI Agent?',
    subtitle: 'The difference between chatting and doing.',
    minutes: 5, accent: '#8b5cf6',
    outcomes: ['Define what an AI agent is', 'Tell an agent apart from a plain chatbot', 'Spot agents in tools you already know'],
    blocks: [
      { type: 'text', heading: 'From answering to acting', body: 'A chatbot waits for your message and replies with text. An AI agent is given a GOAL — like “research today’s AI news and email me a summary” — and it works out the steps itself: searching, reading, checking its own work, and only then reporting back. The model doesn’t just talk; it takes actions in a loop until the job is done.' },
      { type: 'analogy', title: 'The intern analogy', body: 'Think of a chatbot as a very smart friend you can only ask questions. An agent is more like a capable intern: you hand them a task, they break it into steps, use the tools on their desk (browser, calculator, files), check their work, and come back with a result. Give them better tools and clearer instructions, and they do better work.' },
      { type: 'diagram', key: 'chatbot-vs-agent', caption: 'Same model underneath — the difference is the loop and the tools around it.' },
      { type: 'points', heading: 'The three ingredients of every agent', items: [
        { title: 'A brain (LLM)', body: 'A language model that reads instructions, reasons about what to do next, and writes the final answer.' },
        { title: 'Hands (tools)', body: 'Functions the agent can call: search the web, run code, read a file, call an API. Without tools, an agent is just a chatbot.' },
        { title: 'A loop', body: 'The agent repeatedly thinks → acts → observes the result → thinks again, until the goal is met or it gives up.' },
      ]},
      { type: 'text', heading: 'Agents you already know', body: 'Coding assistants that edit files and run tests, research tools that browse dozens of pages and cite sources, and support bots that look up your order and actually issue a refund — all agents. They share the same basic anatomy you will build yourself in lesson 10.' },
      { type: 'tip', body: 'Rule of thumb: if the AI does more than one step without you prompting each step, you are looking at an agent.' },
    ],
    quiz: [
      { q: 'What most fundamentally separates an agent from a chatbot?', options: ['It uses a bigger model', 'It can take actions in a loop toward a goal', 'It runs in the cloud', 'It has a nicer interface'], answer: 1, why: 'Tools + an autonomous loop are the defining features. Model size and hosting are irrelevant.' },
      { q: 'Which of these is an agent?', options: ['A bot that answers FAQs from a fixed script', 'An assistant that searches the web, reads pages, then summarises them for you', 'A model that completes one sentence', 'A spell checker'], answer: 1, why: 'It pursues a goal over multiple steps, using tools, without hand-holding at each step.' },
    ],
  },
  {
    id: 'how-agents-work',
    title: 'How an AI Agent Works',
    subtitle: 'The think → act → observe loop, demystified.',
    minutes: 6, accent: '#22d3ee',
    outcomes: ['Explain the agent loop', 'Follow a trace of an agent solving a task', 'Understand why loops beat single prompts'],
    blocks: [
      { type: 'text', heading: 'One prompt is a guess. A loop is a process.', body: 'When you ask an agent “what’s 18% of the price of the top-rated espresso machine under $300?”, a single-pass model has to hallucinate both the product and the math. An agent instead works in steps: search for machines, read prices, pick one, use a calculator, then answer with real numbers. Each step’s result feeds the next decision.' },
      { type: 'diagram', key: 'agent-loop', caption: 'Watch the loop: the agent keeps cycling until it has enough to answer.' },
      { type: 'points', heading: 'The four beats of the loop', items: [
        { title: '1 · Perceive', body: 'The agent receives your goal plus the results of any previous actions (the “observations”).' },
        { title: '2 · Think', body: 'The LLM reasons: “What do I know? What’s missing? Which tool gets me closer?” This is often written in a scratchpad you can inspect.' },
        { title: '3 · Act', body: 'It calls one tool with concrete arguments — search(“best espresso machine under $300”) — rather than answering immediately.' },
        { title: '4 · Observe', body: 'The tool’s output is appended to the conversation, and the loop repeats with this new evidence.' },
      ]},
      { type: 'text', heading: 'When does it stop?', body: 'Three exits: the agent decides it has enough and produces a FINAL ANSWER; it hits a step or time limit you set (always set one!); or it fails with an error you can learn from. Well-built agents are explicit about stopping, so you never get an infinite research spiral.' },
      { type: 'analogy', title: 'Like using GPS', body: 'A GPS doesn’t teleport you to the destination. It reads your position, picks the next turn, checks the new position, and re-plans if you miss a turn. The agent loop is exactly that — tiny verified steps instead of one leap of faith.' },
      { type: 'tip', body: 'In your builder project you will print every loop iteration. Watching the trace is the single best way to build intuition for agents.' },
    ],
    quiz: [
      { q: 'In the agent loop, what happens right after the agent calls a tool?', options: ['It answers the user immediately', 'It observes the tool’s result, then thinks again', 'The program ends', 'The model is retrained'], answer: 1, why: 'Tool output becomes a new observation, and the loop repeats with that evidence.' },
      { q: 'Why should an agent have a maximum number of steps?', options: ['To save electricity', 'Because models get tired', 'To guarantee it always terminates, even if the task goes wrong', 'It is just a convention'], answer: 2, why: 'A step limit is your safety stop — without it, a confused agent can burn tokens in an endless loop.' },
    ],
  },
  {
    id: 'architecture',
    title: 'Agent Architecture & Workflow',
    subtitle: 'The blueprint: every component and what it owns.',
    minutes: 7, accent: '#a78bfa',
    outcomes: ['Name the core components of an agent system', 'Describe what flows between them', 'Read an architecture diagram'],
    blocks: [
      { type: 'text', heading: 'An agent is a small system, not a single model', body: 'Beginners often imagine an agent as “a smart model in a box”. In practice it is a handful of humble parts wired together: a prompt that defines identity, a model that decides, tools that act, memory that remembers, and an orchestrator (your code!) that passes messages around. None of the parts is magic — the magic is the wiring.' },
      { type: 'diagram', key: 'architecture', caption: 'Click any part of the pipeline to see what it owns and what it never does.' },
      { type: 'points', heading: 'Who does what', items: [
        { title: 'Orchestrator', body: 'Plain code that runs the loop: sends messages to the model, executes requested tool calls, appends results, enforces step limits. This is the part you write.' },
        { title: 'System prompt', body: 'The agent’s job description: role, goal, tone, boundaries, and how to use its tools. It is included in every single request.'},
        { title: 'Model (LLM)', body: 'The decision-maker. Reads everything, decides the next action or the final answer. Swappable — local or API.' },
        { title: 'Tool layer', body: 'A registry of functions with names, descriptions and schemas. The model chooses; your code executes. The model never touches the world directly.' },
        { title: 'Memory', body: 'Where the agent stores and recalls information: recent conversation (short-term) and saved facts (long-term).' },
        { title: 'Knowledge base', body: 'Optional documents the agent can search for ground truth — the RAG piece from lesson 7.' },
      ]},
      { type: 'tip', body: 'When something goes wrong with an agent, ask “which component owns this failure?” 90% of debugging is prompt, tools, or memory — rarely the model itself.' },
    ],
    quiz: [
      { q: 'Which component actually runs the web-search function?', options: ['The LLM', 'The orchestrator code', 'The system prompt', 'The memory'], answer: 1, why: 'The LLM only *requests* the call with arguments; your code executes it and returns the result.' },
      { q: 'The system prompt is best described as…', options: ['The agent’s job description', 'A list of API keys', 'The agent’s database', 'A model setting like temperature'], answer: 0, why: 'It defines role, goal, tone and tool-use rules — included in every request.' },
    ],
  },
  {
    id: 'llms-and-models',
    title: 'LLMs & AI Models',
    subtitle: 'What the “brain” actually is, in plain words.',
    minutes: 7, accent: '#34d399',
    outcomes: ['Explain tokens and next-token prediction', 'Understand parameters, quantization and context windows', 'Choose a model size sensibly'],
    blocks: [
      { type: 'text', heading: 'Prediction machines, all the way down', body: 'A large language model is a giant mathematical function trained on vast amounts of text to do one thing: predict the next token. A token is a chunk of text — roughly three quarters of a word. Everything that looks like reasoning emerges from doing that prediction extremely well, one token at a time, thousands of times per answer.' },
      { type: 'diagram', key: 'tokens', caption: 'Text goes in as tokens; the model scores likely next tokens; one is picked and appended.' },
      { type: 'points', heading: 'The four numbers that define a model', items: [
        { title: 'Parameters (the “B”)', body: 'The count of learned numbers inside the model. 7B = seven billion. More parameters usually means smarter, but slower and heavier.' },
        { title: 'Quantization (Q4, Q8…)', body: 'Compressing those numbers from 16-bit to 4-8 bit so models fit in normal computers. Q4_K_M is the community favourite: roughly 4× smaller with only a few % quality loss.' },
        { title: 'Context window', body: 'How much text the model can consider at once — your conversation, documents and reply combined. 8K tokens ≈ 6 pages; 128K ≈ a small book.' },
        { title: 'License', body: 'Open-weight models (Llama, Qwen, Mistral…) can be downloaded and run privately. Check the license for commercial use.' },
      ]},
      { type: 'analogy', title: 'Quantization is like image compression', body: 'A RAW photo is huge; a good JPEG is 10× smaller and looks nearly identical. Q4 quantization does the same to model weights. That is why a 70B model that “should” need 140 GB can run in ~40 GB — slightly softer, dramatically cheaper.' },
      { type: 'text', heading: 'Bigger is not always better for agents', body: 'Agents make many model calls per task, so speed and cost multiply. A fast 7-8B model that follows instructions reliably often beats a sluggish 70B for everyday agents. Start small, measure, and only scale up when you can name the capability you are missing.' },
      { type: 'tip', body: 'The Device Check tool on this site matches your RAM/VRAM to models automatically — you never need to memorize these numbers.' },
    ],
    quiz: [
      { q: 'A token is best described as…', options: ['A whole word, always', 'A chunk of text — often part of a word', 'A unit of GPU memory', 'An API password'], answer: 1, why: 'Tokens are pieces of text (≈¾ of a word on average in English). Pricing and context limits are measured in tokens.' },
      { q: 'Why does quantization matter for running models locally?', options: ['It makes models smarter', 'It shrinks models so they fit in ordinary RAM/VRAM with little quality loss', 'It removes the license restrictions', 'It speeds up the internet'], answer: 1, why: 'Quantization compresses weights (e.g. 16-bit → 4-bit) — the key trick that makes local AI practical.' },
    ],
  },
  {
    id: 'tools-and-function-calling',
    title: 'Tools & Function Calling',
    subtitle: 'Giving your agent hands without giving it your house keys.',
    minutes: 8, accent: '#22d3ee',
    outcomes: ['Explain function calling step by step', 'Write a tool definition', 'Apply least-privilege to agent tools'],
    blocks: [
      { type: 'text', heading: 'The model never touches the world — it asks', body: 'Modern models are trained to emit a structured request when they want a tool: not “let me search”, but a precise machine-readable call like {"tool": "search", "query": "..."}. Your code receives that request, runs the real function, and pastes the result back into the conversation. The model decides; your code executes. This separation is what makes agents controllable.' },
      { type: 'diagram', key: 'tool-call', caption: 'The full anatomy of one tool call. Hover each stage.' },
      { type: 'points', heading: 'A tool definition has three parts', items: [
        { title: 'Name', body: 'A verb like “get_weather” or “read_file”. The model picks tools by name, so name them like API endpoints, not jokes.' },
        { title: 'Description', body: 'One or two sentences telling the model WHEN to use it. This is prompt engineering for tools — it directly controls calling behavior.' },
        { title: 'Parameters (schema)', body: 'JSON schema of the arguments: names, types, what’s required. The model fills this in like a form.' },
      ]},
      { type: 'code', title: 'A real tool definition (Python)', lang: 'python', code: `tools = [{\n  "name": "get_weather",\n  "description": "Get current weather for a city.\n    Use when the user asks about weather.",\n  "parameters": {\n    "type": "object",\n    "properties": {\n      "city": { "type": "string",\n        "description": "City name, e.g. 'Lisbon'" }\n    },\n    "required": ["city"]\n  }\n}]`, explain: 'Notice there is NO weather logic here — only a description. The model reads this menu and later asks your code to run the real function with {"city": "Lisbon"}.' },
      { type: 'warn', body: 'Safety first: give agents the minimum tools they need. A notes app does not need shell access. For destructive tools (delete, send, pay), add a human confirmation step — you will see how in the builder.' },
      { type: 'tip', body: 'Great beginner tools: calculator, current date/time, a notes file, web search, and reading text files. All are built into the builder on this site.' },
    ],
    quiz: [
      { q: 'When a model decides to use a tool, what does it actually output?', options: ['Python code that executes itself', 'A structured request (name + arguments) that your code executes', 'A direct HTTP request to the internet', 'An image of the result'], answer: 1, why: 'Function calling is a request format. Your orchestrator code performs the real action and returns the result.' },
      { q: 'What is the purpose of a tool’s description field?', options: ['Documentation for humans only', 'It tells the model when to use the tool — directly affecting behavior', 'It sets the price per call', 'Nothing, it is optional decoration'], answer: 1, why: 'The model reads descriptions to choose tools. Better descriptions = more reliable tool use.' },
    ],
  },
  {
    id: 'memory',
    title: 'Memory',
    subtitle: 'How agents remember — and why they forget.',
    minutes: 6, accent: '#f472b6',
    outcomes: ['Distinguish short-term and long-term memory', 'Understand the context-window limit', 'Pick a memory strategy'],
    blocks: [
      { type: 'text', heading: 'Models have no memory of their own', body: 'This surprises everyone: after the model writes a token, it retains nothing. Every request contains the ENTIRE conversation so far — that illusion of remembering is your code re-sending history each time. “Memory” is therefore an engineering choice, not a model feature.' },
      { type: 'diagram', key: 'memory', caption: 'Short-term lives in the context window; long-term lives in a store you own. Drag the slider to see context fill up.' },
      { type: 'points', heading: 'The four common memory strategies', items: [
        { title: 'Full buffer', body: 'Keep every message. Simple and perfect for short chats, but the context window eventually overflows.' },
        { title: 'Sliding window', body: 'Keep only the last N messages. Cheap and predictable — the agent forgets older details.' },
        { title: 'Summary memory', body: 'Periodically ask the model to condense old messages into a running summary. Keeps the plot, loses the exact quotes.' },
        { title: 'Long-term / vector memory', body: 'Save important facts (“user lives in Porto”) to a database and inject relevant ones into the prompt when needed.' },
      ]},
      { type: 'analogy', title: 'Bench vs bookshelf', body: 'Your context window is a workbench: everything on it is instantly usable, but space is limited. Long-term memory is the bookshelf: huge capacity, but you must deliberately walk over and fetch the right book. Good agents keep the bench tidy and know what’s on the shelf.' },
      { type: 'tip', body: 'The builder on this site lets you pick a strategy and shows the exact generated code — start with “buffer + summary”, it covers most beginner projects.' },
    ],
    quiz: [
      { q: 'Why does a chatbot seem to remember earlier messages?', options: ['The model stores conversations in its weights', 'Your code re-sends the conversation history with every request', 'The browser remembers them', 'The API provider memorises users'], answer: 1, why: 'Models are stateless. The “memory” is the message list your code maintains and resends.' },
      { q: 'Your agent forgets things from very early in a long chat. Most likely cause?', options: ['The model is tired', 'The context window overflowed and old messages were dropped', 'Bad internet', 'The system prompt is too short'], answer: 1, why: 'When history exceeds the context window, something must go — that is why memory strategies exist.' },
    ],
  },
  {
    id: 'rag',
    title: 'RAG & Knowledge Bases',
    subtitle: 'Teaching your agent facts it was never trained on.',
    minutes: 8, accent: '#34d399',
    outcomes: ['Explain RAG end to end', 'Understand embeddings and similarity search', 'Know when to use RAG vs fine-tuning'],
    blocks: [
      { type: 'text', heading: 'Open-book exam instead of memory test', body: 'Ask a model about YOUR lecture notes and it will hallucinate — it has never seen them. RAG (Retrieval-Augmented Generation) fixes this by searching your documents first and pasting the relevant passages into the prompt. The model answers from evidence, like a student with the textbook open.' },
      { type: 'diagram', key: 'rag', caption: 'Two phases: prepare your library once (indexing), then retrieve per question.' },
      { type: 'points', heading: 'The pipeline, piece by piece', items: [
        { title: 'Chunking', body: 'Documents are split into passages of a few hundred words. Chunks are the unit of search — too big wastes context, too small loses meaning.' },
        { title: 'Embeddings', body: 'Each chunk is converted to a vector: a list of numbers capturing its meaning. “Dog” and “puppy” end up with similar vectors even though the words differ.' },
        { title: 'Vector database', body: 'A store (Chroma, FAISS, Qdrant…) that finds the chunks whose vectors are closest to your question’s vector — semantic search in milliseconds.' },
        { title: 'Augmented prompt', body: 'The top chunks are inserted into the prompt with instructions: “Answer using ONLY this context, and say when it’s missing.”' },
      ]},
      { type: 'code', title: 'RAG in three lines (concept)', lang: 'python', code: `docs = vector_db.similarity_search(\n    question, k=4)            # 1. retrieve\ncontext = "\\n\\n".join(docs)      # 2. augment\nanswer = llm.chat(SYSTEM +\n  f"Context:\\n{context}\\n\\nQ: {question}")  # 3. generate`, explain: 'Retrieve → Augment → Generate. Everything else in RAG tooling is optimisation of these three steps.' },
      { type: 'tip', body: 'RAG changes *what the model knows right now*; fine-tuning changes *how the model behaves*. Start with RAG — it is cheaper, instant, and keeps facts updatable.' },
    ],
    quiz: [
      { q: 'The main problem RAG solves is…', options: ['Models are too slow', 'Models don’t know your private/new documents and make things up', 'Models cost too much', 'Prompts are hard to write'], answer: 1, why: 'RAG injects relevant facts from YOUR sources into the prompt so the model can answer from evidence.' },
      { q: 'Embeddings are used to…', options: ['Compress images', 'Turn text into numbers so similar meanings can be searched', 'Encrypt private data', 'Train the model faster'], answer: 1, why: 'Embedding vectors place semantically similar texts near each other, enabling similarity search.' },
    ],
  },
  {
    id: 'planning',
    title: 'Planning & Reasoning',
    subtitle: 'Teaching agents to think before they leap.',
    minutes: 7, accent: '#fbbf24',
    outcomes: ['Explain chain-of-thought and ReAct', 'Break a goal into a plan', 'Know the limits of agent autonomy'],
    blocks: [
      { type: 'text', heading: 'Say the quiet part out loud', body: 'Models reason far better when they write intermediate steps before answering — “chain-of-thought”. For agents this evolves into ReAct (Reason + Act): each loop iteration contains a Thought, an Action, and an Observation. The written thought is not decoration; it measurably improves decisions and gives you a debuggable trail.' },
      { type: 'diagram', key: 'planning', caption: 'Big goals become trees of small, checkable tasks.' },
      { type: 'points', heading: 'From simple to sophisticated', items: [
        { title: 'Level 1 · Chain-of-thought', body: '“Think step by step” inside one answer. Zero infrastructure, surprisingly effective.' },
        { title: 'Level 2 · ReAct loop', body: 'Interleaved thought/action/observation with tools. This is the loop from lesson 2, and what your builder agent uses.' },
        { title: 'Level 3 · Plan-then-execute', body: 'First produce an explicit plan (a todo list), then work through it, re-planning when reality disagrees.' },
        { title: 'Level 4 · Multi-agent', body: 'Several specialised agents (researcher, critic, writer) collaborating. Powerful, but master Level 2 first.' },
      ]},
      { type: 'analogy', title: 'Cooking a new dish', body: 'You could wing it (one-shot), or read the recipe first (plan), taste as you go (observe), and adjust seasoning (re-plan). The plan keeps long tasks on rails; the tasting keeps you honest. Agents need both.' },
      { type: 'warn', body: 'More autonomy ≠ better agent. Every extra planning layer adds latency, cost and new failure modes. The art is choosing the SIMPLEST structure that reliably does your task.' },
      { type: 'tip', body: 'When your agent misbehaves, read its thoughts. If the plan is wrong, fix the prompt; if the plan is fine but steps fail, fix the tools. This one habit will save you hours.' },
    ],
    quiz: [
      { q: 'ReAct stands for…', options: ['React the JavaScript library', 'Reason + Act — interleaving written thoughts with tool actions', 'Rapid execution of agents', 'Read, evaluate, answer'], answer: 1, why: 'ReAct = visible reasoning plus actions, the pattern behind most tool-using agents.' },
      { q: 'What is the main risk of adding more autonomous planning layers?', options: ['Nothing, more is always better', 'More latency, cost, and new ways to fail', 'The model gets offended', 'It uses more storage'], answer: 1, why: 'Autonomy is a budget. Prefer the simplest structure that reliably completes the task.' },
    ],
  },
  {
    id: 'local-vs-api',
    title: 'APIs vs Local AI',
    subtitle: 'Where should your agent’s brain live?',
    minutes: 6, accent: '#8b5cf6',
    outcomes: ['Compare local and hosted models on privacy, cost, quality', 'Know what an API key is and how usage is billed', 'Decide which brain fits your situation'],
    blocks: [
      { type: 'text', heading: 'Same idea, two homes', body: 'An LLM can live in a provider’s data center (you call it over the internet — an API) or on your own machine (you download the weights and run them locally). Your agent’s architecture barely changes either way — only the “brain connector” differs. That is why this choice is reversible.' },
      { type: 'diagram', key: 'local-api', caption: 'Toggle the switch and compare both query paths.' },
      { type: 'points', heading: 'The honest trade-offs', items: [
        { title: 'Privacy', body: 'Local: data never leaves your machine — full stop. API: prompts go to the provider; check their data-retention policy (many offer zero-retention tiers).' },
        { title: 'Cost', body: 'Local: free per message after hardware & electricity; big models need expensive GPUs. API: pay per token, but free tiers (Gemini, Groq) make starting cost $0.' },
        { title: 'Quality & speed', body: 'API: instant access to the strongest models on Earth. Local: best open models are excellent but a tier below frontier; speed depends on YOUR hardware.' },
        { title: 'Reliability', body: 'Local: works offline, no rate limits, no outages. API: needs internet, subject to limits — but zero setup and zero maintenance.' },
      ]},
      { type: 'text', heading: 'How API billing works (the 2-minute version)', body: 'You create an account, generate an API key (a secret string that identifies your app), and pay per token processed — input tokens (what you send) usually cheaper than output (what it writes). As intuition: a full agent conversation often costs well under a cent on budget models. Always set a monthly spending cap the day you create the key.' },
      { type: 'tip', body: 'Beginner’s path: prototype on a free API tier, then move the same agent to a local model with Ollama for privacy/offline use. The builder generates both connectors from one configuration.' },
    ],
    quiz: [
      { q: 'The strongest practical reason to run a model locally is…', options: ['It is always smarter', 'Privacy + offline + no per-message cost', 'It needs no hardware', 'Faster than any API'], answer: 1, why: 'Data never leaves your machine, it works with no internet, and each message costs nothing.' },
      { q: 'An API key is…', options: ['A model you download', 'A secret token identifying your app so the provider can bill/meter usage', 'A type of GPU', 'A password for your computer'], answer: 1, why: 'Keys authenticate your requests and tie usage to your account — keep them out of committed code.' },
    ],
  },
  {
    id: 'build-first-agent',
    title: 'Build & Test Your First Agent',
    subtitle: 'Putting it all together — then putting it to the test.',
    minutes: 8, accent: '#22d3ee',
    outcomes: ['Assemble a complete minimal agent', 'Run it locally or against an API', 'Test and iterate like an engineer'],
    blocks: [
      { type: 'text', heading: 'The minimum viable agent has 6 decisions', body: 'Name & goal, system prompt, brain (local or API model), tools, memory, and behavior. You have learned what each one means — the builder on this site walks you through them and explains WHY at each step, then generates a complete, commented starter project in Python or JavaScript.' },
      { type: 'diagram', key: 'build-checklist', caption: 'Your launch checklist. Everything here is covered by the builder.' },
      { type: 'points', heading: 'Test like an engineer, not a gambler', items: [
        { title: 'Golden path', body: '3-5 tasks the agent should definitely handle. Re-run them after EVERY change to catch regressions.' },
        { title: 'Edge cases', body: 'Empty input, nonsense input, requests outside its purpose. The agent should decline gracefully, not improvise.' },
        { title: 'Tool failure', body: 'What if search times out? The agent should say so, not hallucinate a result. Your generated code includes this pattern.' },
        { title: 'Read the trace', body: 'Log every thought + tool call. An agent you cannot observe is an agent you cannot fix.' },
      ]},
      { type: 'analogy', title: 'Iterate like cooking, not like baking', body: 'Baking demands the perfect recipe upfront. Cooking lets you taste and adjust. Prompts, tools and limits are seasoning: change one thing, taste (test), adjust. Small loops, constant tasting.' },
      { type: 'tip', body: 'Save your agent in the builder, download the starter zip, and run it. Your dashboard tracks learning progress and all your agents in one place.' },
    ],
    quiz: [
      { q: 'The most reliable way to improve an agent is to…', options: ['Rewrite everything from scratch', 'Change one thing at a time and re-run a fixed set of test tasks', 'Always use the biggest model', 'Add more tools'], answer: 1, why: 'Fixed test tasks + single-variable changes = you actually learn what helped.' },
      { q: 'When a tool fails (e.g. search times out), a good agent should…', options: ['Invent a plausible result', 'Crash silently', 'Report the failure honestly and try an alternative or ask the user', 'Retry forever'], answer: 2, why: 'Honest failure + graceful fallback beats confident hallucination every time.' },
    ],
  },
];

export const lessonById = (id: string) => LESSONS.find((l) => l.id === id);
