import { APP_BACKUP_ID, ALBUM_ID } from '../data/album'
import { stickers } from '../data/catalog'
import type { BackupPayload, InventoryItem } from '../types'

export type ParsedBackup = {
  payload: BackupPayload
  ignoredItems: number
  duplicateItems: number
}

const validStickerIds = new Set<string>(stickers.map((sticker) => sticker.id))

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

  if (parsed.app !== APP_BACKUP_ID || parsed.albumId !== ALBUM_ID || parsed.version !== 1) {
    throw new Error('Arquivo de backup incompativel.')
  }

  const normalized = normalizeInventory(parsed.inventory)

  return {
    payload: {
      app: APP_BACKUP_ID,
      version: 1,
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
    },
    ignoredItems: normalized.ignoredItems,
    duplicateItems: normalized.duplicateItems,
  }
}
