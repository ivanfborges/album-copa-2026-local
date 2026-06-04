import { describe, expect, it } from 'vitest'
import type { CollectionEvent } from '../types'
import { buildNextBestAction } from './nextBestAction'
import type { CollectionStats } from './stats'
import type { StickerTradeScore, TradeStrategy } from './tradeStrategy'

const fixedDate = '2026-05-21T12:00:00.000Z'

function stats(input: Partial<CollectionStats>): CollectionStats {
  return {
    ownedUnique: input.ownedUnique ?? 0,
    repeatedUnique: input.repeatedUnique ?? 0,
    repeatedTotal: input.repeatedTotal ?? 0,
    totalObtained: input.totalObtained ?? input.ownedUnique ?? 0,
    missing: input.missing ?? 980,
    completion: input.completion ?? 0,
  }
}

function score(input: Partial<StickerTradeScore> & { stickerId: string }): StickerTradeScore {
  return {
    stickerId: input.stickerId,
    displayCode: input.displayCode ?? input.stickerId,
    sectionCode: input.sectionCode ?? input.stickerId.slice(0, 3),
    sectionName: input.sectionName ?? 'Teste',
    quantity: input.quantity ?? 0,
    extraCopies: input.extraCopies ?? 0,
    score: input.score ?? 50,
    priority: input.priority ?? 'media',
    reasons: input.reasons ?? ['motivo de teste'],
  }
}

function strategy(input: Partial<TradeStrategy> = {}): TradeStrategy {
  return {
    topDuplicateCandidates: input.topDuplicateCandidates ?? [score({ stickerId: 'BRA1', quantity: 2, extraCopies: 1 })],
    topMissingTargets: input.topMissingTargets ?? [score({ stickerId: 'ARG13', displayCode: 'ARG 13' })],
    summary: input.summary ?? 'Estratégia de teste',
  }
}

function event(input: Partial<CollectionEvent> = {}): CollectionEvent {
  return {
    id: input.id ?? 'event-1',
    occurredAt: input.occurredAt ?? fixedDate,
    createdAt: input.createdAt ?? fixedDate,
    type: input.type ?? 'bulk-add',
    source: input.source ?? 'pack',
    totalStickers: input.totalStickers ?? 7,
    uniqueStickers: input.uniqueStickers ?? 3,
    repeatedStickers: input.repeatedStickers ?? 4,
    affectedStickers: input.affectedStickers ?? 7,
  }
}

describe('next best action', () => {
  it('recommends buying packs in the early album stage', () => {
    const action = buildNextBestAction({
      stats: stats({ missing: 760, completion: 22, repeatedTotal: 2, totalObtained: 222 }),
      tradeStrategy: strategy({ topDuplicateCandidates: [] }),
      events: [event()],
    })

    expect(action).toMatchObject({
      action: 'buy_packs',
      suggestedPackCount: 10,
      confidence: 'baixa',
    })
  })

  it('recommends combining buying and trading in the middle with good duplicate currency', () => {
    const action = buildNextBestAction({
      stats: stats({ missing: 330, completion: 66, repeatedTotal: 90, totalObtained: 740 }),
      tradeStrategy: strategy(),
      events: [event({ id: 'event-1' }), event({ id: 'event-2' }), event({ id: 'event-3' })],
    })

    expect(action).toMatchObject({
      action: 'buy_and_trade',
      suggestedPackCount: 5,
    })
    expect(action.reasons).toContain('Combinar compra controlada com troca reduz dependência de sorte')
  })

  it('recommends trading first when the album is advanced and has duplicates', () => {
    const action = buildNextBestAction({
      stats: stats({ missing: 80, completion: 92, repeatedTotal: 55, totalObtained: 955 }),
      tradeStrategy: strategy({
        topMissingTargets: [score({ stickerId: 'FWC1', displayCode: 'FWC 1', priority: 'alta' })],
      }),
      events: [event({ id: 'event-1' }), event({ id: 'event-2' }), event({ id: 'event-3' }), event({ id: 'event-4' })],
    })

    expect(action.action).toBe('trade_first')
    expect(action.suggestedTradeTargets).toEqual(['FWC 1'])
    expect(action.suggestedDuplicateCodes).toEqual(['BRA1'])
  })

  it('recommends manual targets when there are few missing stickers and no duplicate currency', () => {
    const action = buildNextBestAction({
      stats: stats({ missing: 8, completion: 99, repeatedTotal: 0, totalObtained: 972 }),
      tradeStrategy: strategy({ topDuplicateCandidates: [] }),
      events: [event({ id: 'event-1' }), event({ id: 'event-2' })],
    })

    expect(action.action).toBe('manual_targets')
    expect(action.suggestedPackCount).toBeUndefined()
  })

  it('recommends waiting when the album is complete', () => {
    const action = buildNextBestAction({
      stats: stats({ missing: 0, completion: 100, repeatedTotal: 12, totalObtained: 992 }),
      tradeStrategy: strategy(),
      events: [],
    })

    expect(action).toMatchObject({
      action: 'wait',
      confidence: 'alta',
    })
  })
})
