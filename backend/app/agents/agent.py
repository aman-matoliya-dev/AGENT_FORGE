from app.services.ollama_service import ask_ollama
from app.services.gemini_service import ask_gemini
from app.services import memory, tools


class Agent:
    def __init__(self, name="AGENT_FORGE", personality="helpful and friendly",
                 provider="gemini", config=None):
        config = config or {}
        self.name = config.get("name", name)
        self.personality = config.get("personality", personality)
        self.provider = config.get("provider", provider)
        self.purpose = config.get("purpose", "")
        self.model = config.get("model")
        self.agent_type = config.get("agentType", config.get("agent_type", "general"))
        self.tools = config.get("tools", [])
        self.memory = config.get("memory", "buffer")
        self.knowledge = config.get("knowledge", "none")
        self.output_style = config.get("outputStyle", config.get("output_style", "concise"))
        if self.provider not in ("ollama", "gemini"):
            raise ValueError("Unknown provider: expected 'ollama' or 'gemini'")

    def _prepare_prompt(self, user_message, conversation_id=None):
        used, unavailable, tool_status = tools.invoke(self.tools, user_message)
        prior = memory.history(conversation_id, self.memory)
        history_text = "\n".join(f"{m['role'].title()}: {m['content']}" for m in prior)
        if unavailable:
            tool_status += f"\nUnavailable tools (not implemented by this runtime): {', '.join(unavailable)}."
        prompt = f"""You are {self.name}, an AI agent created using AGENT_FORGE.

Agent type: {self.agent_type}
Purpose: {self.purpose or "General assistance"}
Personality: {self.personality}
Output style: {self.output_style}
Memory mode: {self.memory}; conversation history is provider-neutral and bounded.
Knowledge mode: {self.knowledge}; knowledge/RAG is unavailable in Phase 2.

Be helpful and accurate. Never claim an unavailable tool, memory, or knowledge source was used.
Runtime tool status:
{tool_status}

User:
{user_message}""".strip()
        if history_text:
            prompt = prompt.replace(f"User:\n{user_message}", f"Conversation history:\n{history_text}\n\nUser:\n{user_message}")
        return prompt, used, unavailable

    def build_prompt(self, user_message, conversation_id=None):
        """Build a provider-neutral prompt while retaining the original string API."""
        return self._prepare_prompt(user_message, conversation_id)[0]

    def run_with_metadata(self, user_message, conversation_id=None):
        print(f"[AGENT] provider={self.provider} model={self.model or 'default'} agent={self.name}")
        prompt, used, unavailable = self._prepare_prompt(user_message, conversation_id)
        print(f"[TOOLS] conversation={conversation_id or '-'} used={used or 'none'} unavailable={unavailable or 'none'}")
        if self.provider == "ollama":
            result = ask_ollama(prompt, model=self.model)
        else:
            result = ask_gemini(prompt, model=self.model)
        memory.append(conversation_id, self.memory, {"role": "user", "content": user_message},
                      {"role": "assistant", "content": result})
        return result, used, unavailable

    def run(self, user_message):
        return self.run_with_metadata(user_message)[0]
