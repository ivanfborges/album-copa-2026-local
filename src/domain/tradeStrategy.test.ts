import { describe, expect, it } from 'vitest'
import { stickers } from '../data/catalog'
import type { InventoryItem } from '../types'
import { getCollectionStats } from './stats'
import { buildTradeStrategy } from './tradeStrategy'

const fixedDate = '2026-05-21T12:00:00.000Z'

function item(stickerId: string, quantity: number): InventoryItem {
  return {
    stickerId,
    quantity,
    updatedAt: fixedDate,
  }
}

function inventoryMap(items: InventoryItem[]) {
  return new Map(items.map((inventoryItem) => [inventoryItem.stickerId, inventoryItem]))
}

describe('trade strategy', () => {
  it('ranks special duplicates above common duplicates with more copies', () => {
    const inventory = [item('FWC1', 2), item('MEX2', 5), item('BRA13', 2)]
    const strategy = buildTradeStrategy({
      stickers,
      inventoryByStickerId: inventoryMap(inventory),
      stats: getCollectionStats(inventory, stickers.length),
    })

    expect(strategy.topDuplicateCandidates[0]).toMatchObject({
      stickerId: 'FWC1',
      priority: 'alta',
    })
    expect(strategy.topDuplicateCandidates[0].reasons).toContain('especial FWC')
    expect(strategy.topDuplicateCandidates.map((candidate) => candidate.stickerId)).toContain('MEX2')
  })

  it('prioritizes missing team photos when a section is almost complete', () => {
    const ownedAroundBrazil = stickers
      .filter(
        (sticker) =>
          sticker.sectionCode === 'FWC' ||
          (sticker.sectionCode === 'BRA' && sticker.id !== 'BRA13'),
      )
      .map((sticker) => item(sticker.id, 1))
    const strategy = buildTradeStrategy({
      stickers,
      inventoryByStickerId: inventoryMap(ownedAroundBrazil),
      stats: getCollectionStats(ownedAroundBrazil, stickers.length),
    })

    expect(strategy.topMissingTargets[0]).toMatchObject({
      stickerId: 'BRA13',
      priority: 'media',
    })
    expect(strategy.topMissingTargets[0].reasons).toEqual(
      expect.arrayContaining(['foto do time', 'fecha uma seção quase completa']),
    )
  })

  it('explains when there are targets but no duplicate currency yet', () => {
    const inventory = [item('BRA1', 1)]
    const strategy = buildTradeStrategy({
      stickers,
      inventoryByStickerId: inventoryMap(inventory),
      stats: getCollectionStats(inventory, stickers.length),
      maxItems: 3,
    })

    expect(strategy.topDuplicateCandidates).toHaveLength(0)
    expect(strategy.topMissingTargets).toHaveLength(3)
    expect(strategy.summary).toContain('ainda não há repetidas extras')
  })
})
