import { groupBySectionCode, sectionOrderByCode } from '../data/groups'
import type { InventoryItem, Sticker, StickerFilter, StickerType } from '../types'

export type ReportSectionOption = 'all' | string

export type ReportRow = {
  code: string
  sectionCode: string
  sectionName: string
  group: string
  title: string
  type: string
  quantity: number
  status: string
  isSpecial: boolean
}

export type ReportSummary = {
  title: string
  filterLabel: string
  sectionLabel: string
  generatedAt: string
  totalRows: number
  ownedRows: number
  missingRows: number
  repeatedTotal: number
}

export const reportFilterLabels: Record<StickerFilter, string> = {
  all: 'Todas',
  missing: 'Faltantes',
  owned: 'Tenho',
  repeated: 'Repetidas',
  special: 'Especiais',
}

export const reportTypeLabels: Record<StickerType, string> = {
  badge: 'Escudo',
  extra: 'Extra',
  intro: 'Abertura',
  player: 'Jogador',
  special: 'Especial',
  team_photo: 'Foto da selecao',
}

export function sortStickersByAlbumOrder(stickers: readonly Sticker[]) {
  return [...stickers].sort(
    (first, second) =>
      (sectionOrderByCode.get(first.sectionCode) ?? 999) -
        (sectionOrderByCode.get(second.sectionCode) ?? 999) || first.number - second.number,
  )
}

export function buildReportRows(
  stickers: readonly Sticker[],
  inventory: readonly InventoryItem[],
  filter: StickerFilter,
  sectionCode: ReportSectionOption,
) {
  const inventoryById = new Map(inventory.map((item) => [item.stickerId, item]))

  return sortStickersByAlbumOrder(stickers)
    .filter((sticker) => sectionCode === 'all' || sticker.sectionCode === sectionCode)
    .map<ReportRow>((sticker) => {
      const quantity = inventoryById.get(sticker.id)?.quantity ?? 0
      const status = quantity > 1 ? 'Repetida' : quantity === 1 ? 'Tenho' : 'Faltante'

      return {
        code: sticker.displayCode,
        sectionCode: sticker.sectionCode,
        sectionName: sticker.sectionName,
        group: groupBySectionCode.get(sticker.sectionCode) ?? '',
        title: sticker.title,
        type: reportTypeLabels[sticker.type],
        quantity,
        status,
        isSpecial: sticker.isSpecial,
      }
    })
    .filter((row) => {
      if (filter === 'missing') {
        return row.quantity === 0
      }

      if (filter === 'owned') {
        return row.quantity > 0
      }

      if (filter === 'repeated') {
        return row.quantity > 1
      }

      if (filter === 'special') {
        return row.isSpecial
      }

      return true
    })
}

export function buildReportSummary(
  rows: readonly ReportRow[],
  title: string,
  filter: StickerFilter,
  sectionLabel: string,
): ReportSummary {
  return {
    title,
    filterLabel: reportFilterLabels[filter],
    sectionLabel,
    generatedAt: new Date().toISOString(),
    totalRows: rows.length,
    ownedRows: rows.filter((row) => row.quantity > 0).length,
    missingRows: rows.filter((row) => row.quantity === 0).length,
    repeatedTotal: rows.reduce((total, row) => total + Math.max(0, row.quantity - 1), 0),
  }
}
