import type { CollectionEvent } from '../types'
import type { CollectionStats } from './stats'

const DAY_IN_MS = 24 * 60 * 60 * 1000

export type ForecastConfidence = 'low' | 'medium' | 'high'

export type CompletionForecast =
  | {
      status: 'complete'
      missing: 0
      eventsUsed: number
    }
  | {
      status: 'insufficient-data'
      missing: number
      eventsUsed: number
      totalStickersRecorded: number
      reason: string
    }
  | {
      status: 'ready'
      missing: number
      eventsUsed: number
      totalStickersRecorded: number
      uniqueStickersRecorded: number
      repeatedStickersRecorded: number
      observedUniqueRate: number
      dailyStickerPace: number
      estimatedAdditionalStickers: number
      estimatedDays: number
      optimisticDays: number
      conservativeDays: number
      estimatedCompletionDate: string
      optimisticCompletionDate: string
      conservativeCompletionDate: string
      confidence: ForecastConfidence
    }

type ForecastInput = {
  events: CollectionEvent[]
  stats: CollectionStats
  totalStickers: number
  now?: Date
}

type AcquisitionEvent = {
  occurredAt: number
  totalStickers: number
  uniqueStickers: number
  repeatedStickers: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizeCount(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value ?? 0)) : 0
}

function addDays(baseDate: Date, days: number) {
  const date = new Date(baseDate)
  date.setDate(date.getDate() + Math.max(0, days))
  return date.toISOString()
}

function parseEventDate(value: string) {
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : undefined
}

function isAcquisitionEvent(event: CollectionEvent) {
  if (event.type === 'historical-batch' || event.type === 'bulk-add') {
    return true
  }

  return event.type === 'sticker-set' && (event.quantityDelta ?? 0) > 0
}

function toAcquisitionEvent(event: CollectionEvent): AcquisitionEvent | undefined {
  if (!isAcquisitionEvent(event)) {
    return undefined
  }

  const occurredAt = parseEventDate(event.occurredAt)
  const totalStickers = normalizeCount(event.totalStickers)

  if (occurredAt === undefined || totalStickers <= 0) {
    return undefined
  }

  const uniqueStickers = clamp(normalizeCount(event.uniqueStickers), 0, totalStickers)
  const repeatedStickers = clamp(
    normalizeCount(event.repeatedStickers),
    0,
    Math.max(0, totalStickers - uniqueStickers),
  )

  return {
    occurredAt,
    totalStickers,
    uniqueStickers,
    repeatedStickers,
  }
}

function expectedRandomDraws(totalStickers: number, missing: number) {
  let draws = 0

  for (let remaining = missing; remaining > 0; remaining -= 1) {
    draws += totalStickers / remaining
  }

  return draws
}

function getConfidence(eventsUsed: number, sampleDays: number, totalStickersRecorded: number) {
  if (eventsUsed >= 6 && sampleDays >= 21 && totalStickersRecorded >= 250) {
    return 'high'
  }

  if (eventsUsed >= 3 && sampleDays >= 7 && totalStickersRecorded >= 100) {
    return 'medium'
  }

  return 'low'
}

export function buildCompletionForecast({
  events,
  stats,
  totalStickers,
  now = new Date(),
}: ForecastInput): CompletionForecast {
  if (stats.missing <= 0) {
    return {
      status: 'complete',
      missing: 0,
      eventsUsed: events.length,
    }
  }

  const acquisitionEvents = events
    .map(toAcquisitionEvent)
    .filter((event): event is AcquisitionEvent => Boolean(event))
    .sort((left, right) => left.occurredAt - right.occurredAt)

  const totalStickersRecorded = acquisitionEvents.reduce(
    (total, event) => total + event.totalStickers,
    0,
  )

  if (acquisitionEvents.length < 2 || totalStickersRecorded < 20) {
    return {
      status: 'insufficient-data',
      missing: stats.missing,
      eventsUsed: acquisitionEvents.length,
      totalStickersRecorded,
      reason: 'Registre pelo menos dois marcos ou entradas para estimar um ritmo confiavel',
    }
  }

  const uniqueStickersRecorded = acquisitionEvents.reduce(
    (total, event) => total + event.uniqueStickers,
    0,
  )
  const repeatedStickersRecorded = acquisitionEvents.reduce(
    (total, event) => total + event.repeatedStickers,
    0,
  )
  const firstEventDate = acquisitionEvents[0].occurredAt
  const lastRelevantDate = Math.max(
    now.getTime(),
    acquisitionEvents[acquisitionEvents.length - 1].occurredAt,
  )
  const sampleDays = Math.max(1, (lastRelevantDate - firstEventDate) / DAY_IN_MS)
  const dailyStickerPace = Math.max(0.1, totalStickersRecorded / sampleDays)
  const observedUniqueRate = clamp(uniqueStickersRecorded / totalStickersRecorded, 0.02, 0.95)
  const currentNewProbability = clamp(stats.missing / totalStickers, 0.02, 0.95)
  const effectiveUniqueRate = clamp(
    observedUniqueRate * 0.35 + currentNewProbability * 0.65,
    0.04,
    0.9,
  )
  const estimatedAdditionalStickers = Math.ceil(stats.missing / effectiveUniqueRate)
  const expectedDrawsToComplete = expectedRandomDraws(totalStickers, stats.missing)
  const estimatedDays = Math.max(1, Math.ceil(estimatedAdditionalStickers / dailyStickerPace))
  const optimisticDays = Math.max(
    1,
    Math.ceil(stats.missing / clamp(Math.max(observedUniqueRate, effectiveUniqueRate), 0.05, 0.9) / (dailyStickerPace * 1.15)),
  )
  const conservativeDays = Math.max(
    estimatedDays,
    Math.ceil(Math.max(estimatedAdditionalStickers * 1.6, expectedDrawsToComplete * 0.35) / (dailyStickerPace * 0.7)),
  )

  return {
    status: 'ready',
    missing: stats.missing,
    eventsUsed: acquisitionEvents.length,
    totalStickersRecorded,
    uniqueStickersRecorded,
    repeatedStickersRecorded,
    observedUniqueRate: Math.round(observedUniqueRate * 100),
    dailyStickerPace: Math.round(dailyStickerPace),
    estimatedAdditionalStickers,
    estimatedDays,
    optimisticDays,
    conservativeDays,
    estimatedCompletionDate: addDays(now, estimatedDays),
    optimisticCompletionDate: addDays(now, optimisticDays),
    conservativeCompletionDate: addDays(now, conservativeDays),
    confidence: getConfidence(acquisitionEvents.length, sampleDays, totalStickersRecorded),
  }
}
