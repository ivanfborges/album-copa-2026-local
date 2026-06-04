import type { CompletionForecast } from '../domain/forecast'
import { buildNextBestAction, type NextBestAction } from '../domain/nextBestAction'
import type { CollectionStats } from '../domain/stats'
import { buildTradeStrategy, type TradeStrategy } from '../domain/tradeStrategy'
import type { AlbumSettings, CollectionEvent, InventoryItem, Sticker } from '../types'

export type AIAlbumStatsSnapshot = {
  total: number
  owned_unique: number
  missing: number
  repeated_unique: number
  repeated_total: number
  total_obtained: number
  completion: number
}

export type AIStickerSnapshot = {
  id: string
  code: string
  section_code: string
  section_name: string
  team_code: string
  team_name: string
  number: number
  title: string
  type: string
  is_special: boolean
  quantity: number
}

export type AICollectionEventSnapshot = {
  id: string
  occurred_at: string
  created_at: string
  type: string
  source: string
  sticker_id?: string
  total_stickers: number
  unique_stickers?: number
  repeated_stickers?: number
  affected_stickers?: number
  quantity_delta?: number
  quantity_after?: number
  notes?: string
}

export type AIAlbumSnapshot = {
  album_nickname: string
  exported_at: string
  stats: AIAlbumStatsSnapshot
  stickers: AIStickerSnapshot[]
  events: AICollectionEventSnapshot[]
  forecast: CompletionForecast
  trade_strategy: TradeStrategy
  next_best_action: NextBestAction
}

type BuildAlbumSnapshotInput = {
  settings: AlbumSettings
  stats: CollectionStats
  stickers: readonly Sticker[]
  inventoryByStickerId: Map<string, InventoryItem>
  collectionEvents: readonly CollectionEvent[]
  completionForecast: CompletionForecast
}

export function buildAlbumSnapshot({
  settings,
  stats,
  stickers,
  inventoryByStickerId,
  collectionEvents,
  completionForecast,
}: BuildAlbumSnapshotInput): AIAlbumSnapshot {
  const tradeStrategy = buildTradeStrategy({
    stickers,
    inventoryByStickerId,
    stats,
  })

  return {
    album_nickname: settings.albumNickname,
    exported_at: new Date().toISOString(),
    stats: {
      total: stickers.length,
      owned_unique: stats.ownedUnique,
      missing: stats.missing,
      repeated_unique: stats.repeatedUnique,
      repeated_total: stats.repeatedTotal,
      total_obtained: stats.totalObtained,
      completion: stats.completion,
    },
    stickers: stickers.map((sticker) => ({
      id: sticker.id,
      code: sticker.displayCode,
      section_code: sticker.sectionCode,
      section_name: sticker.sectionName,
      team_code: sticker.teamCode,
      team_name: sticker.teamName,
      number: sticker.number,
      title: sticker.title,
      type: sticker.type,
      is_special: sticker.isSpecial,
      quantity: inventoryByStickerId.get(sticker.id)?.quantity ?? 0,
    })),
    events: collectionEvents.map((event) => ({
      id: event.id,
      occurred_at: event.occurredAt,
      created_at: event.createdAt,
      type: event.type,
      source: event.source,
      sticker_id: event.stickerId,
      total_stickers: event.totalStickers,
      unique_stickers: event.uniqueStickers,
      repeated_stickers: event.repeatedStickers,
      affected_stickers: event.affectedStickers,
      quantity_delta: event.quantityDelta,
      quantity_after: event.quantityAfter,
      notes: event.notes,
    })),
    forecast: completionForecast,
    trade_strategy: tradeStrategy,
    next_best_action: buildNextBestAction({
      stats,
      tradeStrategy,
      events: collectionEvents,
    }),
  }
}
