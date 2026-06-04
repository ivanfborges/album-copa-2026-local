from __future__ import annotations

import os
from dataclasses import dataclass

try:
    from dotenv import load_dotenv
except Exception:  # pragma: no cover - python-dotenv is optional at import time
    load_dotenv = None

if load_dotenv is not None:
    load_dotenv()


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def _parse_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


@dataclass(frozen=True)
class Settings:
    provider: str
    log_level: str
    provider_timeout_seconds: float
    allowed_origins: list[str]
    ollama_base_url: str
    ollama_model: str
    ollama_think: bool
    openai_api_key: str | None
    openai_model: str
    openai_reasoning_effort: str
    web_search_enabled: bool
    web_search_provider: str
    openai_web_search_model: str
    openai_web_search_context_size: str
    web_search_allowed_domains: list[str]


def get_settings() -> Settings:
    return Settings(
        provider=os.getenv("AI_PROVIDER", "ollama").strip().lower(),
        log_level=os.getenv("AI_LOG_LEVEL", "INFO").strip().upper(),
        provider_timeout_seconds=float(os.getenv("AI_PROVIDER_TIMEOUT_SECONDS", "240")),
        allowed_origins=_split_csv(
            os.getenv(
                "AI_ALLOWED_ORIGINS",
                "http://127.0.0.1:3001,http://localhost:3001",
            )
        ),
        ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/"),
        ollama_model=os.getenv("OLLAMA_MODEL", "qwen3:4b"),
        ollama_think=_parse_bool(os.getenv("OLLAMA_THINK", "false")),
        openai_api_key=os.getenv("OPENAI_API_KEY") or None,
        openai_model=os.getenv("OPENAI_MODEL", "gpt-5.4-nano"),
        openai_reasoning_effort=os.getenv("OPENAI_REASONING_EFFORT", "none").strip().lower(),
        web_search_enabled=_parse_bool(os.getenv("WEB_SEARCH_ENABLED", "false")),
        web_search_provider=os.getenv("WEB_SEARCH_PROVIDER", "openai").strip().lower(),
        openai_web_search_model=os.getenv("OPENAI_WEB_SEARCH_MODEL", "gpt-5.4-mini").strip(),
        openai_web_search_context_size=os.getenv("OPENAI_WEB_SEARCH_CONTEXT_SIZE", "low").strip().lower(),
        web_search_allowed_domains=_split_csv(os.getenv("WEB_SEARCH_ALLOWED_DOMAINS", "fifa.com")),
    )
