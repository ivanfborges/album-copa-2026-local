export type PageId = 'dashboard' | 'album' | 'reports' | 'aivan' | 'backup'

export type StickerFilter = 'all' | 'missing' | 'owned' | 'repeated' | 'special'

export type AlbumStickerFilter = Exclude<StickerFilter, 'special'>

export type ThemeMode = 'light' | 'dark'

export type StickerType =
  | 'player'
  | 'badge'
  | 'team_photo'
  | 'special'
  | 'intro'
  | 'extra'

export type Sticker = {
  id: string
  displayCode: string
  sectionCode: string
  sectionName: string
  teamCode: string
  teamName: string
  number: number
  title: string
  type: StickerType
  isSpecial: boolean
  albumOrder: number
}

export type StickerSection = {
  path: string
  code: string
  name: string
  expectedCount: number
}

export type SectionStats = StickerSection & {
  group?: string
  owned: number
  total: number
}

export type TeamProgressStats = SectionStats & {
  completion: number
}

export type InventoryItem = {
  stickerId: string
  quantity: number
  notes?: string
  updatedAt: string
}

export type CollectionEventType =
  | 'sticker-set'
  | 'bulk-add'
  | 'bulk-remove'
  | 'duplicates-trim'
  | 'backup-restore'
  | 'historical-batch'

export type CollectionEventSource =
  | 'manual'
  | 'quick-entry'
  | 'pack'
  | 'backup'
  | 'historical'

export type CollectionEvent = {
  id: string
  occurredAt: string
  createdAt: string
  type: CollectionEventType
  source: CollectionEventSource
  stickerId?: string
  totalStickers: number
  uniqueStickers?: number
  repeatedStickers?: number
  affectedStickers?: number
  quantityDelta?: number
  quantityAfter?: number
  notes?: string
}

export type HistoricalBatchInput = {
  occurredAt: string
  totalStickers: number
  uniqueStickers: number
  repeatedStickers: number
  notes?: string
}

export type AlbumSettings = {
  albumNickname: string
  lastOpenedAt?: string
  lastSavedAt?: string
}

export type BackupMode = 'replace' | 'merge'

export type BackupPayload = {
  app: 'album-copa-2026-local'
  version: 1 | 2
  albumId: 'panini-fwc-2026'
  exportedAt: string
  settings: AlbumSettings
  inventory: InventoryItem[]
  collectionEvents?: CollectionEvent[]
}

export type AppMeta = {
  key: string
  value: unknown
  updatedAt: string
}
