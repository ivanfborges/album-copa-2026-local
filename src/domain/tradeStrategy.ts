import type { InventoryItem, Sticker } from '../types'
import type { CollectionStats } from './stats'

export type TradePriority = 'alta' | 'media' | 'baixa'

export type StickerTradeScore = {
  stickerId: string
  displayCode: string
  sectionCode: string
  sectionName: string
  quantity: number
  extraCopies: number
  score: number
  priority: TradePriority
  reasons: string[]
}

export type TradeStrategy = {
  topDuplicateCandidates: StickerTradeScore[]
  topMissingTargets: StickerTradeScore[]
  summary: string
}

type TradeStrategyInput = {
  stickers: readonly Sticker[]
  inventoryByStickerId: ReadonlyMap<string, InventoryItem>
  stats: CollectionStats
  maxItems?: number
}

type SectionState = {
  total: number
  owned: number
  missing: number
}

type ScoreContext = {
  sticker: Sticker
  quantity: number
  extraCopies: number
  sectionState: SectionState
  stats: CollectionStats
  mode: 'duplicate' | 'missing'
}

function toPriority(score: number): TradePriority {
  if (score >= 70) {
    return 'alta'
  }

  if (score >= 40) {
    return 'media'
  }

  return 'baixa'
}

function pushReason(reasons: string[], condition: boolean, reason: string) {
  if (condition) {
    reasons.push(reason)
  }
}

function getSectionStates(
  stickers: readonly Sticker[],
  inventoryByStickerId: ReadonlyMap<string, InventoryItem>,
) {
  const states = new Map<string, SectionState>()

  for (const sticker of stickers) {
    const current = states.get(sticker.sectionCode) ?? {
      total: 0,
      owned: 0,
      missing: 0,
    }
    const quantity = inventoryByStickerId.get(sticker.id)?.quantity ?? 0

    current.total += 1
    if (quantity > 0) {
      current.owned += 1
    } else {
      current.missing += 1
    }

    states.set(sticker.sectionCode, current)
  }

  return states
}

function scoreSticker({
  sticker,
  quantity,
  extraCopies,
  sectionState,
  stats,
  mode,
}: ScoreContext): StickerTradeScore {
  const reasons: string[] = []
  let score = 0

  const isHistoryOrSpecial = sticker.sectionCode === 'FWC' || sticker.isSpecial
  const isTeamBadge = sticker.number === 1 && sticker.sectionCode !== 'PANINI'
  const isTeamPhoto = sticker.type === 'team_photo' || sticker.number === 13
  const sectionCompletion =
    sectionState.total > 0 ? Math.round((sectionState.owned / sectionState.total) * 100) : 0

  if (isHistoryOrSpecial) {
    score += sticker.sectionCode === 'FWC' ? 46 : 38
    pushReason(reasons, true, sticker.sectionCode === 'FWC' ? 'especial FWC' : 'especial brilhante')
  }

  if (isTeamBadge) {
    score += 18
    pushReason(reasons, true, 'escudo brilhante')
  }

  if (isTeamPhoto) {
    score += 28
    pushReason(reasons, true, 'foto do time')
  }

  if (mode === 'duplicate') {
    const liquidityWeight = Math.min(32, extraCopies * 10)
    score += liquidityWeight
    pushReason(
      reasons,
      extraCopies > 1,
      `${extraCopies} cópias extras aumentam a liquidez`,
    )
    pushReason(reasons, extraCopies === 1, 'uma cópia extra disponível')

    if (stats.completion >= 75) {
      score += 10
      reasons.push('trocas ganham valor nesta fase do álbum')
    }
  } else {
    if (sectionState.missing <= 2 && sectionState.total >= 10) {
      score += 30
      reasons.push('fecha uma seção quase completa')
    } else if (sectionCompletion >= 75 && sectionState.total >= 10) {
      score += 18
      reasons.push('acelera uma seção avançada')
    }

    if (stats.completion >= 90) {
      score += 18
      reasons.push('comprar pacotinhos tende a render menos')
    } else if (stats.completion >= 75) {
      score += 12
      reasons.push('troca começa a superar compra aleatória')
    }
  }

  if (reasons.length === 0) {
    score += mode === 'duplicate' ? 12 : 10
    reasons.push(mode === 'duplicate' ? 'boa moeda comum de troca' : 'faltante comum')
  }

  return {
    stickerId: sticker.id,
    displayCode: sticker.displayCode,
    sectionCode: sticker.sectionCode,
    sectionName: sticker.sectionName,
    quantity,
    extraCopies,
    score,
    priority: toPriority(score),
    reasons: reasons.slice(0, 3),
  }
}

function compareScores(left: StickerTradeScore, right: StickerTradeScore, orderById: Map<string, number>) {
  return right.score - left.score || (orderById.get(left.stickerId) ?? 0) - (orderById.get(right.stickerId) ?? 0)
}

function buildSummary(stats: CollectionStats, duplicateCount: number, missingCount: number) {
  if (stats.missing === 0) {
    return 'Álbum completo; mantenha repetidas apenas para ajudar outras trocas'
  }

  if (duplicateCount === 0) {
    return `${missingCount} alvo(s) de troca identificados, mas ainda não há repetidas extras para oferecer`
  }

  if (stats.completion >= 75) {
    return `${duplicateCount} repetida(s) forte(s) e ${missingCount} faltante(s) prioritária(s); trocas devem ganhar peso agora`
  }

  return `${duplicateCount} repetida(s) úteis para negociar e ${missingCount} faltante(s) para priorizar`
}

export function buildTradeStrategy({
  stickers,
  inventoryByStickerId,
  stats,
  maxItems = 6,
}: TradeStrategyInput): TradeStrategy {
  const sectionStates = getSectionStates(stickers, inventoryByStickerId)
  const orderById = new Map(stickers.map((sticker, index) => [sticker.id, index]))
  const duplicateCandidates: StickerTradeScore[] = []
  const missingTargets: StickerTradeScore[] = []

  for (const sticker of stickers) {
    const quantity = inventoryByStickerId.get(sticker.id)?.quantity ?? 0
    const sectionState = sectionStates.get(sticker.sectionCode) ?? {
      total: 0,
      owned: 0,
      missing: 0,
    }

    if (quantity > 1) {
      duplicateCandidates.push(
        scoreSticker({
          sticker,
          quantity,
          extraCopies: quantity - 1,
          sectionState,
          stats,
          mode: 'duplicate',
        }),
      )
    }

    if (quantity === 0) {
      missingTargets.push(
        scoreSticker({
          sticker,
          quantity,
          extraCopies: 0,
          sectionState,
          stats,
          mode: 'missing',
        }),
      )
    }
  }

  const topDuplicateCandidates = duplicateCandidates
    .sort((left, right) => compareScores(left, right, orderById))
    .slice(0, maxItems)
  const topMissingTargets = missingTargets
    .sort((left, right) => compareScores(left, right, orderById))
    .slice(0, maxItems)

  return {
    topDuplicateCandidates,
    topMissingTargets,
    summary: buildSummary(stats, topDuplicateCandidates.length, topMissingTargets.length),
  }
}
