import { APP_BACKUP_ID, ALBUM_ID } from '../data/album'
import { stickers } from '../data/catalog'
import type { BackupPayload, CollectionEvent, InventoryItem } from '../types'

export type ParsedBackup = {
  payload: BackupPayload
  ignoredItems: number
  duplicateItems: number
}

const validStickerIds = new Set<string>(stickers.map((sticker) => sticker.id))
const validBackupVersions = new Set([1, 2])
const validEventTypes = new Set<CollectionEvent['type']>([
  'sticker-set',
  'bulk-add',
  'bulk-remove',
  'duplicates-trim',
  'backup-restore',
  'historical-batch',
])
const validEventSources = new Set<CollectionEvent['source']>([
  'manual',
  'quick-entry',
  'pack',
  'backup',
  'historical',
])

function normalizeStickerId(value: unknown) {
  return typeof value === 'string' ? value.toUpperCase().replace(/\s+/g, '').trim() : ''
}

function normalizeInventory(items: unknown): {
  inventory: InventoryItem[]
  ignoredItems: number
  duplicateItems: number
} {
  if (!Array.isArray(items)) {
    throw new Error('Inventario do backup ausente ou invalido.')
  }

  const normalized = new Map<string, InventoryItem>()
  let ignoredItems = 0
  let duplicateItems = 0

  for (const rawItem of items) {
    if (!rawItem || typeof rawItem !== 'object') {
      ignoredItems += 1
      continue
    }

    const item = rawItem as Partial<InventoryItem>
    const stickerId = normalizeStickerId(item.stickerId)
    const quantity =
      typeof item.quantity === 'number' && Number.isFinite(item.quantity)
        ? Math.max(0, Math.floor(item.quantity))
        : 0

    if (!validStickerIds.has(stickerId) || quantity <= 0) {
      ignoredItems += 1
      continue
    }

    const normalizedItem: InventoryItem = {
      stickerId,
      quantity,
      notes: typeof item.notes === 'string' ? item.notes : undefined,
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
    }
    const existing = normalized.get(stickerId)

    if (existing) {
      duplicateItems += 1
      if (quantity > existing.quantity) {
        normalized.set(stickerId, normalizedItem)
      }
      continue
    }

    normalized.set(stickerId, normalizedItem)
  }

  return {
    inventory: [...normalized.values()],
    ignoredItems,
    duplicateItems,
  }
}

function normalizeCount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : undefined
}

function normalizeEvents(items: unknown): CollectionEvent[] {
  if (!Array.isArray(items)) {
    return []
  }

  const normalized = new Map<string, CollectionEvent>()

  for (const rawItem of items) {
    if (!rawItem || typeof rawItem !== 'object') {
      continue
    }

    const item = rawItem as Partial<CollectionEvent>
    const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : ''
    const type = item.type && validEventTypes.has(item.type) ? item.type : undefined
    const source = item.source && validEventSources.has(item.source) ? item.source : undefined
    const totalStickers = normalizeCount(item.totalStickers)

    if (!id || !type || !source || totalStickers === undefined) {
      continue
    }

    normalized.set(id, {
      id,
      type,
      source,
      occurredAt:
        typeof item.occurredAt === 'string' ? item.occurredAt : new Date().toISOString(),
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      stickerId:
        typeof item.stickerId === 'string' && validStickerIds.has(normalizeStickerId(item.stickerId))
          ? normalizeStickerId(item.stickerId)
          : undefined,
      totalStickers,
      uniqueStickers: normalizeCount(item.uniqueStickers),
      repeatedStickers: normalizeCount(item.repeatedStickers),
      affectedStickers: normalizeCount(item.affectedStickers),
      quantityDelta:
        typeof item.quantityDelta === 'number' && Number.isFinite(item.quantityDelta)
          ? Math.floor(item.quantityDelta)
          : undefined,
      quantityAfter: normalizeCount(item.quantityAfter),
      notes: typeof item.notes === 'string' ? item.notes : undefined,
    })
  }

  return [...normalized.values()]
}

export function downloadJsonBackup(payload: BackupPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `album-copa-2026-backup-${payload.exportedAt.slice(0, 10)}.json`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function parseBackupFile(file: File): Promise<ParsedBackup> {
  const text = await file.text()
  const parsed = JSON.parse(text) as Partial<BackupPayload>

  if (
    parsed.app !== APP_BACKUP_ID ||
    parsed.albumId !== ALBUM_ID ||
    !validBackupVersions.has(parsed.version ?? 0)
  ) {
    throw new Error('Arquivo de backup incompativel.')
  }

  const normalized = normalizeInventory(parsed.inventory)
  const collectionEvents = normalizeEvents(parsed.collectionEvents)

  return {
    payload: {
      app: APP_BACKUP_ID,
      version: parsed.version === 2 ? 2 : 1,
      albumId: ALBUM_ID,
      exportedAt:
        typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
      settings: {
        albumNickname:
          typeof parsed.settings?.albumNickname === 'string' && parsed.settings.albumNickname.trim()
            ? parsed.settings.albumNickname
            : 'Meu album da Copa 2026',
        lastOpenedAt:
          typeof parsed.settings?.lastOpenedAt === 'string'
            ? parsed.settings.lastOpenedAt
            : undefined,
        lastSavedAt:
          typeof parsed.settings?.lastSavedAt === 'string'
            ? parsed.settings.lastSavedAt
            : undefined,
      },
      inventory: normalized.inventory,
      collectionEvents,
    },
    ignoredItems: normalized.ignoredItems,
    duplicateItems: normalized.duplicateItems,
  }
}
