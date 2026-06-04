from __future__ import annotations

import json
import logging
import time
from typing import Protocol

import httpx

from .config import Settings
from .schemas import ChatMessage, ToolResult

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """
Voce e o AIvan, um assistente conversacional local para uma colecao pessoal do album Copa 2026.
Sua funcao e transformar dados deterministicos da colecao em respostas finais claras para o usuario.

Regras obrigatorias:
- Responda sempre em portugues do Brasil.
- Entregue somente a resposta final, pronta para o usuario ler.
- Nunca exponha planejamento interno, cadeia de pensamento, rascunhos, analise ou passos privados.
- Nunca escreva frases como "Okay, let's see", "I need to", "the user asked" ou "as tools dizem".
- Quando usar dados das tools, fale como "sua colecao mostra" ou "hoje voce tem".
- Use somente o contexto das tools fornecidas; nao invente quantidades, codigos ou noticias.
- Se o usuario pedir noticias da internet e a tool disser que busca web nao esta habilitada, explique isso com clareza.
- Se a tool search_world_cup_news trouxer fontes, inclua os links principais na resposta final.
- Prefira respostas curtas, diretas e com bullets quando ajudar.
""".strip()

MAX_GROUPS_FOR_LLM = 10
MAX_CODES_PER_GROUP = 16
MAX_ITEMS_FOR_LLM = 8


def _compact_codes(codes: object) -> object:
    if not isinstance(codes, list):
        return codes

    visible_codes = codes[:MAX_CODES_PER_GROUP]
    omitted = max(0, len(codes) - len(visible_codes))

    if omitted:
        return [*visible_codes, f"... mais {omitted}"]

    return visible_codes


def _compact_group(group: object) -> object:
    if not isinstance(group, dict):
        return group

    compact = dict(group)

    if "codes" in compact:
        compact["codes"] = _compact_codes(compact["codes"])

    return compact


def _compact_groups(groups: object) -> object:
    if not isinstance(groups, list):
        return groups

    visible_groups = [_compact_group(group) for group in groups[:MAX_GROUPS_FOR_LLM]]
    omitted = max(0, len(groups) - len(visible_groups))

    if omitted:
        visible_groups.append({"omitted_groups": omitted})

    return visible_groups


def _compact_tool_data(data: dict[str, object]) -> dict[str, object]:
    compact: dict[str, object] = {}

    for key, value in data.items():
        if key in {"groups", "strongest_trade_sections", "priority_missing_sections"}:
            compact[key] = _compact_groups(value)
        elif key in {
            "top_duplicate_candidates",
            "top_missing_targets",
        } and isinstance(value, list):
            compact[key] = value[:MAX_ITEMS_FOR_LLM]
        elif key in {"text", "answer"} and isinstance(value, str):
            compact[key] = value[:2000]
        elif key == "sources" and isinstance(value, list):
            compact[key] = value[:6]
        else:
            compact[key] = value

    return compact


class ChatProvider(Protocol):
    name: str

    async def generate(
        self,
        message: str,
        tool_results: list[ToolResult],
        history: list[ChatMessage],
    ) -> str:
        ...


def _build_user_prompt(message: str, tool_results: list[ToolResult]) -> str:
    context = [
        {
            "name": result.name,
            "summary": result.summary,
            "data": _compact_tool_data(result.data),
        }
        for result in tool_results
    ]

    return (
        "/no_think\n"
        "Responda SOMENTE a resposta final em portugues do Brasil. "
        "Nao mostre raciocinio, analise, planejamento ou comentarios sobre tools.\n\n"
        "Pergunta do usuario:\n"
        f"{message}\n\n"
        "Contexto deterministico das tools em JSON:\n"
        f"{json.dumps(context, ensure_ascii=False, indent=2)}"
    )


def _remove_think_blocks(content: str) -> str:
    cleaned = content

    while True:
        lower = cleaned.lower()
        start = lower.find("<think>")
        end = lower.find("</think>")

        if start == -1 or end == -1 or end < start:
            break

        cleaned = f"{cleaned[:start]}{cleaned[end + len('</think>'):]}"

    return cleaned.strip()


def _looks_like_reasoning_leak(content: str) -> bool:
    lower = content.lower()
    markers = (
        "okay, let's see",
        "the user asked",
        "i need to",
        "first, check",
        "wait,",
        "so the response should",
        "the tools",
        "the get_album_summary",
    )
    return any(marker in lower for marker in markers)


def _finalize_answer(content: str) -> str:
    cleaned = _remove_think_blocks(content)

    if not cleaned:
        raise RuntimeError("Provider returned an empty final answer.")

    if _looks_like_reasoning_leak(cleaned):
        raise RuntimeError("Provider returned reasoning instead of a final answer.")

    return cleaned


class MockProvider:
    name = "mock"

    async def generate(
        self,
        message: str,
        tool_results: list[ToolResult],
        history: list[ChatMessage],
    ) -> str:
        _ = message, history
        lines = ["Consultei a sua colecao local:"]
        lines.extend(f"- {result.summary}" for result in tool_results)
        return "\n".join(lines)


class OllamaProvider:
    name = "ollama"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def generate(
        self,
        message: str,
        tool_results: list[ToolResult],
        history: list[ChatMessage],
    ) -> str:
        user_prompt = _build_user_prompt(message, tool_results)
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages.extend({"role": item.role, "content": item.content} for item in history[-8:])
        messages.append({"role": "user", "content": user_prompt})

        request_started = time.perf_counter()
        tool_names = [tool.name for tool in tool_results]
        logger.info(
            "ollama.start model=%s base_url=%s timeout=%ss think=%s messages=%s prompt_chars=%s tools=%s",
            self.settings.ollama_model,
            self.settings.ollama_base_url,
            self.settings.provider_timeout_seconds,
            self.settings.ollama_think,
            len(messages),
            len(user_prompt),
            ",".join(tool_names),
        )

        async with httpx.AsyncClient(timeout=self.settings.provider_timeout_seconds) as client:
            response = await client.post(
                f"{self.settings.ollama_base_url}/api/chat",
                json={
                    "model": self.settings.ollama_model,
                    "messages": messages,
                    "stream": False,
                    "think": self.settings.ollama_think,
                    "keep_alive": "10m",
                    "options": {
                        "temperature": 0.2,
                        "num_ctx": 4096,
                        "num_predict": 512,
                    },
                },
            )
            elapsed_ms = int((time.perf_counter() - request_started) * 1000)
            logger.info(
                "ollama.http_response status=%s elapsed_ms=%s",
                response.status_code,
                elapsed_ms,
            )
            response.raise_for_status()
            payload = response.json()

        content = payload.get("message", {}).get("content")
        logger.info(
            "ollama.payload done=%s done_reason=%s content_chars=%s prompt_eval_count=%s eval_count=%s total_duration=%s",
            payload.get("done"),
            payload.get("done_reason"),
            len(content or ""),
            payload.get("prompt_eval_count"),
            payload.get("eval_count"),
            payload.get("total_duration"),
        )

        if not content:
            logger.warning("ollama.empty_response payload_keys=%s", sorted(payload.keys()))
            raise RuntimeError("Ollama returned an empty response.")

        return _finalize_answer(str(content))


class OpenAIProvider:
    name = "openai"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def generate(
        self,
        message: str,
        tool_results: list[ToolResult],
        history: list[ChatMessage],
    ) -> str:
        if not self.settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured.")

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages.extend({"role": item.role, "content": item.content} for item in history[-8:])
        messages.append({"role": "user", "content": _build_user_prompt(message, tool_results)})

        request_started = time.perf_counter()
        logger.info(
            "openai.start model=%s reasoning_effort=%s timeout=%ss tools=%s",
            self.settings.openai_model,
            self.settings.openai_reasoning_effort,
            self.settings.provider_timeout_seconds,
            ",".join(tool.name for tool in tool_results),
        )

        async with httpx.AsyncClient(timeout=self.settings.provider_timeout_seconds) as client:
            request_body = {
                "model": self.settings.openai_model,
                "messages": messages,
                "max_completion_tokens": 700,
            }

            if self.settings.openai_model.startswith("gpt-5"):
                request_body["reasoning_effort"] = self.settings.openai_reasoning_effort

            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json=request_body,
            )
            elapsed_ms = int((time.perf_counter() - request_started) * 1000)
            logger.info("openai.http_response status=%s elapsed_ms=%s", response.status_code, elapsed_ms)
            response.raise_for_status()
            payload = response.json()

        content = payload.get("choices", [{}])[0].get("message", {}).get("content")
        logger.info("openai.payload content_chars=%s", len(content or ""))

        if not content:
            logger.warning("openai.empty_response payload_keys=%s", sorted(payload.keys()))
            raise RuntimeError("OpenAI returned an empty response.")

        return _finalize_answer(str(content))


def get_provider(settings: Settings, provider_name: str | None = None) -> ChatProvider:
    selected = (provider_name or settings.provider).strip().lower()

    if selected == "mock":
        return MockProvider()

    if selected == "openai":
        return OpenAIProvider(settings)

    return OllamaProvider(settings)
