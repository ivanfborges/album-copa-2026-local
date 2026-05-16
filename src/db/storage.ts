import { ALBUM_ID } from '../data/album'
import { stickers } from '../data/catalog'
import type { AlbumSettings, BackupMode, BackupPayload, InventoryItem } from '../types'
import { db } from './database'

const SETTINGS_KEY = 'settings'
const validStickerIds = new Set<string>(stickers.map((sticker) => sticker.id))

const defaultSettings: AlbumSettings = {
  albumNickname: 'Meu album da Copa 2026',
}

function now() {
  return new Date().toISOString()
}

function normalizeSettings(value: unknown): AlbumSettings {
  if (!value || typeof value !== 'object') {
    return defaultSettings
  }

  const settings = value as Partial<AlbumSettings>

  return {
    ...defaultSettings,
    ...settings,
    albumNickname:
      typeof settings.albumNickname === 'string' && settings.albumNickname.trim()
        ? settings.albumNickname
        : defaultSettings.albumNickname,
  }
}

function filterValidInventory(items: InventoryItem[]) {
  return items.filter((item) => validStickerIds.has(item.stickerId) && item.quantity > 0)
}

export async function getSettings() {
  const record = await db.meta.get(SETTINGS_KEY)
  return normalizeSettings(record?.value)
}

export async function saveSettings(settings: Partial<AlbumSettings>) {
  const current = await getSettings()
  const updated: AlbumSettings = {
    ...current,
    ...settings,
    lastSavedAt: now(),
  }

  await db.meta.put({
    key: SETTINGS_KEY,
    value: updated,
    updatedAt: updated.lastSavedAt!,
  })

  return updated
}

export async function touchLastOpened() {
  return saveSettings({ lastOpenedAt: now() })
}

export async function getInventory() {
  return db.inventory.toArray()
}

export async function replaceInventory(items: InventoryItem[]) {
  await db.transaction('rw', db.inventory, async () => {
    await db.inventory.clear()
    if (items.length) {
      await db.inventory.bulkPut(items)
    }
  })
}

export async function mergeInventory(items: InventoryItem[]) {
  const current = await getInventory()
  const merged = new Map<string, InventoryItem>()

  for (const item of current) {
    merged.set(item.stickerId, item)
  }

  for (const item of items) {
    const existing = merged.get(item.stickerId)
    if (!existing || item.quantity > existing.quantity) {
      merged.set(item.stickerId, item)
    }
  }

  await replaceInventory([...merged.values()])
}

export async function saveStickerQuantity(stickerId: string, quantity: number) {
  const normalizedQuantity = Math.max(0, Math.floor(quantity))
  const savedAt = now()

  await db.transaction('rw', db.inventory, db.meta, async () => {
    if (normalizedQuantity <= 0) {
      await db.inventory.delete(stickerId)
    } else {
      await db.inventory.put({
        stickerId,
        quantity: normalizedQuantity,
        updatedAt: savedAt,
      })
    }

    const currentSettings = await getSettings()
    await db.meta.put({
      key: SETTINGS_KEY,
      value: {
        ...currentSettings,
        lastSavedAt: savedAt,
      },
      updatedAt: savedAt,
    })
  })

  return savedAt
}

export async function buildBackupPayload(): Promise<BackupPayload> {
  const [settings, inventory] = await Promise.all([getSettings(), getInventory()])

  return {
    app: 'album-copa-2026-local',
    version: 1,
    albumId: ALBUM_ID,
    exportedAt: now(),
    settings,
    inventory: filterValidInventory(inventory),
  }
}

export async function restoreBackup(payload: BackupPayload, mode: BackupMode) {
  const restoredAt = now()
  const restoredSettings: AlbumSettings = {
    ...payload.settings,
    lastSavedAt: restoredAt,
  }

  await db.transaction('rw', db.meta, db.inventory, async () => {
    await db.meta.put({
      key: SETTINGS_KEY,
      value: restoredSettings,
      updatedAt: restoredAt,
    })

    if (mode === 'replace') {
      await db.inventory.clear()
      const validInventory = filterValidInventory(payload.inventory)

      if (validInventory.length) {
        await db.inventory.bulkPut(validInventory)
      }
      return
    }

    const current = await db.inventory.toArray()
    const merged = new Map<string, InventoryItem>()

    for (const item of current) {
      merged.set(item.stickerId, item)
    }

    for (const item of filterValidInventory(payload.inventory)) {
      const existing = merged.get(item.stickerId)
      if (!existing || item.quantity > existing.quantity) {
        merged.set(item.stickerId, item)
      }
    }

    await db.inventory.clear()
    if (merged.size) {
      await db.inventory.bulkPut([...merged.values()])
    }
  })

  return restoredSettings
}
