import sqlite3
import uuid

from fastapi import APIRouter, HTTPException, Response
from pydantic import ValidationError

from app.models.agent_models import AgentConfig, SavedAgentCreate, SavedAgentPatch
from app.services import db


router = APIRouter(prefix="/api/agents", tags=["Saved agents"])


def _storage_error() -> HTTPException:
    return HTTPException(status_code=500, detail="Agent storage is unavailable.")


@router.post("", status_code=201)
def create_agent(payload: SavedAgentCreate):
    config = AgentConfig.model_validate(payload.model_dump(exclude={"description"}, by_alias=True))
    try:
        saved = db.create_saved_agent(
            str(uuid.uuid4()),
            payload.description,
            config.model_dump(by_alias=True),
        )
    except sqlite3.Error as error:
        raise _storage_error() from error
    return {"success": True, "agent": saved}


@router.get("")
def list_agents():
    try:
        return {"success": True, "agents": db.list_saved_agents()}
    except (sqlite3.Error, ValueError) as error:
        raise _storage_error() from error


@router.get("/{agent_id}")
def get_agent(agent_id: str):
    try:
        saved = db.get_saved_agent(agent_id)
    except (sqlite3.Error, ValueError) as error:
        raise _storage_error() from error
    if saved is None:
        raise HTTPException(status_code=404, detail="Agent not found.")
    return {"success": True, "agent": saved}


@router.patch("/{agent_id}")
def update_agent(agent_id: str, payload: SavedAgentPatch):
    try:
        existing = db.get_saved_agent(agent_id)
        if existing is None:
            raise HTTPException(status_code=404, detail="Agent not found.")

        changes = payload.model_dump(exclude_unset=True, by_alias=True)
        description = changes.pop("description", existing["description"])
        merged_config = {
            field.alias or field_name: existing[field.alias or field_name]
            for field_name, field in AgentConfig.model_fields.items()
        }
        merged_config.update(changes)
        config = AgentConfig.model_validate(merged_config)

        saved = db.update_saved_agent(
            agent_id,
            description or "",
            config.model_dump(by_alias=True),
        )
    except HTTPException:
        raise
    except (sqlite3.Error, ValueError, ValidationError) as error:
        if isinstance(error, ValidationError):
            raise HTTPException(status_code=400, detail="Invalid agent configuration.") from error
        raise _storage_error() from error

    if saved is None:
        raise HTTPException(status_code=404, detail="Agent not found.")
    return {"success": True, "agent": saved}


@router.delete("/{agent_id}")
def delete_agent(agent_id: str):
    try:
        deleted = db.delete_saved_agent(agent_id)
    except sqlite3.Error as error:
        raise _storage_error() from error
    if not deleted:
        raise HTTPException(status_code=404, detail="Agent not found.")
    return Response(status_code=204)
