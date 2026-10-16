from contextlib import asynccontextmanager
import os
from urllib.parse import urlsplit

from dotenv import load_dotenv
load_dotenv()  # reads backend/.env into environment variables, before anything needs GEMINI_API_KEY

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.agent_routes import router as agent_router
from app.api.knowledge_routes import router as knowledge_router
from app.api.saved_agents_routes import router as saved_agents_router
from app.services import db

DEVELOPMENT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]


def _configured_cors_origins() -> list[str]:
    environment = os.getenv("APP_ENV", "development").strip().lower()
    if environment not in {"development", "production"}:
        raise RuntimeError("APP_ENV must be 'development' or 'production'.")

    configured = os.getenv("CORS_ORIGINS")
    if configured is None:
        if environment == "production":
            raise RuntimeError("CORS_ORIGINS must be configured in production.")
        return DEVELOPMENT_CORS_ORIGINS

    origins = [origin.strip().rstrip("/") for origin in configured.split(",")]
    if not origins or any(not origin for origin in origins):
        raise RuntimeError("CORS_ORIGINS must contain one or more valid origins.")

    for origin in origins:
        try:
            parsed = urlsplit(origin)
            parsed.port
        except ValueError as error:
            raise RuntimeError(
                "CORS_ORIGINS entries must be specific HTTP or HTTPS origins."
            ) from error
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username is not None
            or parsed.password is not None
            or parsed.path
            or parsed.query
            or parsed.fragment
            or "*" in origin
        ):
            raise RuntimeError(
                "CORS_ORIGINS entries must be specific HTTP or HTTPS origins."
            )

    return list(dict.fromkeys(origins))


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


app = FastAPI(
    title="AGENT_FORGE Backend",
    description="Python backend for AGENT_FORGE",
    version="1.0.0",
    lifespan=lifespan,
)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content={
            "detail": "Invalid request configuration",
            "errors": [
                {
                    "loc": error.get("loc"),
                    "msg": error.get("msg"),
                    "type": error.get("type"),
                }
                for error in exc.errors()
            ],
        },
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=_configured_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)


app.include_router(agent_router)
app.include_router(knowledge_router)
app.include_router(saved_agents_router)


@app.get("/")
def root():
    return {
        "message": "AGENT_FORGE Python backend is running!"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


@app.get("/api/test")
def test_api():
    return {
        "success": True,
        "message": "React can communicate with Python!",
        "backend": "FastAPI",
        "language": "Python"
    }