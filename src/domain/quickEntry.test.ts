import { describe, expect, it } from 'vitest'
import { parseStickerCodes } from './quickEntry'
import type { Sticker } from '../types'

const stickers = [
  { id: 'BRA1', displayCode: 'BRA 1' },
  { id: 'ARG10', displayCode: 'ARG 10' },
  { id: 'FWC3', displayCode: 'FWC 3' },
] as Sticker[]

describe('parseStickerCodes', () => {
  it('normalizes codes with and without spaces', () => {
    const parsed = parseStickerCodes('BRA1 ARG 10 FWC3', stickers)

    expect(parsed.totalValid).toBe(3)
    expect(parsed.counts.get('BRA1')).toBe(1)
    expect(parsed.counts.get('ARG10')).toBe(1)
    expect(parsed.counts.get('FWC3')).toBe(1)
  })

  it('counts repeated codes and reports invalid entries', () => {
    const parsed = parseStickerCodes('BRA1 BRA 1 USA99', stickers)

    expect(parsed.totalValid).toBe(2)
    expect(parsed.counts.get('BRA1')).toBe(2)
    expect(parsed.invalidCodes).toEqual(['USA99'])
  })
})
