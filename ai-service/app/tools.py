from __future__ import annotations

import re
from collections import OrderedDict
from typing import Any

from .schemas import AlbumSnapshot, StickerSnapshot, ToolResult


def _ordered_sections(snapshot: AlbumSnapshot) -> OrderedDict[str, dict[str, Any]]:
    sections: OrderedDict[str, dict[str, Any]] = OrderedDict()

    for sticker in snapshot.stickers:
        if sticker.section_code not in sections:
            sections[sticker.section_code] = {
                "code": sticker.section_code,
                "name": sticker.section_name,
                "stickers": [],
            }

        sections[sticker.section_code]["stickers"].append(sticker)

    return sections


def _format_sticker_codes(stickers: list[StickerSnapshot], include_quantity: bool = False) -> list[str]:
    labels: list[str] = []

    for sticker in stickers:
        if include_quantity:
            labels.append(f"{sticker.code} (x{max(1, sticker.quantity - 1)})")
        else:
            labels.append(sticker.code)

    return labels


def _section_from_message(message: str, snapshot: AlbumSnapshot) -> str | None:
    candidates = {sticker.section_code.upper() for sticker in snapshot.stickers}
    tokens = re.findall(r"\b[A-Z]{2,7}\b", message.upper())

    for token in tokens:
        if token in candidates:
            return token

    normalized = message.casefold()

    for section in _ordered_sections(snapshot).values():
        if section["name"].casefold() in normalized:
            return section["code"]

    return None


def _filter_section(stickers: list[StickerSnapshot], section_code: str | None) -> list[StickerSnapshot]:
    if not section_code:
        return stickers

    return [sticker for sticker in stickers if sticker.section_code == section_code]


def get_album_summary(snapshot: AlbumSnapshot) -> ToolResult:
    data = {
        "album": snapshot.album_nickname,
        "total": snapshot.stats.total,
        "owned_unique": snapshot.stats.owned_unique,
        "missing": snapshot.stats.missing,
        "repeated_unique": snapshot.stats.repeated_unique,
        "repeated_total": snapshot.stats.repeated_total,
        "total_obtained": snapshot.stats.total_obtained,
        "completion": snapshot.stats.completion,
        "event_count": len(snapshot.events),
    }

    return ToolResult(
        name="get_album_summary",
        summary=(
            f"{data['completion']}% concluido, {data['owned_unique']} unicas, "
            f"{data['missing']} faltantes e {data['repeated_total']} repetidas extras."
        ),
        data=data,
    )


def get_missing_stickers(snapshot: AlbumSnapshot, section_code: str | None = None) -> ToolResult:
    groups: list[dict[str, Any]] = []

    for section in _ordered_sections(snapshot).values():
        if section_code and section["code"] != section_code:
            continue

        missing = [sticker for sticker in section["stickers"] if sticker.quantity == 0]

        if missing:
            groups.append(
                {
                    "section_code": section["code"],
                    "section_name": section["name"],
                    "count": len(missing),
                    "codes": _format_sticker_codes(missing),
                }
            )

    total = sum(group["count"] for group in groups)
    scope = section_code or "album"

    return ToolResult(
        name="get_missing_stickers",
        summary=f"{total} figurinha(s) faltante(s) em {scope}.",
        data={"section_code": section_code, "total": total, "groups": groups},
    )


def get_duplicates(snapshot: AlbumSnapshot, section_code: str | None = None) -> ToolResult:
    groups: list[dict[str, Any]] = []

    for section in _ordered_sections(snapshot).values():
        if section_code and section["code"] != section_code:
            continue

        repeated = [sticker for sticker in section["stickers"] if sticker.quantity > 1]

        if repeated:
            groups.append(
                {
                    "section_code": section["code"],
                    "section_name": section["name"],
                    "unique_count": len(repeated),
                    "extra_count": sum(sticker.quantity - 1 for sticker in repeated),
                    "codes": _format_sticker_codes(repeated, include_quantity=True),
                }
            )

    total_extra = sum(group["extra_count"] for group in groups)
    total_unique = sum(group["unique_count"] for group in groups)

    return ToolResult(
        name="get_duplicates",
        summary=f"{total_unique} codigo(s) repetido(s), somando {total_extra} copia(s) extra(s).",
        data={
            "section_code": section_code,
            "unique_total": total_unique,
            "extra_total": total_extra,
            "groups": groups,
        },
    )


def get_trade_suggestions(snapshot: AlbumSnapshot) -> ToolResult:
    if snapshot.trade_strategy:
        strategy = snapshot.trade_strategy
        duplicates = strategy.get("topDuplicateCandidates") or []
        missing = strategy.get("topMissingTargets") or []

        return ToolResult(
            name="get_trade_suggestions",
            summary=str(
                strategy.get("summary")
                or f"{len(duplicates)} repetida(s) e {len(missing)} faltante(s) ranqueada(s)."
            ),
            data={
                "source": "precomputed_trade_strategy",
                "top_duplicate_candidates": duplicates,
                "top_missing_targets": missing,
            },
        )

    duplicates = get_duplicates(snapshot).data["groups"]
    missing = get_missing_stickers(snapshot).data["groups"]
    strongest_trade_sections = sorted(
        duplicates,
        key=lambda group: group["extra_count"],
        reverse=True,
    )[:8]
    priority_missing_sections = sorted(
        missing,
        key=lambda group: group["count"],
        reverse=True,
    )[:8]

    return ToolResult(
        name="get_trade_suggestions",
        summary=(
            f"Use {len(strongest_trade_sections)} selecao(oes) com mais repetidas para negociar "
            f"e priorize {len(priority_missing_sections)} selecao(oes) com mais faltantes."
        ),
        data={
            "strongest_trade_sections": strongest_trade_sections,
            "priority_missing_sections": priority_missing_sections,
        },
    )


def _unavailable_tool(name: str, missing_field: str) -> ToolResult:
    return ToolResult(
        name=name,
        summary=f"Dado deterministico indisponivel no snapshot: {missing_field}.",
        data={
            "available": False,
            "missing_field": missing_field,
            "instruction": "Atualize o frontend para enviar o snapshot enriquecido antes de pedir esta analise.",
        },
    )


def _as_list(value: object) -> list[Any]:
    return value if isinstance(value, list) else []


def _codes_from_scores(items: list[Any], limit: int = 8) -> list[str]:
    codes: list[str] = []

    for item in items[:limit]:
        if isinstance(item, dict) and item.get("displayCode"):
            codes.append(str(item["displayCode"]))

    return codes


def message_asks_news(message: str) -> bool:
    normalized = message.casefold()
    return any(
        term in normalized
        for term in [
            "noticia",
            "noticias",
            "news",
            "internet",
            "web",
            "atualizacao",
            "atualizações",
            "ultima",
            "ultimas",
            "última",
            "últimas",
            "copa 2026",
            "world cup 2026",
        ]
    )


def get_trade_strategy(snapshot: AlbumSnapshot) -> ToolResult:
    if not snapshot.trade_strategy:
        return _unavailable_tool("get_trade_strategy", "trade_strategy")

    strategy = snapshot.trade_strategy
    duplicate_candidates = _as_list(strategy.get("topDuplicateCandidates"))
    missing_targets = _as_list(strategy.get("topMissingTargets"))

    return ToolResult(
        name="get_trade_strategy",
        summary=str(
            strategy.get("summary")
            or f"{len(duplicate_candidates)} repetida(s) e {len(missing_targets)} faltante(s) ranqueada(s)."
        ),
        data={
            "available": True,
            "summary": strategy.get("summary"),
            "top_duplicate_candidates": duplicate_candidates,
            "top_missing_targets": missing_targets,
        },
    )


def rank_trade_candidates(snapshot: AlbumSnapshot, mode: str = "all") -> ToolResult:
    if not snapshot.trade_strategy:
        return _unavailable_tool("rank_trade_candidates", "trade_strategy")

    strategy = snapshot.trade_strategy
    duplicate_candidates = _as_list(strategy.get("topDuplicateCandidates"))
    missing_targets = _as_list(strategy.get("topMissingTargets"))
    data: dict[str, Any] = {"available": True, "mode": mode}

    if mode in {"all", "duplicates"}:
        data["top_duplicate_candidates"] = duplicate_candidates

    if mode in {"all", "missing"}:
        data["top_missing_targets"] = missing_targets

    return ToolResult(
        name="rank_trade_candidates",
        summary=(
            f"Ranking de trocas pronto: {len(duplicate_candidates)} repetida(s) para oferecer "
            f"e {len(missing_targets)} faltante(s) para buscar."
        ),
        data=data,
    )


def get_next_best_action(snapshot: AlbumSnapshot) -> ToolResult:
    if not snapshot.next_best_action:
        return _unavailable_tool("get_next_best_action", "next_best_action")

    action = snapshot.next_best_action
    title = str(action.get("title") or "Proxima melhor acao")
    recommendation = str(action.get("recommendation") or "Recomendacao indisponivel.")
    confidence = str(action.get("confidence") or "baixa")

    return ToolResult(
        name="get_next_best_action",
        summary=f"{title}: {recommendation} Confianca {confidence}.",
        data={
            "available": True,
            "next_best_action": action,
        },
    )


def generate_whatsapp_trade_message(snapshot: AlbumSnapshot) -> ToolResult:
    if not snapshot.trade_strategy:
        return _unavailable_tool("generate_whatsapp_trade_message", "trade_strategy")

    strategy = snapshot.trade_strategy
    duplicate_candidates = _as_list(strategy.get("topDuplicateCandidates"))
    missing_targets = _as_list(strategy.get("topMissingTargets"))
    duplicate_codes = _codes_from_scores(duplicate_candidates)
    missing_codes = _codes_from_scores(missing_targets)
    lines = ["Copa 2026 - Trocas", ""]

    if duplicate_codes:
        lines.append(f"Ofereco: {', '.join(duplicate_codes)}")

    if missing_codes:
        lines.append(f"Procuro: {', '.join(missing_codes)}")

    summary = strategy.get("summary")

    if summary:
        lines.extend(["", str(summary)])

    text = "\n".join(lines).strip()

    return ToolResult(
        name="generate_whatsapp_trade_message",
        summary="Mensagem de troca para WhatsApp gerada a partir do ranking deterministico.",
        data={
            "text": text,
            "duplicate_codes": duplicate_codes,
            "missing_codes": missing_codes,
        },
    )


def explain_forecast(snapshot: AlbumSnapshot) -> ToolResult:
    forecast = snapshot.forecast or {"status": "unavailable"}
    forecast_status = forecast.get("status")

    if forecast_status == "ready":
        summary = (
            f"Previsao local: {forecast.get('estimatedDays')} dia(s), "
            f"janela {forecast.get('optimisticDays')}-{forecast.get('conservativeDays')} dia(s), "
            f"confianca {forecast.get('confidence')}."
        )
    elif forecast_status == "complete":
        summary = "Album completo; previsao encerrada."
    else:
        summary = str(forecast.get("reason") or "Previsao ainda sem dados suficientes.")

    return ToolResult(
        name="explain_forecast",
        summary=summary,
        data={
            "forecast": forecast,
        },
    )


def generate_whatsapp_text(snapshot: AlbumSnapshot, mode: str = "missing") -> ToolResult:
    if mode == "duplicates":
        source = get_duplicates(snapshot).data["groups"]
        title = f"FIGURINHAS REPETIDAS ({snapshot.stats.repeated_total})"
    else:
        source = get_missing_stickers(snapshot).data["groups"]
        title = f"FIGURINHAS FALTANTES ({snapshot.stats.missing})"

    lines = ["🏆 Copa 2026", f"▣ {title}", ""]

    for group in source:
        codes = ", ".join(group["codes"])
        lines.append(f"{group['section_code']}: {codes}")

    text = "\n".join(lines).strip()

    return ToolResult(
        name="generate_whatsapp_text",
        summary=f"Texto compacto gerado para {title.lower()}.",
        data={"mode": mode, "text": text},
    )


def forecast_completion(snapshot: AlbumSnapshot) -> ToolResult:
    forecast = snapshot.forecast or {"status": "unavailable"}
    status = forecast.get("status")

    if status == "ready":
        summary = (
            f"Estimativa pronta: {forecast.get('estimatedDays')} dia(s), "
            f"confianca {forecast.get('confidence')}."
        )
    elif status == "complete":
        summary = "Album completo."
    else:
        summary = str(forecast.get("reason") or "Previsao ainda sem dados suficientes.")

    return ToolResult(
        name="forecast_completion",
        summary=summary,
        data={"forecast": forecast},
    )


def plan_tool_results(
    message: str,
    snapshot: AlbumSnapshot,
    web_search_result: ToolResult | None = None,
) -> list[ToolResult]:
    normalized = message.casefold()
    section_code = _section_from_message(message, snapshot)
    tool_results = [get_album_summary(snapshot)]

    asks_missing = any(term in normalized for term in ["falt", "missing", "preciso", "falta"])
    asks_duplicates = any(term in normalized for term in ["repet", "duplic", "troca", "sobrando"])
    asks_trade = any(term in normalized for term in ["troca", "negocia", "oferecer", "desovar"])
    asks_whatsapp = any(term in normalized for term in ["whatsapp", "wpp", "texto", "compartilhar"])
    asks_forecast = any(term in normalized for term in ["previs", "quando", "completar", "ritmo", "estimativa"])
    asks_next_action = any(
        term in normalized
        for term in [
            "proxima",
            "próxima",
            "melhor acao",
            "melhor ação",
            "devo",
            "vale comprar",
            "comprar ou trocar",
            "o que faco",
            "o que faço",
        ]
    )
    asks_news = message_asks_news(message)

    if asks_next_action:
        tool_results.append(get_next_best_action(snapshot))

    if asks_missing:
        tool_results.append(get_missing_stickers(snapshot, section_code))

    if asks_duplicates:
        tool_results.append(get_duplicates(snapshot, section_code))

    if asks_trade:
        tool_results.append(get_trade_strategy(snapshot))
        trade_mode = "duplicates" if asks_duplicates and not asks_missing else "all"
        tool_results.append(rank_trade_candidates(snapshot, mode=trade_mode))

    if asks_whatsapp:
        if asks_trade:
            tool_results.append(generate_whatsapp_trade_message(snapshot))
        else:
            mode = "duplicates" if asks_duplicates and not asks_missing else "missing"
            tool_results.append(generate_whatsapp_text(snapshot, mode=mode))

    if asks_forecast:
        tool_results.append(explain_forecast(snapshot))

    if asks_news:
        if web_search_result is not None:
            tool_results.append(web_search_result)
        else:
            tool_results.append(
                ToolResult(
                    name="search_world_cup_news",
                    summary=(
                        "Busca web nao esta habilitada. Ative WEB_SEARCH_ENABLED=true no backend "
                        "para responder noticias recentes."
                    ),
                    data={
                        "enabled": False,
                        "provider": "openai_web_search",
                    },
                )
            )

    if len(tool_results) == 1:
        tool_results.extend(
            [
                get_next_best_action(snapshot),
                get_missing_stickers(snapshot, section_code),
                get_duplicates(snapshot, section_code),
                explain_forecast(snapshot),
            ]
        )

    return tool_results
