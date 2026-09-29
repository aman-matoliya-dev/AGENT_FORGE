import logging
import uuid
import time

from fastapi import APIRouter, HTTPException, Response, Cookie, Path, Query
from pydantic import BaseModel, ConfigDict, Field

from app.agents.agent import Agent
from app.models.agent_models import AgentConfig
from app.services import db, rate_limit
from app.services.tools import registry, SUPPORTED_TOOLS


router = APIRouter(prefix="/api/agent", tags=["Agent"])
logger = logging.getLogger(__name__)


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
            db.log_run(
                "gemini",
                request.config.name,
                len(request.message),
                success=False,
                error_type="rate_limited",
                model=request.config.model or "gemini-3.6-flash",
            )
            raise HTTPException(
                status_code=429,
                detail="You've hit the demo message limit for now — try again later.",
            )

    model_name = request.config.model or (
        "gemini-3.6-flash" if request.config.provider == "gemini" else "default"
    )
    started = time.perf_counter()
    run_id = db.start_run(
        request.config.provider,
        model_name,
        request.config.name,
        len(request.message),
    )
    try:
        agent = Agent(
            config=request.config.model_dump(by_alias=True),
        )

        result, tools_used, unavailable, knowledge_sources, knowledge_error = agent.run_with_metadata(
            request.message, conversation_id
        )

        for tool_name in tools_used:
            db.log_tool(conversation_id, tool_name, "used")
        for tool_name in unavailable:
            db.log_tool(conversation_id, tool_name, "unavailable", "Tool is not implemented in Phase 2")

        db.finish_run(
            run_id,
            success=True,
            duration_ms=int((time.perf_counter() - started) * 1000),
            tools_used=tools_used,
        )

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
                "knowledge": request.config.knowledge,
                "knowledgeUsed": bool(knowledge_sources),
                "sources": knowledge_sources,
                **({"knowledgeError": "Knowledge retrieval was unavailable."} if knowledge_error else {}),
                "agentType": request.config.agent_type,
            },
            "provider": request.config.provider,
            "model": request.config.model or ("gemini-3.6-flash" if request.config.provider == "gemini" else "default"),
            "conversationId": conversation_id,
            "toolsUsed": tools_used,
            "memory": request.config.memory,
            "knowledge": request.config.knowledge,
            "knowledgeUsed": bool(knowledge_sources),
            "sources": knowledge_sources,
        }

    except ValueError as error:
        db.finish_run(
            run_id,
            success=False,
            duration_ms=int((time.perf_counter() - started) * 1000),
            error_type="request_error",
        )
        raise HTTPException(status_code=400, detail=str(error))

    except Exception:
        db.finish_run(
            run_id,
            success=False,
            duration_ms=int((time.perf_counter() - started) * 1000),
            error_type="provider_error",
        )
        logger.exception("Agent run failed for provider %s", request.config.provider)
        raise HTTPException(
            status_code=502,
            detail=f"{request.config.provider} didn't respond — try again, or switch providers.",
        )


@router.get("/stats")
def agent_stats():
    return db.get_stats()


@router.get("/runs")
def list_agent_runs(
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    runs, has_more = db.list_runs(limit=limit, offset=offset)
    return {
        "success": True,
        "runs": runs,
        "limit": limit,
        "offset": offset,
        "hasMore": has_more,
    }


@router.get("/runs/{run_id}")
def get_agent_run(run_id: int = Path(gt=0)):
    run = db.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Execution run not found.")
    return {"success": True, "run": run}


@router.get("/tools")
def agent_tools():
    return {"tools": registry(), "unavailable": []}
