import Dexie, { type Table } from 'dexie'
import type { AppMeta, CollectionEvent, InventoryItem } from '../types'

class AlbumDatabase extends Dexie {
  inventory!: Table<InventoryItem, string>
  collectionEvents!: Table<CollectionEvent, string>
  meta!: Table<AppMeta, string>

  constructor() {
    super('album-copa-2026')

    this.version(1).stores({
      inventory: 'stickerId, quantity, updatedAt',
      meta: 'key, updatedAt',
    })

    this.version(2).stores({
      inventory: 'stickerId, quantity, updatedAt',
      collectionEvents: 'id, occurredAt, type, source, stickerId',
      meta: 'key, updatedAt',
    })
  }
}

export const db = new AlbumDatabase()
