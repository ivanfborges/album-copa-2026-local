import { ALBUM_ID } from '../data/album'
import { stickers } from '../data/catalog'
import type {
  AlbumSettings,
  BackupMode,
  BackupPayload,
  CollectionEvent,
  HistoricalBatchInput,
  InventoryItem,
} from '../types'
import { db } from './database'

const SETTINGS_KEY = 'settings'
const validStickerIds = new Set<string>(stickers.map((sticker) => sticker.id))

const defaultSettings: AlbumSettings = {
  albumNickname: 'Meu album da Copa 2026',
}

function now() {
  return new Date().toISOString()
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeEventCount(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

function createCollectionEvent(
  input: Omit<CollectionEvent, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
): CollectionEvent {
  const createdAt = input.createdAt ?? now()

  return {
    ...input,
    id: input.id ?? createId('event'),
    createdAt,
    occurredAt: input.occurredAt || createdAt,
    totalStickers: normalizeEventCount(input.totalStickers),
    uniqueStickers:
      typeof input.uniqueStickers === 'number'
        ? normalizeEventCount(input.uniqueStickers)
        : undefined,
    repeatedStickers:
      typeof input.repeatedStickers === 'number'
        ? normalizeEventCount(input.repeatedStickers)
        : undefined,
    affectedStickers:
      typeof input.affectedStickers === 'number'
        ? normalizeEventCount(input.affectedStickers)
        : undefined,
  }
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

function filterValidEvents(items: CollectionEvent[]) {
  return items.filter((item) => item.id && item.occurredAt && item.createdAt && item.totalStickers >= 0)
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

export async function getCollectionEvents() {
  return db.collectionEvents.orderBy('occurredAt').toArray()
}

export async function getCollectionEventCount() {
  return db.collectionEvents.count()
}

export async function recordCollectionEvent(
  input: Omit<CollectionEvent, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
) {
  const event = createCollectionEvent(input)
  await db.transaction('rw', db.collectionEvents, db.meta, async () => {
    await db.collectionEvents.put(event)

    const currentSettings = await getSettings()
    await db.meta.put({
      key: SETTINGS_KEY,
      value: {
        ...currentSettings,
        lastSavedAt: event.createdAt,
      },
      updatedAt: event.createdAt,
    })
  })
  return event
}

export async function recordHistoricalBatch(input: HistoricalBatchInput) {
  const totalStickers = normalizeEventCount(input.totalStickers)
  const uniqueStickers = normalizeEventCount(input.uniqueStickers)
  const repeatedStickers = normalizeEventCount(input.repeatedStickers)

  if (!input.occurredAt || totalStickers <= 0) {
    throw new Error('Marco histórico inválido.')
  }

  if (uniqueStickers + repeatedStickers !== totalStickers) {
    throw new Error('A soma de únicas e repetidas precisa bater com o total.')
  }

  const occurredAtDate = new Date(
    input.occurredAt.length === 10 ? `${input.occurredAt}T12:00:00` : input.occurredAt,
  )

  if (Number.isNaN(occurredAtDate.getTime())) {
    throw new Error('Data do marco histórico inválida.')
  }

  return recordCollectionEvent({
    occurredAt: occurredAtDate.toISOString(),
    type: 'historical-batch',
    source: 'historical',
    totalStickers,
    uniqueStickers,
    repeatedStickers,
    affectedStickers: uniqueStickers,
    notes: input.notes?.trim() || undefined,
  })
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

type SaveStickerQuantityOptions = {
  recordEvent?: boolean
}

export async function saveStickerQuantity(
  stickerId: string,
  quantity: number,
  options: SaveStickerQuantityOptions = {},
) {
  const normalizedQuantity = Math.max(0, Math.floor(quantity))
  const savedAt = now()
  const shouldRecordEvent = options.recordEvent ?? true

  await db.transaction('rw', db.inventory, db.collectionEvents, db.meta, async () => {
    const currentItem = await db.inventory.get(stickerId)
    const currentQuantity = currentItem?.quantity ?? 0

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

    if (shouldRecordEvent && currentQuantity !== normalizedQuantity) {
      const quantityDelta = normalizedQuantity - currentQuantity
      await db.collectionEvents.put(
        createCollectionEvent({
          occurredAt: savedAt,
          type: 'sticker-set',
          source: 'manual',
          stickerId,
          totalStickers: Math.abs(quantityDelta),
          uniqueStickers: currentQuantity === 0 && normalizedQuantity > 0 ? 1 : 0,
          repeatedStickers:
            quantityDelta > 0
              ? Math.max(0, normalizedQuantity - Math.max(1, currentQuantity))
              : 0,
          affectedStickers: 1,
          quantityDelta,
          quantityAfter: normalizedQuantity,
        }),
      )
    }
  })

  return savedAt
}

export async function removeExtraDuplicates() {
  const currentInventory = await getInventory()
  const duplicateItems = currentInventory.filter(
    (item) => validStickerIds.has(item.stickerId) && item.quantity > 1,
  )

  if (duplicateItems.length === 0) {
    return {
      lastSavedAt: undefined,
      removedTotal: 0,
      updatedItems: 0,
    }
  }

  const savedAt = now()
  const trimmedItems = duplicateItems.map((item) => ({
    ...item,
    quantity: 1,
    updatedAt: savedAt,
  }))
  const removedTotal = duplicateItems.reduce((total, item) => total + item.quantity - 1, 0)

  await db.transaction('rw', db.inventory, db.collectionEvents, db.meta, async () => {
    await db.inventory.bulkPut(trimmedItems)

    const currentSettings = await getSettings()
    await db.meta.put({
      key: SETTINGS_KEY,
      value: {
        ...currentSettings,
        lastSavedAt: savedAt,
      },
      updatedAt: savedAt,
    })

    await db.collectionEvents.put(
      createCollectionEvent({
        occurredAt: savedAt,
        type: 'duplicates-trim',
        source: 'manual',
        totalStickers: removedTotal,
        repeatedStickers: removedTotal,
        affectedStickers: trimmedItems.length,
        notes: 'Remoção das quantidades extras de figurinhas repetidas.',
      }),
    )
  })

  return {
    lastSavedAt: savedAt,
    removedTotal,
    updatedItems: trimmedItems.length,
  }
}

export async function buildBackupPayload(): Promise<BackupPayload> {
  const [settings, inventory, collectionEvents] = await Promise.all([
    getSettings(),
    getInventory(),
    getCollectionEvents(),
  ])

  return {
    app: 'album-copa-2026-local',
    version: 2,
    albumId: ALBUM_ID,
    exportedAt: now(),
    settings,
    inventory: filterValidInventory(inventory),
    collectionEvents: filterValidEvents(collectionEvents),
  }
}

export async function restoreBackup(payload: BackupPayload, mode: BackupMode) {
  const restoredAt = now()
  const restoredSettings: AlbumSettings = {
    ...payload.settings,
    lastSavedAt: restoredAt,
  }

  await db.transaction('rw', db.meta, db.inventory, db.collectionEvents, async () => {
    await db.meta.put({
      key: SETTINGS_KEY,
      value: restoredSettings,
      updatedAt: restoredAt,
    })

    const validEvents = filterValidEvents(payload.collectionEvents ?? [])

    if (mode === 'replace') {
      await db.inventory.clear()
      await db.collectionEvents.clear()
      const validInventory = filterValidInventory(payload.inventory)

      if (validInventory.length) {
        await db.inventory.bulkPut(validInventory)
      }
      if (validEvents.length) {
        await db.collectionEvents.bulkPut(validEvents)
      }
      await db.collectionEvents.put(
        createCollectionEvent({
          occurredAt: restoredAt,
          type: 'backup-restore',
          source: 'backup',
          totalStickers: validInventory.reduce((total, item) => total + item.quantity, 0),
          affectedStickers: validInventory.length,
          notes: 'Backup restaurado substituindo os dados locais.',
        }),
      )
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

    const currentEvents = await db.collectionEvents.toArray()
    const mergedEvents = new Map<string, CollectionEvent>()

    for (const event of currentEvents) {
      mergedEvents.set(event.id, event)
    }

    for (const event of validEvents) {
      mergedEvents.set(event.id, event)
    }

    await db.collectionEvents.clear()
    if (mergedEvents.size) {
      await db.collectionEvents.bulkPut([...mergedEvents.values()])
    }
    await db.collectionEvents.put(
      createCollectionEvent({
        occurredAt: restoredAt,
        type: 'backup-restore',
        source: 'backup',
        totalStickers: filterValidInventory(payload.inventory).reduce(
          (total, item) => total + item.quantity,
          0,
        ),
        affectedStickers: filterValidInventory(payload.inventory).length,
        notes: 'Backup mesclado aos dados locais.',
      }),
    )
  })

  return restoredSettings
}
