import { describe, expect, it } from 'vitest'
import { getFlagEmojiForSection } from '../data/flagEmojis'
import { buildCompactReportGroups, buildWhatsappReportText } from './exporters'
import type { ReportRow, ReportSummary } from './reportData'

const repeatedRows: ReportRow[] = [
  {
    code: 'BRA 1',
    sectionCode: 'BRA',
    sectionName: 'Brazil',
    group: 'C',
    title: 'Team Logo',
    type: 'Escudo',
    quantity: 3,
    status: 'Repetida',
    isSpecial: true,
  },
  {
    code: 'BRA 16',
    sectionCode: 'BRA',
    sectionName: 'Brazil',
    group: 'C',
    title: 'Player',
    type: 'Jogador',
    quantity: 2,
    status: 'Repetida',
    isSpecial: false,
  },
  {
    code: 'MAR 3',
    sectionCode: 'MAR',
    sectionName: 'Morocco',
    group: 'C',
    title: 'Player',
    type: 'Jogador',
    quantity: 2,
    status: 'Repetida',
    isSpecial: false,
  },
  {
    code: 'ARG 2',
    sectionCode: 'ARG',
    sectionName: 'Argentina',
    group: 'J',
    title: 'Player',
    type: 'Jogador',
    quantity: 2,
    status: 'Repetida',
    isSpecial: false,
  },
]

const repeatedSummary: ReportSummary = {
  title: 'Album',
  filterLabel: 'Repetidas',
  sectionLabel: 'Todas',
  generatedAt: '2026-05-16T12:00:00.000Z',
  totalRows: 4,
  ownedRows: 4,
  missingRows: 0,
  repeatedTotal: 5,
}

describe('compact report exporters', () => {
  it('groups sticker numbers by section preserving quantities for duplicates', () => {
    const groups = buildCompactReportGroups(repeatedRows, repeatedSummary)

    expect(groups).toEqual([
      {
        sectionCode: 'BRA',
        sectionName: 'Brazil',
        group: 'C',
        items: ['1 (x2)', '16 (x1)'],
      },
      {
        sectionCode: 'MAR',
        sectionName: 'Morocco',
        group: 'C',
        items: ['3 (x1)'],
      },
      {
        sectionCode: 'ARG',
        sectionName: 'Argentina',
        group: 'J',
        items: ['2 (x1)'],
      },
    ])
  })

  it('builds a WhatsApp-friendly text report', () => {
    const text = buildWhatsappReportText(repeatedRows, repeatedSummary)

    expect(text).toContain('🏆 Copa 2026')
    expect(text).toContain('📦 FIGURINHAS REPETIDAS (5)')
    expect(text).toContain(`${getFlagEmojiForSection('BRA')} BRA: 1 (x2), 16 (x1)`)
    expect(text).toContain(`${getFlagEmojiForSection('MAR')} MAR: 3 (x1)`)
    expect(text).toContain(`${getFlagEmojiForSection('ARG')} ARG: 2 (x1)`)
    expect(text).toContain(
      `${getFlagEmojiForSection('BRA')} BRA: 1 (x2), 16 (x1)\n${getFlagEmojiForSection('MAR')} MAR: 3 (x1)`,
    )
    expect(text).toContain(
      `${getFlagEmojiForSection('MAR')} MAR: 3 (x1)\n\n${getFlagEmojiForSection('ARG')} ARG: 2 (x1)`,
    )
    expect(text).not.toContain('Grupo')
  })
})
