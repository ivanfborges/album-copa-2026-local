from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

import httpx

from .config import Settings
from .schemas import ToolResult

logger = logging.getLogger(__name__)

MAX_WEB_ANSWER_CHARS = 2400
MAX_WEB_SOURCES = 8


def _disabled_result(reason: str) -> ToolResult:
    return ToolResult(
        name="search_world_cup_news",
        summary=reason,
        data={
            "enabled": False,
            "provider": "openai_web_search",
            "reason": reason,
        },
    )


def _add_source(sources: list[dict[str, str]], seen: set[str], source: object) -> None:
    if not isinstance(source, dict):
        return

    url = source.get("url")

    if not isinstance(url, str) or not url.startswith(("http://", "https://")):
        return

    if url in seen:
        return

    title = source.get("title")
    sources.append(
        {
            "title": str(title or url),
            "url": url,
        }
    )
    seen.add(url)


def _extract_response_text(payload: dict[str, Any]) -> str:
    output_text = payload.get("output_text")

    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    parts: list[str] = []

    for item in payload.get("output", []):
        if not isinstance(item, dict) or item.get("type") != "message":
            continue

        for content in item.get("content", []):
            if not isinstance(content, dict):
                continue

            text = content.get("text")

            if isinstance(text, str) and text.strip():
                parts.append(text.strip())

    return "\n\n".join(parts).strip()


def _extract_sources(payload: dict[str, Any]) -> list[dict[str, str]]:
    sources: list[dict[str, str]] = []
    seen: set[str] = set()

    for item in payload.get("output", []):
        if not isinstance(item, dict):
            continue

        if item.get("type") == "web_search_call":
            action = item.get("action")

            if isinstance(action, dict):
                for source in action.get("sources", []):
                    _add_source(sources, seen, source)

        if item.get("type") != "message":
            continue

        for content in item.get("content", []):
            if not isinstance(content, dict):
                continue

            for annotation in content.get("annotations", []):
                if isinstance(annotation, dict) and annotation.get("type") == "url_citation":
                    _add_source(sources, seen, annotation)

    return sources[:MAX_WEB_SOURCES]


def _build_request_body(message: str, settings: Settings) -> dict[str, Any]:
    tool: dict[str, Any] = {
        "type": "web_search",
        "search_context_size": settings.openai_web_search_context_size,
    }

    if settings.web_search_allowed_domains:
        tool["filters"] = {"allowed_domains": settings.web_search_allowed_domains[:100]}

    today = datetime.now(UTC).date().isoformat()

    return {
        "model": settings.openai_web_search_model,
        "tools": [tool],
        "tool_choice": "required",
        "include": ["web_search_call.action.sources"],
        "input": (
            "Pesquise na web atualizacoes recentes e confiaveis sobre a Copa do Mundo FIFA 2026. "
            "Responda em portugues do Brasil, seja breve, cite somente fatos encontrados e inclua fontes. "
            f"Data atual: {today}.\n\n"
            f"Pergunta: {message}"
        ),
    }


async def search_world_cup_news(message: str, settings: Settings) -> ToolResult:
    if not settings.web_search_enabled:
        return _disabled_result(
            "Busca web nao esta habilitada. Ative WEB_SEARCH_ENABLED=true no ai-service/.env para noticias recentes."
        )

    if settings.web_search_provider != "openai":
        return _disabled_result(f"Provider de busca web nao suportado: {settings.web_search_provider}.")

    if not settings.openai_api_key:
        return _disabled_result("OPENAI_API_KEY nao esta configurada no backend para busca web.")

    request_started = datetime.now(UTC).isoformat()
    logger.info(
        "web_search.start provider=openai model=%s context_size=%s allowed_domains=%s",
        settings.openai_web_search_model,
        settings.openai_web_search_context_size,
        ",".join(settings.web_search_allowed_domains),
    )

    try:
        async with httpx.AsyncClient(timeout=settings.provider_timeout_seconds) as client:
            response = await client.post(
                "https://api.openai.com/v1/responses",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json=_build_request_body(message, settings),
            )
            logger.info("web_search.http_response status=%s", response.status_code)
            response.raise_for_status()
            payload = response.json()
    except Exception as error:
        logger.exception("web_search.failed")
        return ToolResult(
            name="search_world_cup_news",
            summary="Busca web falhou; responda sem inventar noticias recentes.",
            data={
                "enabled": True,
                "provider": "openai_web_search",
                "error": str(error),
            },
        )

    answer = _extract_response_text(payload)
    sources = _extract_sources(payload)

    if not answer:
        return ToolResult(
            name="search_world_cup_news",
            summary="Busca web executada, mas sem texto de resposta utilizavel.",
            data={
                "enabled": True,
                "provider": "openai_web_search",
                "model": settings.openai_web_search_model,
                "sources": sources,
                "searched_at": request_started,
            },
        )

    return ToolResult(
        name="search_world_cup_news",
        summary=f"Busca web concluida com {len(sources)} fonte(s).",
        data={
            "enabled": True,
            "provider": "openai_web_search",
            "model": settings.openai_web_search_model,
            "query": message,
            "answer": answer[:MAX_WEB_ANSWER_CHARS],
            "sources": sources,
            "searched_at": request_started,
        },
    )
