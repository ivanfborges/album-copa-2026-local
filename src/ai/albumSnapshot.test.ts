import { describe, expect, it } from 'vitest'
import { stickers } from '../data/catalog'
import type { CollectionEvent, InventoryItem } from '../types'
import { buildCompletionForecast } from '../domain/forecast'
import { getCollectionStats } from '../domain/stats'
import { buildAlbumSnapshot } from './albumSnapshot'

const fixedDate = '2026-05-21T12:00:00.000Z'

function item(stickerId: string, quantity: number): InventoryItem {
  return {
    stickerId,
    quantity,
    updatedAt: fixedDate,
  }
}

describe('album snapshot', () => {
  it('keeps complete event metadata and deterministic trade strategy', () => {
    const inventory = [item('FWC1', 2), item('BRA1', 1)]
    const stats = getCollectionStats(inventory, stickers.length)
    const event: CollectionEvent = {
      id: 'event-1',
      occurredAt: fixedDate,
      createdAt: fixedDate,
      type: 'sticker-set',
      source: 'manual',
      stickerId: 'FWC1',
      totalStickers: 1,
      uniqueStickers: 0,
      repeatedStickers: 1,
      affectedStickers: 1,
      quantityDelta: 1,
      quantityAfter: 2,
      notes: 'ajuste manual',
    }
    const snapshot = buildAlbumSnapshot({
      settings: { albumNickname: 'Album teste' },
      stats,
      stickers,
      inventoryByStickerId: new Map(inventory.map((inventoryItem) => [inventoryItem.stickerId, inventoryItem])),
      collectionEvents: [event],
      completionForecast: buildCompletionForecast({
        events: [event],
        stats,
        totalStickers: stickers.length,
      }),
    })

    expect(snapshot.events[0]).toMatchObject({
      id: 'event-1',
      occurred_at: fixedDate,
      created_at: fixedDate,
      quantity_delta: 1,
      quantity_after: 2,
      notes: 'ajuste manual',
    })
    expect(snapshot.trade_strategy.topDuplicateCandidates[0]).toMatchObject({
      stickerId: 'FWC1',
      priority: 'alta',
    })
    expect(snapshot.next_best_action).toMatchObject({
      action: 'buy_packs',
    })
  })
})
