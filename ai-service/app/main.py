from __future__ import annotations

import logging
import time

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request

from .agent import AIvanAgent
from .config import get_settings
from .observability import configure_logging, start_request_context
from .schemas import ChatRequest, ChatResponse

settings = get_settings()
configure_logging(settings.log_level)
logger = logging.getLogger(__name__)
agent = AIvanAgent(settings)
logger.info(
    "service.start provider=%s ollama_model=%s ollama_base_url=%s timeout=%ss allowed_origins=%s",
    settings.provider,
    settings.ollama_model,
    settings.ollama_base_url,
    settings.provider_timeout_seconds,
    ",".join(settings.allowed_origins),
)

app = FastAPI(
    title="AIvan local AI service",
    version="0.1.0",
    description="Local-first AI service for the Copa 2026 album tracker.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_logs(request: Request, call_next):
    request_id, started = start_request_context()
    logger.info("request.start id=%s method=%s path=%s", request_id, request.method, request.url.path)

    try:
        response = await call_next(request)
    except Exception:
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.exception(
            "request.error id=%s method=%s path=%s elapsed_ms=%s",
            request_id,
            request.method,
            request.url.path,
            elapsed_ms,
        )
        raise

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    logger.info(
        "request.end id=%s method=%s path=%s status=%s elapsed_ms=%s",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    response.headers["X-Request-ID"] = request_id
    return response


@app.get("/health")
async def health() -> dict[str, str]:
    return {
        "status": "ok",
        "provider": settings.provider,
        "ollama_model": settings.ollama_model,
        "ollama_base_url": settings.ollama_base_url,
    }


@app.get("/health/ollama")
async def health_ollama() -> dict[str, object]:
    started = time.perf_counter()

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(f"{settings.ollama_base_url}/api/tags")
            response.raise_for_status()
            payload = response.json()
    except Exception as error:
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.exception("health.ollama failed elapsed_ms=%s", elapsed_ms)
        return {
            "status": "error",
            "ollama_base_url": settings.ollama_base_url,
            "error": str(error),
            "elapsed_ms": elapsed_ms,
        }

    models = [
        item.get("name")
        for item in payload.get("models", [])
        if isinstance(item, dict) and item.get("name")
    ]
    elapsed_ms = int((time.perf_counter() - started) * 1000)
    logger.info("health.ollama ok models=%s elapsed_ms=%s", len(models), elapsed_ms)

    return {
        "status": "ok",
        "ollama_base_url": settings.ollama_base_url,
        "configured_model": settings.ollama_model,
        "models": models,
        "elapsed_ms": elapsed_ms,
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    logger.info(
        "chat.input provider=%s message_chars=%s history=%s stickers=%s events=%s owned=%s missing=%s repeated=%s",
        request.provider or settings.provider,
        len(request.message),
        len(request.history),
        len(request.snapshot.stickers),
        len(request.snapshot.events),
        request.snapshot.stats.owned_unique,
        request.snapshot.stats.missing,
        request.snapshot.stats.repeated_total,
    )
    result = await agent.invoke(
        message=request.message,
        snapshot=request.snapshot,
        history=request.history,
        provider_name=request.provider,
    )
    logger.info(
        "chat.output provider=%s degraded=%s answer_chars=%s tools=%s",
        result["answer_provider"],
        result["degraded"],
        len(result["answer"]),
        ",".join(tool.name for tool in result["tool_results"]),
    )

    return ChatResponse(
        answer=result["answer"],
        provider=result["answer_provider"],
        tools=result["tool_results"],
        degraded=result["degraded"],
    )
