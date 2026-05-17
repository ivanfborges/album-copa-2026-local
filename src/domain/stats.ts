import type { InventoryItem } from '../types'

export type CollectionStats = {
  ownedUnique: number
  repeatedUnique: number
  repeatedTotal: number
  totalObtained: number
  missing: number
  completion: number
}

export function getCollectionStats(inventory: InventoryItem[], totalStickers: number): CollectionStats {
  const ownedUnique = inventory.filter((item) => item.quantity > 0).length
  const repeatedUnique = inventory.filter((item) => item.quantity > 1).length
  const repeatedTotal = inventory.reduce(
    (total, item) => total + Math.max(0, item.quantity - 1),
    0,
  )
  const totalObtained = ownedUnique + repeatedTotal
  const missing = Math.max(0, totalStickers - ownedUnique)
  const completion = totalStickers > 0 ? Math.round((ownedUnique / totalStickers) * 100) : 0

  return {
    ownedUnique,
    repeatedUnique,
    repeatedTotal,
    totalObtained,
    missing,
    completion,
  }
}
