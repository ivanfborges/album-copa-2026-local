from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class AlbumStatsSnapshot(BaseModel):
    total: int = Field(ge=0)
    owned_unique: int = Field(ge=0)
    missing: int = Field(ge=0)
    repeated_unique: int = Field(ge=0)
    repeated_total: int = Field(ge=0)
    total_obtained: int = Field(ge=0)
    completion: int = Field(ge=0, le=100)


class StickerSnapshot(BaseModel):
    id: str
    code: str
    section_code: str
    section_name: str
    team_code: str
    team_name: str
    number: int = Field(ge=0)
    title: str
    type: str
    is_special: bool
    quantity: int = Field(ge=0)


class CollectionEventSnapshot(BaseModel):
    id: str | None = None
    occurred_at: str
    created_at: str | None = None
    type: str
    source: str
    sticker_id: str | None = None
    total_stickers: int = Field(ge=0)
    unique_stickers: int | None = Field(default=None, ge=0)
    repeated_stickers: int | None = Field(default=None, ge=0)
    affected_stickers: int | None = Field(default=None, ge=0)
    quantity_delta: int | None = None
    quantity_after: int | None = Field(default=None, ge=0)
    notes: str | None = None


class AlbumSnapshot(BaseModel):
    album_nickname: str
    exported_at: str
    stats: AlbumStatsSnapshot
    stickers: list[StickerSnapshot]
    events: list[CollectionEventSnapshot] = Field(default_factory=list)
    forecast: dict[str, Any] | None = None
    trade_strategy: dict[str, Any] | None = None
    next_best_action: dict[str, Any] | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    snapshot: AlbumSnapshot
    history: list[ChatMessage] = Field(default_factory=list, max_length=12)
    provider: Literal["ollama", "openai", "mock"] | None = None


class ToolResult(BaseModel):
    name: str
    summary: str
    data: dict[str, Any]


class ChatResponse(BaseModel):
    answer: str
    provider: str
    tools: list[ToolResult]
    degraded: bool = False
