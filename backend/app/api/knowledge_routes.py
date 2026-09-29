from fastapi import APIRouter, File, HTTPException, UploadFile

from app.models.knowledge_models import KnowledgeSearchRequest
from app.services.knowledge import MAX_UPLOAD_BYTES, knowledge_service

router = APIRouter(prefix="/api/knowledge", tags=["Knowledge"])
@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="A filename is required.")
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"The uploaded file exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MiB size limit.",
        )

    try:
        result = knowledge_service.upload_document(file.filename, content, content_type=file.content_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {"success": True, "document": result}


@router.get("/documents")
def list_documents():
    return {"success": True, "documents": knowledge_service.list_documents()}


@router.post("/search")
def search_documents(payload: KnowledgeSearchRequest):
    try:
        return knowledge_service.search(payload.query, top_k=payload.top_k)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/documents/{document_id}")
def delete_document(document_id: str):
    try:
        return knowledge_service.delete_document(document_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/status")
def knowledge_status():
    return knowledge_service.status()
