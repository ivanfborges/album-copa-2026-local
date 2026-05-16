import { stickerSections, stickers } from '../data/catalog'
import { sectionOrderByCode } from '../data/groups'
import type { StickerFilter, StickerType, ThemeMode } from '../types'

export const stickerTypeLabels: Record<StickerType, string> = {
  badge: 'Escudo',
  extra: 'Extra',
  intro: 'Abertura',
  player: 'Jogador',
  special: 'Especial',
  team_photo: 'Foto da selecao',
}

export const orderedStickerSections = [...stickerSections].sort(
  (first, second) =>
    (sectionOrderByCode.get(first.code) ?? 999) - (sectionOrderByCode.get(second.code) ?? 999),
)

export const orderedStickers = [...stickers].sort(
  (first, second) =>
    (sectionOrderByCode.get(first.sectionCode) ?? 999) -
      (sectionOrderByCode.get(second.sectionCode) ?? 999) || first.number - second.number,
)

export const defaultSectionCode = stickerSections.some((section) => section.code === 'FWC')
  ? 'FWC'
  : 'all'

export const filterOptions: Array<{ id: StickerFilter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'missing', label: 'Faltantes' },
  { id: 'owned', label: 'Tenho' },
  { id: 'repeated', label: 'Repetidas' },
  { id: 'special', label: 'Especiais' },
]

export function normalizeSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function formatDateTime(value?: string) {
  if (!value) {
    return 'Ainda nao salvo'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function getInitialTheme(): ThemeMode {
  const stored = window.localStorage.getItem('album-copa-theme')

  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
