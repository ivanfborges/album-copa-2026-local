import type { CollectionEvent } from '../types'
import type { CollectionStats } from './stats'
import type { TradeStrategy } from './tradeStrategy'

export type NextBestActionType =
  | 'buy_packs'
  | 'trade_first'
  | 'buy_and_trade'
  | 'wait'
  | 'manual_targets'

export type NextBestActionConfidence = 'baixa' | 'media' | 'alta'

export type NextBestAction = {
  action: NextBestActionType
  title: string
  recommendation: string
  confidence: NextBestActionConfidence
  reasons: string[]
  risks: string[]
  suggestedPackCount?: number
  suggestedTradeTargets?: string[]
  suggestedDuplicateCodes?: string[]
}

type NextBestActionInput = {
  stats: CollectionStats
  tradeStrategy: TradeStrategy
  events: readonly CollectionEvent[]
}

function getSuggestedPackCount(action: NextBestActionType, stats: CollectionStats) {
  if (action === 'buy_and_trade') {
    return 5
  }

  if (action !== 'buy_packs') {
    return undefined
  }

  if (stats.completion < 45) {
    return 10
  }

  if (stats.completion < 70) {
    return 5
  }

  return 3
}

function getConfidence({
  action,
  stats,
  events,
}: {
  action: NextBestActionType
  stats: CollectionStats
  events: readonly CollectionEvent[]
}): NextBestActionConfidence {
  if (stats.missing === 0) {
    return 'alta'
  }

  if (events.length < 2) {
    return 'baixa'
  }

  let score = 0

  if (events.length >= 4) {
    score += 2
  } else {
    score += 1
  }

  if (stats.totalObtained >= 120) {
    score += 1
  }

  if (
    (action === 'trade_first' || action === 'buy_and_trade') &&
    stats.repeatedTotal >= Math.min(30, Math.ceil(stats.missing * 0.25))
  ) {
    score += 1
  }

  if (stats.completion >= 75) {
    score += 1
  }

  if (score >= 4) {
    return 'alta'
  }

  if (score >= 2) {
    return 'media'
  }

  return 'baixa'
}

function makeAction({
  action,
  title,
  recommendation,
  stats,
  tradeStrategy,
  events,
  reasons,
  risks,
}: {
  action: NextBestActionType
  title: string
  recommendation: string
  stats: CollectionStats
  tradeStrategy: TradeStrategy
  events: readonly CollectionEvent[]
  reasons: string[]
  risks: string[]
}): NextBestAction {
  return {
    action,
    title,
    recommendation,
    confidence: getConfidence({ action, stats, events }),
    reasons,
    risks,
    suggestedPackCount: getSuggestedPackCount(action, stats),
    suggestedTradeTargets: tradeStrategy.topMissingTargets
      .slice(0, 4)
      .map((target) => target.displayCode),
    suggestedDuplicateCodes: tradeStrategy.topDuplicateCandidates
      .slice(0, 4)
      .map((duplicate) => duplicate.displayCode),
  }
}

export function buildNextBestAction({
  stats,
  tradeStrategy,
  events,
}: NextBestActionInput): NextBestAction {
  const hasAnyTradeCurrency = stats.repeatedTotal > 0
  const hasGoodTradeCurrency =
    stats.repeatedTotal >= Math.min(30, Math.max(8, Math.ceil(stats.missing * 0.18)))
  const topMissingIsHighPriority =
    tradeStrategy.topMissingTargets.some((target) => target.priority === 'alta')

  if (stats.missing === 0) {
    return makeAction({
      action: 'wait',
      title: 'Agora: manter o álbum completo',
      recommendation: 'Não compre pacotinhos agora; mantenha backup e use repetidas só para ajudar trocas',
      stats,
      tradeStrategy,
      events,
      reasons: ['O álbum está 100% concluído', 'Comprar não adiciona novas figurinhas'],
      risks: ['Evite alterar o inventário sem exportar backup antes'],
    })
  }

  if (stats.missing <= 12 && !hasAnyTradeCurrency) {
    return makeAction({
      action: 'manual_targets',
      title: 'Agora: buscar alvos específicos',
      recommendation: 'Monte uma lista curta de faltantes e negocie manualmente antes de comprar mais',
      stats,
      tradeStrategy,
      events,
      reasons: [
        `Faltam só ${stats.missing} figurinha(s)`,
        'Sem repetidas extras, pacotinho tende a ser pouco eficiente',
      ],
      risks: ['Pode ser necessário comprar avulsas ou combinar trocas fora do app'],
    })
  }

  if (stats.completion >= 85 && hasAnyTradeCurrency) {
    return makeAction({
      action: 'trade_first',
      title: 'Agora: priorizar trocas',
      recommendation: 'Use suas repetidas mais fortes para atacar as faltantes prioritárias',
      stats,
      tradeStrategy,
      events,
      reasons: [
        `${stats.completion}% do álbum já está concluído`,
        `${stats.repeatedTotal} repetida(s) extra(s) viram moeda de troca`,
        topMissingIsHighPriority ? 'Há faltantes de alta prioridade no ranking' : 'Trocar reduz compra aleatória',
      ],
      risks: ['Comprar pacotinhos nesta fase aumenta a chance de novas repetidas'],
    })
  }

  if (stats.completion >= 60 && hasGoodTradeCurrency) {
    return makeAction({
      action: 'buy_and_trade',
      title: 'Agora: combinar compra e troca',
      recommendation: 'Compre poucos pacotes para gerar fluxo e troque as repetidas mais líquidas',
      stats,
      tradeStrategy,
      events,
      reasons: [
        `${stats.repeatedTotal} repetida(s) extra(s) sustentam trocas`,
        'Ainda há espaço para pacotes renderem algumas novas',
        'Combinar compra controlada com troca reduz dependência de sorte',
      ],
      risks: ['O ganho depende de encontrar parceiros de troca com faltantes compatíveis'],
    })
  }

  if (stats.missing <= 35 && hasAnyTradeCurrency) {
    return makeAction({
      action: 'trade_first',
      title: 'Agora: trocar antes de comprar',
      recommendation: 'Tente fechar as faltantes por troca e compre só se travar',
      stats,
      tradeStrategy,
      events,
      reasons: [
        `Restam ${stats.missing} faltante(s)`,
        'Cada pacote tem chance menor de trazer figurinha nova',
      ],
      risks: ['Se as faltantes forem raras, a negociação pode demorar mais que a compra'],
    })
  }

  return makeAction({
    action: 'buy_packs',
    title: 'Agora: comprar pacotes',
    recommendation: 'Comprar ainda é a ação com melhor custo de esforço para aumentar a coleção',
    stats,
    tradeStrategy,
    events,
    reasons: [
      `${stats.missing} figurinha(s) ainda faltam`,
      stats.completion < 60
        ? 'Nesta fase, pacotinhos ainda tendem a trazer novas figurinhas'
        : 'Ainda falta volume antes de depender só de trocas',
      hasAnyTradeCurrency ? 'Guarde as repetidas fortes para trocas depois' : 'Ainda há pouca moeda de troca',
    ],
    risks: ['A eficiência dos pacotes cai conforme o álbum avança'],
  })
}
