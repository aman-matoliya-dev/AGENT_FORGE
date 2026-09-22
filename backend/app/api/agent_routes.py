import uuid

from fastapi import APIRouter, HTTPException, Response, Cookie
import re

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.agents.agent import Agent
from app.services import db, rate_limit
from app.services.tools import registry, SUPPORTED_TOOLS


router = APIRouter(prefix="/api/agent", tags=["Agent"])


class AgentConfig(BaseModel):
    """The builder contract. Keep this explicit so unsupported features are visible."""

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
        if value not in {"none", "buffer", "window", "summary"}:
            raise ValueError("memory must be 'none' or 'buffer' (window/summary are legacy generated-project modes)")
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


class AgentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(..., min_length=1, max_length=12000)
    config: AgentConfig
    conversation_id: str | None = Field(default=None, alias="conversationId", max_length=120)


@router.post("/run")
def run_agent(
    request: AgentRequest,
    response: Response,
    session_id: str | None = Cookie(default=None),
):
    if not session_id:
        session_id = str(uuid.uuid4())
        response.set_cookie(
            "session_id", session_id, httponly=True, samesite="lax", max_age=60 * 60 * 24
        )

    conversation_id = request.conversation_id or str(uuid.uuid4())
    if request.config.provider == "gemini":
        allowed, remaining = rate_limit.is_allowed(session_id)
        if not allowed:
            db.log_run("gemini", request.config.name, len(request.message), success=False, error_type="rate_limited")
            raise HTTPException(
                status_code=429,
                detail="You've hit the demo message limit for now — try again later.",
            )

    try:
        agent = Agent(
            config=request.config.model_dump(by_alias=True),
        )

        result, tools_used, unavailable = agent.run_with_metadata(request.message, conversation_id)

        for tool_name in tools_used:
            db.log_tool(conversation_id, tool_name, "used")
        for tool_name in unavailable:
            db.log_tool(conversation_id, tool_name, "unavailable", "Tool is not implemented in Phase 2")

        db.log_run(request.config.provider, request.config.name, len(request.message), success=True)

        return {
            "success": True,
            "agent": request.config.name,
            "response": result,
            "config": request.config.model_dump(by_alias=True),
            "unavailable": unavailable,
            "metadata": {
                "provider": request.config.provider,
                "model": request.config.model or ("gemini-3.6-flash" if request.config.provider == "gemini" else "default"),
                "conversationId": conversation_id,
                "toolsUsed": tools_used,
                "memory": request.config.memory,
                "knowledge": "unavailable",
                "agentType": request.config.agent_type,
            },
            "provider": request.config.provider,
            "model": request.config.model or ("gemini-3.6-flash" if request.config.provider == "gemini" else "default"),
            "conversationId": conversation_id,
            "toolsUsed": tools_used,
            "memory": request.config.memory,
        }

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    except Exception as error:
        db.log_run(request.config.provider, request.config.name, len(request.message), success=False, error_type="provider_error")
        raise HTTPException(
            status_code=502,
            detail=f"{request.config.provider} didn't respond — try again, or switch providers. ({error})",
        )


@router.get("/stats")
def agent_stats():
    return db.get_stats()


@router.get("/tools")
def agent_tools():
    return {"tools": registry(), "unavailable": []}
