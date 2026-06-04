from __future__ import annotations

import logging
from typing import Any, TypedDict

from .providers import MockProvider, get_provider
from .schemas import AlbumSnapshot, ChatMessage, ToolResult
from .tools import message_asks_news, plan_tool_results
from .web_search import search_world_cup_news

logger = logging.getLogger(__name__)

try:
    from langgraph.graph import END, StateGraph
except Exception:  # pragma: no cover - fallback for minimal local installs
    END = "__end__"
    StateGraph = None


class AgentState(TypedDict):
    message: str
    snapshot: AlbumSnapshot
    history: list[ChatMessage]
    provider_name: str | None
    tool_results: list[ToolResult]
    answer: str
    answer_provider: str
    degraded: bool


class AIvanAgent:
    def __init__(self, settings: Any) -> None:
        self.settings = settings
        self.graph = self._build_graph()

    def _build_graph(self):
        if StateGraph is None:
            logger.info("agent.graph unavailable=langgraph_import_failed")
            return None

        graph = StateGraph(AgentState)
        graph.add_node("select_tools", self._select_tools)
        graph.add_node("respond", self._respond)
        graph.set_entry_point("select_tools")
        graph.add_edge("select_tools", "respond")
        graph.add_edge("respond", END)
        return graph.compile()

    async def _select_tools(self, state: AgentState) -> dict[str, Any]:
        web_search_result = None

        if message_asks_news(state["message"]):
            web_search_result = await search_world_cup_news(state["message"], self.settings)

        tool_results = plan_tool_results(
            state["message"],
            state["snapshot"],
            web_search_result=web_search_result,
        )
        logger.info(
            "agent.tools selected=%s message_chars=%s stickers=%s events=%s",
            ",".join(tool.name for tool in tool_results),
            len(state["message"]),
            len(state["snapshot"].stickers),
            len(state["snapshot"].events),
        )
        return {"tool_results": tool_results}

    async def _respond(self, state: AgentState) -> dict[str, Any]:
        provider = get_provider(self.settings, state.get("provider_name"))
        logger.info("agent.provider selected=%s", provider.name)

        try:
            answer = await provider.generate(
                state["message"],
                state["tool_results"],
                state["history"],
            )
            logger.info("agent.answer provider=%s chars=%s degraded=false", provider.name, len(answer))
            return {"answer": answer, "answer_provider": provider.name, "degraded": False}
        except Exception:
            logger.exception("agent.provider_failed provider=%s", provider.name)

            if provider.name != "openai" and self.settings.openai_api_key:
                openai_provider = get_provider(self.settings, "openai")
                logger.info(
                    "agent.provider_fallback selected=%s reason=primary_failed",
                    openai_provider.name,
                )

                try:
                    answer = await openai_provider.generate(
                        state["message"],
                        state["tool_results"],
                        state["history"],
                    )
                    logger.info(
                        "agent.answer provider=%s chars=%s degraded=true",
                        openai_provider.name,
                        len(answer),
                    )
                    return {
                        "answer": answer,
                        "answer_provider": openai_provider.name,
                        "degraded": True,
                    }
                except Exception:
                    logger.exception("agent.provider_fallback_failed provider=%s", openai_provider.name)

            fallback = await MockProvider().generate(
                state["message"],
                state["tool_results"],
                state["history"],
            )
            return {
                "answer": (
                    f"{fallback}\n\n"
                    "Observacao: nenhum modelo generativo respondeu agora. "
                    "A resposta acima foi montada somente com as tools locais da colecao."
                ),
                "answer_provider": "mock",
                "degraded": True,
            }

    async def invoke(
        self,
        message: str,
        snapshot: AlbumSnapshot,
        history: list[ChatMessage],
        provider_name: str | None,
    ) -> AgentState:
        state: AgentState = {
            "message": message,
            "snapshot": snapshot,
            "history": history,
            "provider_name": provider_name,
            "tool_results": [],
            "answer": "",
            "answer_provider": provider_name or self.settings.provider,
            "degraded": False,
        }

        if self.graph is None:
            state.update(await self._select_tools(state))
            state.update(await self._respond(state))
            return state

        result = await self.graph.ainvoke(state)
        return result
