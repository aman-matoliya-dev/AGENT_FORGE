import re

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class AgentConfig(BaseModel):
    """Configuration accepted by both saved agents and the runtime endpoint."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field("AGENT_FORGE", min_length=2, max_length=64)
    purpose: str = Field("", max_length=500)
    personality: str = Field("helpful and friendly", max_length=500)
    provider: str = "gemini"
    model: str | None = Field(default=None, max_length=120)
    agent_type: str = Field("general", alias="agentType")
    tools: list[str] = Field(default_factory=list)
    memory: str = "buffer"
    knowledge: str = "none"
    output_style: str = Field("concise", alias="outputStyle")

    @field_validator("provider")
    @classmethod
    def supported_provider(cls, value: str) -> str:
        if value not in {"gemini", "ollama"}:
            raise ValueError("provider must be 'gemini' or 'ollama'")
        return value

    @field_validator("model")
    @classmethod
    def safe_model_tag(cls, value: str | None) -> str | None:
        if value and not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:-]{0,119}", value):
            raise ValueError("model contains unsupported characters")
        return value

    @field_validator("memory")
    @classmethod
    def supported_memory(cls, value: str) -> str:
        if value not in {"none", "buffer", "window"}:
            raise ValueError("memory must be 'none', 'buffer', or 'window'")
        return value

    @field_validator("knowledge")
    @classmethod
    def supported_knowledge(cls, value: str) -> str:
        if value not in {"none", "rag"}:
            raise ValueError("knowledge must be 'none' or 'rag'")
        return value

    @model_validator(mode="after")
    def validate_model_for_provider(self):
        if self.provider == "gemini" and self.model not in {None, "gemini-3.6-flash"}:
            raise ValueError(f"Unsupported Gemini model: {self.model}")
        if self.provider == "ollama" and self.model and self.model.startswith("gemini-"):
            raise ValueError(f"Unsupported Ollama model: {self.model}")
        return self


class SavedAgentCreate(AgentConfig):
    description: str = Field("", max_length=1000)


class SavedAgentPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=2, max_length=64)
    description: str | None = Field(default=None, max_length=1000)
    purpose: str | None = Field(default=None, max_length=500)
    personality: str | None = Field(default=None, max_length=500)
    provider: str | None = None
    model: str | None = Field(default=None, max_length=120)
    agent_type: str | None = Field(default=None, alias="agentType")
    tools: list[str] | None = None
    memory: str | None = None
    knowledge: str | None = None
    output_style: str | None = Field(default=None, alias="outputStyle")

    @model_validator(mode="after")
    def require_patch_fields(self):
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided.")
        return self
