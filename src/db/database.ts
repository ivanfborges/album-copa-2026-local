import Dexie, { type Table } from 'dexie'
import type { AppMeta, InventoryItem } from '../types'

class AlbumDatabase extends Dexie {
  inventory!: Table<InventoryItem, string>
  meta!: Table<AppMeta, string>

  constructor() {
    super('album-copa-2026')

    this.version(1).stores({
      inventory: 'stickerId, quantity, updatedAt',
      meta: 'key, updatedAt',
    })
  }
}

export const db = new AlbumDatabase()
