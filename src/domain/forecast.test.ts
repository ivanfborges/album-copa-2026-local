import { describe, expect, it } from 'vitest'
import type { CollectionEvent } from '../types'
import { buildCompletionForecast } from './forecast'
import { getCollectionStats } from './stats'

const now = new Date('2026-05-21T12:00:00.000Z')

function event(input: Partial<CollectionEvent>): CollectionEvent {
  return {
    id: input.id ?? `event-${Math.random()}`,
    occurredAt: input.occurredAt ?? '2026-05-18T12:00:00.000Z',
    createdAt: input.createdAt ?? '2026-05-18T12:00:00.000Z',
    type: input.type ?? 'historical-batch',
    source: input.source ?? 'historical',
    totalStickers: input.totalStickers ?? 0,
    uniqueStickers: input.uniqueStickers,
    repeatedStickers: input.repeatedStickers,
    affectedStickers: input.affectedStickers,
    quantityDelta: input.quantityDelta,
    quantityAfter: input.quantityAfter,
    notes: input.notes,
  }
}

describe('completion forecast', () => {
  it('asks for more data when there is not enough acquisition history', () => {
    const stats = getCollectionStats([], 980)
    const forecast = buildCompletionForecast({
      events: [event({ totalStickers: 7, uniqueStickers: 4, repeatedStickers: 3 })],
      stats,
      totalStickers: 980,
      now,
    })

    expect(forecast.status).toBe('insufficient-data')
    expect(forecast.eventsUsed).toBe(1)
  })

  it('returns complete when the album has no missing stickers', () => {
    const inventory = Array.from({ length: 980 }, (_, index) => ({
      stickerId: `S${index + 1}`,
      quantity: 1,
      updatedAt: now.toISOString(),
    }))
    const stats = getCollectionStats(inventory, 980)
    const forecast = buildCompletionForecast({
      events: [],
      stats,
      totalStickers: 980,
      now,
    })

    expect(forecast.status).toBe('complete')
    expect(forecast.missing).toBe(0)
  })

  it('uses historical acquisition batches to estimate completion', () => {
    const inventory = Array.from({ length: 514 }, (_, index) => ({
      stickerId: `S${index + 1}`,
      quantity: 1,
      updatedAt: now.toISOString(),
    }))
    const stats = getCollectionStats(inventory, 980)
    const forecast = buildCompletionForecast({
      events: [
        event({
          id: 'historical-1',
          occurredAt: '2026-05-15T12:00:00.000Z',
          createdAt: '2026-05-15T12:00:00.000Z',
          totalStickers: 924,
          uniqueStickers: 480,
          repeatedStickers: 444,
        }),
        event({
          id: 'historical-2',
          occurredAt: '2026-05-18T12:00:00.000Z',
          createdAt: '2026-05-18T12:00:00.000Z',
          totalStickers: 84,
          uniqueStickers: 34,
          repeatedStickers: 50,
        }),
      ],
      stats,
      totalStickers: 980,
      now,
    })

    expect(forecast.status).toBe('ready')

    if (forecast.status === 'ready') {
      expect(forecast.totalStickersRecorded).toBe(1008)
      expect(forecast.uniqueStickersRecorded).toBe(514)
      expect(forecast.estimatedDays).toBeGreaterThan(0)
      expect(forecast.conservativeDays).toBeGreaterThanOrEqual(forecast.estimatedDays)
    }
  })

  it('ignores backup restore, duplicate trimming and removal events', () => {
    const stats = getCollectionStats(
      Array.from({ length: 50 }, (_, index) => ({
        stickerId: `S${index + 1}`,
        quantity: 1,
        updatedAt: now.toISOString(),
      })),
      980,
    )
    const forecast = buildCompletionForecast({
      events: [
        event({
          id: 'historical-1',
          occurredAt: '2026-05-15T12:00:00.000Z',
          totalStickers: 40,
          uniqueStickers: 30,
          repeatedStickers: 10,
        }),
        event({
          id: 'historical-2',
          occurredAt: '2026-05-18T12:00:00.000Z',
          totalStickers: 20,
          uniqueStickers: 15,
          repeatedStickers: 5,
        }),
        event({ type: 'backup-restore', source: 'backup', totalStickers: 980 }),
        event({ type: 'duplicates-trim', source: 'manual', totalStickers: 120 }),
        event({ type: 'bulk-remove', source: 'quick-entry', totalStickers: 3 }),
      ],
      stats,
      totalStickers: 980,
      now,
    })

    expect(forecast.status).toBe('ready')

    if (forecast.status === 'ready') {
      expect(forecast.eventsUsed).toBe(2)
      expect(forecast.totalStickersRecorded).toBe(60)
    }
  })
})
