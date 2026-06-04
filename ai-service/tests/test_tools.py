from __future__ import annotations

import unittest

from app.schemas import AlbumSnapshot
from app.tools import (
    generate_whatsapp_trade_message,
    get_next_best_action,
    get_trade_strategy,
    plan_tool_results,
    rank_trade_candidates,
)
from app.web_search import _extract_response_text, _extract_sources


def build_snapshot() -> AlbumSnapshot:
    return AlbumSnapshot(
        album_nickname="Album teste",
        exported_at="2026-05-21T12:00:00.000Z",
        stats={
            "total": 4,
            "owned_unique": 2,
            "missing": 2,
            "repeated_unique": 1,
            "repeated_total": 1,
            "total_obtained": 3,
            "completion": 50,
        },
        stickers=[
            {
                "id": "BRA1",
                "code": "BRA 1",
                "section_code": "BRA",
                "section_name": "Brazil",
                "team_code": "BRA",
                "team_name": "Brazil",
                "number": 1,
                "title": "Team Logo",
                "type": "badge",
                "is_special": True,
                "quantity": 2,
            },
            {
                "id": "BRA2",
                "code": "BRA 2",
                "section_code": "BRA",
                "section_name": "Brazil",
                "team_code": "BRA",
                "team_name": "Brazil",
                "number": 2,
                "title": "Player",
                "type": "player",
                "is_special": False,
                "quantity": 1,
            },
            {
                "id": "ARG13",
                "code": "ARG 13",
                "section_code": "ARG",
                "section_name": "Argentina",
                "team_code": "ARG",
                "team_name": "Argentina",
                "number": 13,
                "title": "Team Photo",
                "type": "team_photo",
                "is_special": False,
                "quantity": 0,
            },
            {
                "id": "FWC1",
                "code": "FWC 1",
                "section_code": "FWC",
                "section_name": "World Cup History",
                "team_code": "FWC",
                "team_name": "World Cup History",
                "number": 1,
                "title": "Official Emblem",
                "type": "special",
                "is_special": True,
                "quantity": 0,
            },
        ],
        events=[
            {
                "id": "event-1",
                "occurred_at": "2026-05-21T12:00:00.000Z",
                "created_at": "2026-05-21T12:00:00.000Z",
                "type": "bulk-add",
                "source": "pack",
                "total_stickers": 7,
                "unique_stickers": 3,
                "repeated_stickers": 4,
                "affected_stickers": 7,
            }
        ],
        forecast={
            "status": "ready",
            "estimatedDays": 35,
            "optimisticDays": 21,
            "conservativeDays": 70,
            "confidence": "medium",
        },
        trade_strategy={
            "summary": "Use 1 repetida forte e busque 2 faltantes prioritarias",
            "topDuplicateCandidates": [
                {
                    "stickerId": "BRA1",
                    "displayCode": "BRA 1",
                    "sectionCode": "BRA",
                    "sectionName": "Brazil",
                    "quantity": 2,
                    "extraCopies": 1,
                    "score": 70,
                    "priority": "alta",
                    "reasons": ["escudo brilhante"],
                }
            ],
            "topMissingTargets": [
                {
                    "stickerId": "FWC1",
                    "displayCode": "FWC 1",
                    "sectionCode": "FWC",
                    "sectionName": "World Cup History",
                    "quantity": 0,
                    "extraCopies": 0,
                    "score": 92,
                    "priority": "alta",
                    "reasons": ["especial FWC"],
                },
                {
                    "stickerId": "ARG13",
                    "displayCode": "ARG 13",
                    "sectionCode": "ARG",
                    "sectionName": "Argentina",
                    "quantity": 0,
                    "extraCopies": 0,
                    "score": 58,
                    "priority": "media",
                    "reasons": ["foto do time"],
                },
            ],
        },
        next_best_action={
            "action": "buy_and_trade",
            "title": "Agora: combinar compra e troca",
            "recommendation": "Compre poucos pacotes e troque as repetidas mais fortes",
            "confidence": "media",
            "reasons": ["Combinar compra controlada com troca reduz dependencia de sorte"],
            "risks": ["Depende de encontrar parceiros de troca"],
            "suggestedPackCount": 5,
            "suggestedTradeTargets": ["FWC 1", "ARG 13"],
            "suggestedDuplicateCodes": ["BRA 1"],
        },
    )


class ToolTests(unittest.TestCase):
    def test_get_next_best_action_uses_precomputed_snapshot_data(self) -> None:
        result = get_next_best_action(build_snapshot())

        self.assertEqual(result.name, "get_next_best_action")
        self.assertEqual(result.data["next_best_action"]["action"], "buy_and_trade")
        self.assertIn("Compre poucos pacotes", result.summary)

    def test_trade_strategy_tools_rank_precomputed_candidates(self) -> None:
        snapshot = build_snapshot()
        strategy_result = get_trade_strategy(snapshot)
        rank_result = rank_trade_candidates(snapshot)

        self.assertEqual(strategy_result.data["top_duplicate_candidates"][0]["displayCode"], "BRA 1")
        self.assertEqual(rank_result.data["top_missing_targets"][0]["displayCode"], "FWC 1")

    def test_generate_whatsapp_trade_message_uses_trade_codes(self) -> None:
        result = generate_whatsapp_trade_message(build_snapshot())

        self.assertIn("BRA 1", result.data["text"])
        self.assertIn("FWC 1", result.data["text"])
        self.assertEqual(result.data["duplicate_codes"], ["BRA 1"])

    def test_plan_tool_results_routes_agentic_questions(self) -> None:
        snapshot = build_snapshot()
        action_tools = [
            tool.name for tool in plan_tool_results("Qual e minha proxima melhor acao?", snapshot)
        ]
        trade_text_tools = [
            tool.name for tool in plan_tool_results("Gere texto de troca para WhatsApp", snapshot)
        ]

        self.assertIn("get_next_best_action", action_tools)
        self.assertIn("generate_whatsapp_trade_message", trade_text_tools)

    def test_plan_tool_results_routes_news_to_web_search(self) -> None:
        tools = plan_tool_results("Quais sao as ultimas noticias da Copa 2026?", build_snapshot())
        web_tool = next(tool for tool in tools if tool.name == "search_world_cup_news")

        self.assertIs(web_tool.data["enabled"], False)
        self.assertEqual(web_tool.data["provider"], "openai_web_search")

    def test_web_search_response_parsing_extracts_answer_and_sources(self) -> None:
        payload = {
            "output": [
                {
                    "type": "web_search_call",
                    "action": {
                        "sources": [
                            {"title": "FIFA update", "url": "https://www.fifa.com/test"}
                        ]
                    },
                },
                {
                    "type": "message",
                    "content": [
                        {
                            "type": "output_text",
                            "text": "Atualizacao recente com fonte.",
                            "annotations": [
                                {
                                    "type": "url_citation",
                                    "title": "FIFA citation",
                                    "url": "https://www.fifa.com/test",
                                }
                            ],
                        }
                    ],
                },
            ]
        }

        self.assertEqual(_extract_response_text(payload), "Atualizacao recente com fonte.")
        self.assertEqual(_extract_sources(payload), [{"title": "FIFA update", "url": "https://www.fifa.com/test"}])

    def test_missing_precomputed_strategy_returns_unavailable(self) -> None:
        snapshot = build_snapshot()
        snapshot.trade_strategy = None
        result = get_trade_strategy(snapshot)

        self.assertIs(result.data["available"], False)
        self.assertEqual(result.data["missing_field"], "trade_strategy")


if __name__ == "__main__":
    unittest.main()
