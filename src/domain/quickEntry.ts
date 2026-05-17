import type { Sticker } from '../types'

export type ParsedStickerCodes = {
  counts: Map<string, number>
  invalidCodes: string[]
  totalValid: number
}

export type StickerCodeImpact = {
  newCount: number
  repeatedCount: number
}

export function parseStickerCodes(text: string, stickers: readonly Sticker[]): ParsedStickerCodes {
  const validStickerIds = new Set(stickers.map((sticker) => sticker.id))
  const matches = text.toUpperCase().match(/00|[A-Z]{2,6}\s*\d{1,2}/g) ?? []
  const counts = new Map<string, number>()
  const invalidCodes: string[] = []

  for (const match of matches) {
    const stickerId = match.replace(/\s+/g, '')

    if (!validStickerIds.has(stickerId)) {
      invalidCodes.push(match.trim())
      continue
    }

    counts.set(stickerId, (counts.get(stickerId) ?? 0) + 1)
  }

  return {
    counts,
    invalidCodes,
    totalValid: [...counts.values()].reduce((total, count) => total + count, 0),
  }
}

export function getStickerCodeImpact(
  parsed: ParsedStickerCodes,
  inventoryQuantities: ReadonlyMap<string, number>,
): StickerCodeImpact {
  let newCount = 0
  let repeatedCount = 0

  for (const [stickerId, count] of parsed.counts) {
    const currentQuantity = inventoryQuantities.get(stickerId) ?? 0

    if (currentQuantity > 0) {
      repeatedCount += count
      continue
    }

    newCount += 1
    repeatedCount += Math.max(0, count - 1)
  }

  return {
    newCount,
    repeatedCount,
  }
}
