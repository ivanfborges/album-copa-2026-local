import { describe, expect, it } from 'vitest'
import { buildReportRows, buildReportSummary } from './reportData'
import type { InventoryItem, Sticker } from '../types'

const stickers: Sticker[] = [
  {
    id: 'BRA1',
    displayCode: 'BRA 1',
    sectionCode: 'BRA',
    sectionName: 'Brazil',
    teamCode: 'BRA',
    teamName: 'Brazil',
    number: 1,
    title: 'Team Logo',
    type: 'badge',
    isSpecial: true,
    albumOrder: 1,
  },
  {
    id: 'BRA2',
    displayCode: 'BRA 2',
    sectionCode: 'BRA',
    sectionName: 'Brazil',
    teamCode: 'BRA',
    teamName: 'Brazil',
    number: 2,
    title: 'Player',
    type: 'player',
    isSpecial: false,
    albumOrder: 2,
  },
]

const inventory: InventoryItem[] = [
  {
    stickerId: 'BRA1',
    quantity: 2,
    updatedAt: '2026-05-15T00:00:00.000Z',
  },
]

describe('reportData', () => {
  it('builds missing report rows from catalog and inventory', () => {
    const rows = buildReportRows(stickers, inventory, 'missing', 'all')

    expect(rows).toHaveLength(1)
    expect(rows[0].code).toBe('BRA 2')
    expect(rows[0].status).toBe('Faltante')
  })

  it('summarizes repeated totals', () => {
    const rows = buildReportRows(stickers, inventory, 'all', 'all')
    const summary = buildReportSummary(rows, 'Album', 'all', 'Todas')

    expect(summary.totalRows).toBe(2)
    expect(summary.ownedRows).toBe(1)
    expect(summary.missingRows).toBe(1)
    expect(summary.repeatedTotal).toBe(1)
  })
})
