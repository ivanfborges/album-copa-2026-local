import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  Bot,
  BrainCircuit,
  CalendarPlus,
  Handshake,
  Info,
  MessageSquare,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  WifiOff,
} from 'lucide-react'
import type { AIAlbumSnapshot } from '../ai/albumSnapshot'
import { askAIvan, getAIServiceUrl, type AIChatMessage, type AIProvider } from '../ai/client'
import type { HistoricalBatchInput } from '../types'
import type { CompletionForecast, ForecastConfidence } from '../domain/forecast'
import type { CollectionStats } from '../domain/stats'

type AIvanPageProps = {
  albumSnapshot: AIAlbumSnapshot
  completionForecast: CompletionForecast
  stats: CollectionStats
  collectionEventCount: number
  onRecordHistoricalBatch: (input: HistoricalBatchInput) => void
}

function formatForecastDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function getConfidenceLabel(confidence: ForecastConfidence) {
  if (confidence === 'high') {
    return 'alta'
  }

  if (confidence === 'medium') {
    return 'média'
  }

  return 'baixa'
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="info-tooltip" tabIndex={0} aria-label={text}>
      <Info size={12} aria-hidden="true" />
      <span className="info-tooltip-box" role="tooltip">
        {text}
      </span>
    </span>
  )
}

function PanelInfo({ text }: { text: string }) {
  return (
    <span className="panel-info">
      <InfoTooltip text={text} />
    </span>
  )
}

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(\[[^\]]+\]\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s)]+|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const token = match[0]
    const key = `${keyPrefix}-${match.index}`

    if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/)

      if (linkMatch) {
        nodes.push(
          <a key={key} href={linkMatch[2]} target="_blank" rel="noreferrer">
            {linkMatch[1]}
          </a>,
        )
      } else {
        nodes.push(token)
      }
    } else if (token.startsWith('http')) {
      nodes.push(
        <a key={key} href={token} target="_blank" rel="noreferrer">
          {token}
        </a>,
      )
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('`')) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>)
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>)
    }

    lastIndex = match.index + token.length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

function renderMarkdownMessage(content: string) {
  const blocks: ReactNode[] = []
  const lines = content.split(/\r?\n/)
  let paragraph: string[] = []
  let listItems: string[] = []

  function flushParagraph(index: number) {
    if (!paragraph.length) {
      return
    }

    const text = paragraph.join(' ')
    blocks.push(
      <p key={`p-${index}`}>
        {renderInlineMarkdown(text, `p-${index}`)}
      </p>,
    )
    paragraph = []
  }

  function flushList(index: number) {
    if (!listItems.length) {
      return
    }

    blocks.push(
      <ul key={`ul-${index}`}>
        {listItems.map((item, itemIndex) => (
          <li key={`${index}-${itemIndex}`}>
            {renderInlineMarkdown(item, `li-${index}-${itemIndex}`)}
          </li>
        ))}
      </ul>,
    )
    listItems = []
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph(index)
      flushList(index)
      return
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/)
    const numbered = trimmed.match(/^\d+\.\s+(.+)$/)

    if (bullet || numbered) {
      flushParagraph(index)
      listItems.push((bullet ?? numbered)?.[1] ?? trimmed)
      return
    }

    flushList(index)
    paragraph.push(trimmed)
  })

  flushParagraph(lines.length)
  flushList(lines.length)

  return blocks
}

export function AIvanPage({
  albumSnapshot,
  completionForecast,
  stats,
  collectionEventCount,
  onRecordHistoricalBatch,
}: AIvanPageProps) {
  const [historicalDate, setHistoricalDate] = useState('')
  const [historicalTotal, setHistoricalTotal] = useState('')
  const [historicalUnique, setHistoricalUnique] = useState('')
  const [historicalRepeated, setHistoricalRepeated] = useState('')
  const [historicalNotes, setHistoricalNotes] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([])
  const [chatStatus, setChatStatus] = useState<'idle' | 'sending' | 'error'>('idle')
  const [chatError, setChatError] = useState('')
  const [chatProvider, setChatProvider] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('ollama')
  const chatThreadRef = useRef<HTMLDivElement>(null)
  const aiServiceUrl = getAIServiceUrl()
  const tradeStrategy = albumSnapshot.trade_strategy
  const nextBestAction = albumSnapshot.next_best_action
  const duplicateCandidates = tradeStrategy.topDuplicateCandidates.slice(0, 3)
  const missingTargets = tradeStrategy.topMissingTargets.slice(0, 3)
  const canSubmitHistoricalBatch =
    Boolean(historicalDate) &&
    Number(historicalTotal) > 0 &&
    Number(historicalUnique) >= 0 &&
    Number(historicalRepeated) >= 0 &&
    Number(historicalUnique) + Number(historicalRepeated) === Number(historicalTotal)
  const canSendChat = chatInput.trim().length > 0 && chatStatus !== 'sending'

  useEffect(() => {
    const thread = chatThreadRef.current

    if (!thread) {
      return
    }

    thread.scrollTo({
      top: thread.scrollHeight,
      behavior: chatMessages.length > 1 ? 'smooth' : 'auto',
    })
  }, [chatMessages, chatStatus])

  async function submitChatMessage(message: string) {
    const normalizedMessage = message.trim()

    if (!normalizedMessage || chatStatus === 'sending') {
      return
    }

    const userMessage: AIChatMessage = {
      role: 'user',
      content: normalizedMessage,
    }
    const history = chatMessages.slice(-8)

    setChatMessages((current) => [...current, userMessage])
    setChatInput('')
    setChatError('')
    setChatProvider('')
    setChatStatus('sending')

    try {
      const response = await askAIvan({
        message: normalizedMessage,
        snapshot: albumSnapshot,
        history,
        provider: selectedProvider,
      })
      const assistantMessage: AIChatMessage = {
        role: 'assistant',
        content: response.answer,
      }

      setChatMessages((current) => [...current, assistantMessage])
      setChatProvider(`${response.provider}${response.degraded ? ' fallback' : ''}`)
      setChatStatus('idle')
    } catch (error) {
      console.error(error)
      setChatError(
        'Serviço de IA local indisponível. Rode o ai-service em 127.0.0.1:8000 e tente novamente.',
      )
      setChatStatus('error')
    }
  }

  function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submitChatMessage(chatInput)
  }

  function handleHistoricalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    onRecordHistoricalBatch({
      occurredAt: historicalDate,
      totalStickers: Number(historicalTotal),
      uniqueStickers: Number(historicalUnique),
      repeatedStickers: Number(historicalRepeated),
      notes: historicalNotes,
    })

    setHistoricalDate('')
    setHistoricalTotal('')
    setHistoricalUnique('')
    setHistoricalRepeated('')
    setHistoricalNotes('')
  }

  return (
    <section className="page-band aivan-page">
      <div className="page-header aivan-page-header">
        <div className="aivan-heading">
          <p className="eyebrow">Inteligência local</p>
          <h2>AIvan</h2>
        </div>
        <BrainCircuit size={24} aria-hidden="true" />
      </div>

      <section className="tool-panel aivan-hero">
        <div className="aivan-hero-copy">
          <Sparkles size={22} aria-hidden="true" />
          <div>
            <strong>Camada de IA do álbum</strong>
            <span>Previsões locais e recomendações explicáveis com dados da coleção</span>
          </div>
        </div>
        <PanelInfo text="Resumo da camada de IA: histórico local, faltantes e progresso atual usados para previsão e recomendação." />
        <div className="aivan-hero-metrics">
          <span className="aivan-hero-metric">
            <strong>{collectionEventCount}</strong>
            <span>evento(s)</span>
          </span>
          <span className="aivan-hero-metric">
            <strong>{stats.missing}</strong>
            <span>faltante(s)</span>
          </span>
          <span className="aivan-hero-metric">
            <strong>{stats.completion}%</strong>
            <span>concluído</span>
          </span>
        </div>
      </section>

      <section className="tool-panel next-action-panel">
        <div className="next-action-heading">
          <div>
            <strong>Próxima melhor ação</strong>
            <span>Decisão calculada com inventário, trocas e histórico local</span>
          </div>
          <div className="panel-heading-actions">
            <PanelInfo text="Recomendação determinística baseada no estágio do álbum, faltantes, repetidas úteis e volume de eventos." />
            <Target size={20} aria-hidden="true" />
          </div>
        </div>

        <div className="next-action-body">
          <div className="next-action-main">
            <span>Agora</span>
            <strong>{nextBestAction.title.replace(/^Agora:\s*/i, '')}</strong>
            <p>{nextBestAction.recommendation}</p>
          </div>
          <div className="next-action-metrics">
            <span className="next-action-metric">Confiança: {nextBestAction.confidence}</span>
            {nextBestAction.suggestedPackCount ? (
              <span className="next-action-metric">{nextBestAction.suggestedPackCount} pacote(s)</span>
            ) : null}
            <span className="next-action-metric">{nextBestAction.suggestedTradeTargets?.length ?? 0} alvo(s)</span>
          </div>
        </div>

        <div className="next-action-detail-grid">
          <div>
            <span className="next-action-label">Motivo</span>
            <ul>
              {nextBestAction.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className="next-action-label">Risco</span>
            <ul>
              {nextBestAction.risks.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="next-action-code-row">
          {nextBestAction.suggestedDuplicateCodes?.length ? (
            <div>
              <span>Use</span>
              {nextBestAction.suggestedDuplicateCodes.map((code) => (
                <strong key={code}>{code}</strong>
              ))}
            </div>
          ) : null}
          {nextBestAction.suggestedTradeTargets?.length ? (
            <div>
              <span>Busque</span>
              {nextBestAction.suggestedTradeTargets.map((code) => (
                <strong key={code}>{code}</strong>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="tool-panel trade-strategy-panel">
        <div className="trade-strategy-heading">
          <div>
            <strong>Trocas recomendadas</strong>
            <span>{tradeStrategy.summary}</span>
          </div>
          <div className="panel-heading-actions">
            <PanelInfo text="Ranking explicável de repetidas para oferecer e faltantes para buscar primeiro em trocas." />
            <Handshake size={20} aria-hidden="true" />
          </div>
        </div>

        <div className="trade-strategy-grid">
          <div className="trade-strategy-column">
            <span className="trade-strategy-label">Use primeiro</span>
            {duplicateCandidates.length > 0 ? (
              <div className="trade-strategy-list">
                {duplicateCandidates.map((candidate) => (
                  <article key={candidate.stickerId} className="trade-strategy-item">
                    <div>
                      <strong>{candidate.displayCode}</strong>
                      <span>{candidate.sectionName}</span>
                    </div>
                    <span className={`trade-priority ${candidate.priority}`}>{candidate.priority}</span>
                    <p>{candidate.reasons.join(', ')}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="trade-strategy-empty">Nenhuma repetida extra disponível</p>
            )}
          </div>

          <div className="trade-strategy-column">
            <span className="trade-strategy-label">Priorize receber</span>
            {missingTargets.length > 0 ? (
              <div className="trade-strategy-list">
                {missingTargets.map((target) => (
                  <article key={target.stickerId} className="trade-strategy-item">
                    <div>
                      <strong>{target.displayCode}</strong>
                      <span>{target.sectionName}</span>
                    </div>
                    <span className={`trade-priority ${target.priority}`}>{target.priority}</span>
                    <p>{target.reasons.join(', ')}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="trade-strategy-empty">Nenhuma faltante no álbum</p>
            )}
          </div>
        </div>
      </section>

      <section className="tool-panel aivan-chat-panel">
        <div className="aivan-chat-heading">
          <div className="aivan-chat-title-line">
            <strong>Chat local da coleção</strong>
            <span>O agente consulta tools determinísticas antes de responder</span>
          </div>
          <div className="panel-heading-actions">
            <PanelInfo text="Chat opcional: usa tools locais da coleção e, quando habilitada no backend, busca web para notícias recentes." />
            <span className="aivan-service-chip">{aiServiceUrl}</span>
          </div>
        </div>

        <div className="aivan-prompt-row" aria-label="Perguntas rápidas">
          {[
            'Qual é minha próxima melhor ação?',
            'Resumo da minha coleção',
            'Quais figurinhas faltam?',
            'Quais repetidas posso usar em trocas?',
            'Quando devo completar o álbum?',
            'Quais são as últimas notícias da Copa 2026?',
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="ghost-action"
              onClick={() => void submitChatMessage(prompt)}
              disabled={chatStatus === 'sending'}
            >
              {prompt}
            </button>
          ))}
        </div>

        <div ref={chatThreadRef} className="aivan-chat-thread" aria-live="polite">
          {chatMessages.length === 0 ? (
            <div className="aivan-chat-empty">
              <MessageSquare size={22} aria-hidden="true" />
              <span>Pergunte sobre faltantes, repetidas, trocas ou previsão do álbum</span>
            </div>
          ) : (
            chatMessages.map((message, index) => (
              <article
                key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
                className={`aivan-message ${message.role}`}
              >
                {message.role === 'assistant' ? <Bot size={16} aria-hidden="true" /> : null}
                <div className="aivan-message-content">{renderMarkdownMessage(message.content)}</div>
              </article>
            ))
          )}
        </div>

        <form className="aivan-chat-form" onSubmit={handleChatSubmit}>
          <label className="aivan-chat-question">
            <span>Pergunta</span>
            <textarea
              value={chatInput}
              placeholder="Ex: quais repetidas posso trocar hoje?"
              onChange={(event) => setChatInput(event.target.value)}
            />
          </label>
          <div className="aivan-chat-actions">
            <div className="aivan-provider-toggle" role="group" aria-label="Selecionar provedor de IA">
              {[
                { id: 'ollama', label: 'Ollama' },
                { id: 'openai', label: 'GPT' },
              ].map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  className={selectedProvider === provider.id ? 'active' : ''}
                  onClick={() => setSelectedProvider(provider.id as AIProvider)}
                  disabled={chatStatus === 'sending'}
                >
                  {provider.label}
                </button>
              ))}
            </div>
            <button type="submit" className="primary-action compact-action" disabled={!canSendChat}>
              <Send size={16} aria-hidden="true" />
              Perguntar
            </button>
          </div>
        </form>

        <div className="aivan-chat-status">
          {chatStatus === 'sending' ? <span>Consultando AIvan...</span> : null}
          {chatProvider ? <span>Resposta via {chatProvider}</span> : null}
          {chatError ? (
            <span className="aivan-chat-error">
              <WifiOff size={14} aria-hidden="true" />
              {chatError}
            </span>
          ) : null}
        </div>
      </section>

      <section className="tool-panel forecast-panel aivan-forecast-panel">
        <div className="forecast-heading">
          <TrendingUp size={20} aria-hidden="true" />
          <div>
            <strong>Previsão de conclusão</strong>
            {completionForecast.status === 'ready' ? (
              <span>
                Baseada em {completionForecast.eventsUsed} evento(s) de aquisição e{' '}
                {completionForecast.totalStickersRecorded} figurinha(s) registradas
              </span>
            ) : null}
            {completionForecast.status === 'insufficient-data' ? (
              <span>{completionForecast.reason}</span>
            ) : null}
            {completionForecast.status === 'complete' ? <span>Álbum completo</span> : null}
          </div>
        </div>
        <PanelInfo text="Previsão estatística baseada apenas em eventos de aquisição; manutenção, remoções e restaurações não distorcem o ritmo." />
        <div className="forecast-body">
          {completionForecast.status === 'ready' ? (
            <>
              <div className="forecast-primary">
                <span>Estimativa</span>
                <strong>{formatForecastDate(completionForecast.estimatedCompletionDate)}</strong>
              </div>
              <div className="forecast-metrics-block">
                <span className="forecast-metrics-title">Leitura do ritmo atual</span>
                <div className="forecast-metrics">
                  <span>
                    Janela: {completionForecast.optimisticDays}-{completionForecast.conservativeDays} dias
                  </span>
                  <span>Ritmo: {completionForecast.dailyStickerPace}/dia</span>
                  <span>Únicas: {completionForecast.observedUniqueRate}%</span>
                  <span>Confiança: {getConfidenceLabel(completionForecast.confidence)}</span>
                </div>
              </div>
            </>
          ) : null}
          {completionForecast.status === 'insufficient-data' ? (
            <div className="forecast-empty-state">
              <span>{completionForecast.missing} faltante(s)</span>
              <span>{completionForecast.totalStickersRecorded} figurinha(s) no histórico</span>
            </div>
          ) : null}
          {completionForecast.status === 'complete' ? (
            <div className="forecast-empty-state">
              <span>100% concluído</span>
              <span>histórico pronto para análise</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="tool-panel historical-batch-panel">
        <div className="historical-batch-heading">
          <div className="historical-batch-title-line">
            <strong>Marcos para IA</strong>
            <span>Registre lotes antigos sem alterar o inventário atual</span>
          </div>
          <div className="panel-heading-actions">
            <PanelInfo text="Use para registrar compras ou cargas antigas que ajudam a previsão sem alterar quantidades atuais." />
            <CalendarPlus size={20} aria-hidden="true" />
          </div>
        </div>

        <form className="historical-batch-form" onSubmit={handleHistoricalSubmit}>
          <label>
            <span>Data</span>
            <input
              type="date"
              value={historicalDate}
              onChange={(event) => setHistoricalDate(event.target.value)}
            />
          </label>
          <label>
            <span>Total</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={historicalTotal}
              onChange={(event) => setHistoricalTotal(event.target.value)}
            />
          </label>
          <label>
            <span>Únicas</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={historicalUnique}
              onChange={(event) => setHistoricalUnique(event.target.value)}
            />
          </label>
          <label>
            <span>Repetidas</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={historicalRepeated}
              onChange={(event) => setHistoricalRepeated(event.target.value)}
            />
          </label>
          <label className="historical-notes-field">
            <span>Observação</span>
            <input
              type="text"
              value={historicalNotes}
              placeholder="Ex: primeira leva, pacotinhos, trocas"
              onChange={(event) => setHistoricalNotes(event.target.value)}
            />
          </label>
          <button
            type="submit"
            className="primary-action compact-action"
            disabled={!canSubmitHistoricalBatch}
          >
            Registrar marco
          </button>
        </form>
      </section>
    </section>
  )
}
