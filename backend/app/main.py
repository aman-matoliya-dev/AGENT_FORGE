from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()  # reads backend/.env into environment variables, before anything needs GEMINI_API_KEY

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.agent_routes import router as agent_router
from app.api.knowledge_routes import router as knowledge_router
from app.services import db


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
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(agent_router)
app.include_router(knowledge_router)


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