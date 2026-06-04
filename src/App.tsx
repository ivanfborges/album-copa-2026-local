import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  defaultSectionCode,
  getInitialTheme,
  normalizeSearch,
  orderedStickerSections,
  orderedStickers,
} from './app/catalog'
import { buildAlbumSnapshot } from './ai/albumSnapshot'
import { downloadJsonBackup, parseBackupFile } from './backup/jsonBackup'
import { Sidebar } from './components/Sidebar'
import { stickers } from './data/catalog'
import { groupBySectionCode } from './data/groups'
import {
  buildBackupPayload,
  getCollectionEvents,
  getCollectionEventCount,
  getInventory,
  recordCollectionEvent,
  recordHistoricalBatch,
  removeExtraDuplicates,
  restoreBackup,
  saveSettings,
  saveStickerQuantity,
  touchLastOpened,
} from './db/storage'
import { getStickerCodeImpact, parseStickerCodes } from './domain/quickEntry'
import { buildCompletionForecast } from './domain/forecast'
import { getCollectionStats } from './domain/stats'
import { DashboardPage } from './pages/DashboardPage'
import type { ReportExportFormat, WhatsappTextExportResult } from './reports/exporters'
import { buildReportRows, buildReportSummary, type ReportSectionOption } from './reports/reportData'
import type {
  AlbumSettings,
  AlbumStickerFilter,
  BackupMode,
  CollectionEvent,
  HistoricalBatchInput,
  InventoryItem,
  PageId,
  ThemeMode,
} from './types'

const AlbumPage = lazy(() => import('./pages/AlbumPage').then((module) => ({ default: module.AlbumPage })))
const AIvanPage = lazy(() => import('./pages/AIvanPage').then((module) => ({ default: module.AIvanPage })))
const BackupPage = lazy(() => import('./pages/BackupPage').then((module) => ({ default: module.BackupPage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((module) => ({ default: module.ReportsPage })))

function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard')
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme())
  const [settings, setSettings] = useState<AlbumSettings>({
    albumNickname: 'Meu album da Copa 2026',
  })
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [collectionEvents, setCollectionEvents] = useState<CollectionEvent[]>([])
  const [collectionEventCount, setCollectionEventCount] = useState(0)
  const [quickEntryText, setQuickEntryText] = useState('')
  const [packEntryText, setPackEntryText] = useState('')
  const [selectedSectionCode, setSelectedSectionCode] = useState<string>(defaultSectionCode)
  const [albumSearch, setAlbumSearch] = useState('')
  const [stickerFilter, setStickerFilter] = useState<AlbumStickerFilter>('all')
  const [showSpecialStickersOnly, setShowSpecialStickersOnly] = useState(false)
  const [reportFilter, setReportFilter] = useState<AlbumStickerFilter>('missing')
  const [showReportSpecialOnly, setShowReportSpecialOnly] = useState(false)
  const [reportSectionCode, setReportSectionCode] = useState<ReportSectionOption>('all')
  const [backupMode, setBackupMode] = useState<BackupMode>('replace')
  const [statusMessage, setStatusMessage] = useState('Carregando dados locais...')
  const [backupMessage, setBackupMessage] = useState('Nenhum backup recuperado nesta sessão')
  const [reportExportMessage, setReportExportMessage] = useState('')
  const [reportExportingFormat, setReportExportingFormat] = useState<ReportExportFormat | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('album-copa-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!reportExportMessage || reportExportingFormat) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setReportExportMessage('')
    }, 4200)

    return () => window.clearTimeout(timeoutId)
  }, [reportExportMessage, reportExportingFormat])

  useEffect(() => {
    async function loadData() {
      try {
        const openedSettings = await touchLastOpened()
        const [storedInventory, storedEvents, storedEventCount] = await Promise.all([
          getInventory(),
          getCollectionEvents(),
          getCollectionEventCount(),
        ])

        setSettings(openedSettings)
        setInventory(storedInventory)
        setCollectionEvents(storedEvents)
        setCollectionEventCount(storedEventCount)
        setStatusMessage('Dados locais carregados.')
      } catch (error) {
        console.error(error)
        setStatusMessage('Nao foi possivel carregar o banco local.')
      } finally {
        setIsReady(true)
      }
    }

    void loadData()
  }, [])

  const catalogStickerIds = useMemo(() => new Set<string>(stickers.map((sticker) => sticker.id)), [])
  const catalogInventory = useMemo(
    () => inventory.filter((item) => catalogStickerIds.has(item.stickerId)),
    [catalogStickerIds, inventory],
  )
  const inventoryByStickerId = useMemo(
    () => new Map(catalogInventory.map((item) => [item.stickerId, item])),
    [catalogInventory],
  )
  const inventoryQuantitiesByStickerId = useMemo(
    () => new Map(catalogInventory.map((item) => [item.stickerId, item.quantity])),
    [catalogInventory],
  )
  const stats = useMemo(() => getCollectionStats(catalogInventory, stickers.length), [catalogInventory])
  const completionForecast = useMemo(
    () =>
      buildCompletionForecast({
        events: collectionEvents,
        stats,
        totalStickers: stickers.length,
      }),
    [collectionEvents, stats],
  )
  const albumSnapshot = useMemo(
    () => {
      if (activePage !== 'aivan') {
        return undefined
      }

      return buildAlbumSnapshot({
        settings,
        stats,
        stickers: orderedStickers,
        inventoryByStickerId,
        collectionEvents,
        completionForecast,
      })
    },
    [activePage, collectionEvents, completionForecast, inventoryByStickerId, settings, stats],
  )
  const sectionsWithStats = useMemo(
    () =>
      orderedStickerSections.map((section) => {
        const sectionStickers = orderedStickers.filter((sticker) => sticker.sectionCode === section.code)
        const owned = sectionStickers.filter(
          (sticker) => (inventoryByStickerId.get(sticker.id)?.quantity ?? 0) > 0,
        ).length

        return {
          ...section,
          group: groupBySectionCode.get(section.code),
          owned,
          total: sectionStickers.length,
        }
      }),
    [inventoryByStickerId],
  )
  const selectedSection =
    selectedSectionCode === 'all'
      ? undefined
      : orderedStickerSections.find((section) => section.code === selectedSectionCode)
  const visibleStickers = useMemo(() => {
    const query = normalizeSearch(albumSearch)

    return orderedStickers.filter((sticker) => {
      const quantity = inventoryByStickerId.get(sticker.id)?.quantity ?? 0
      const matchesSection =
        selectedSectionCode === 'all' || sticker.sectionCode === selectedSectionCode
      const matchesBaseFilter =
        stickerFilter === 'all' ||
        (stickerFilter === 'missing' && quantity === 0) ||
        (stickerFilter === 'owned' && quantity > 0) ||
        (stickerFilter === 'repeated' && quantity > 1)
      const matchesSpecialFilter = !showSpecialStickersOnly || sticker.isSpecial
      const matchesSearch =
        !query ||
        normalizeSearch(
          `${sticker.displayCode} ${sticker.title} ${sticker.sectionName} ${sticker.sectionCode}`,
        ).includes(query)

      return matchesSection && matchesBaseFilter && matchesSpecialFilter && matchesSearch
    })
  }, [albumSearch, inventoryByStickerId, selectedSectionCode, showSpecialStickersOnly, stickerFilter])
  const reportSectionLabel = useMemo(() => {
    if (reportSectionCode === 'all') {
      return 'Todas as seções'
    }

    const section = orderedStickerSections.find((item) => item.code === reportSectionCode)
    return section ? `${section.code} - ${section.name}` : 'Seção selecionada'
  }, [reportSectionCode])
  const reportRows = useMemo(
    () =>
      buildReportRows(
        orderedStickers,
        catalogInventory,
        reportFilter,
        reportSectionCode,
        showReportSpecialOnly,
      ),
    [catalogInventory, reportFilter, reportSectionCode, showReportSpecialOnly],
  )
  const reportSummary = useMemo(
    () =>
      buildReportSummary(
        reportRows,
        settings.albumNickname || 'Álbum Copa 2026',
        reportFilter,
        reportSectionLabel,
        showReportSpecialOnly,
      ),
    [reportFilter, reportRows, reportSectionLabel, settings.albumNickname, showReportSpecialOnly],
  )
  const teamProgressStats = useMemo(
    () =>
      sectionsWithStats
        .filter((section) => section.total >= 20)
        .map((section) => ({
          ...section,
          completion: Math.round((section.owned / section.total) * 100),
        })),
    [sectionsWithStats],
  )
  const quickEntryPreview = useMemo(
    () => parseStickerCodes(quickEntryText, orderedStickers),
    [quickEntryText],
  )
  const quickEntryImpact = useMemo(
    () => getStickerCodeImpact(quickEntryPreview, inventoryQuantitiesByStickerId),
    [inventoryQuantitiesByStickerId, quickEntryPreview],
  )
  const packEntryPreview = useMemo(() => parseStickerCodes(packEntryText, orderedStickers), [packEntryText])
  const packEntryImpact = useMemo(
    () => getStickerCodeImpact(packEntryPreview, inventoryQuantitiesByStickerId),
    [inventoryQuantitiesByStickerId, packEntryPreview],
  )

  async function handleNicknameChange(value: string) {
    setSettings((current) => ({ ...current, albumNickname: value }))

    try {
      const saved = await saveSettings({ albumNickname: value })
      setSettings(saved)
      setStatusMessage('Preferencias salvas automaticamente.')
    } catch (error) {
      console.error(error)
      setStatusMessage('Nao foi possivel salvar as preferencias.')
    }
  }

  async function handleExportBackup() {
    try {
      const payload = await buildBackupPayload()
      downloadJsonBackup(payload)
      setStatusMessage('Backup JSON exportado.')
      setBackupMessage(
        `Backup exportado com ${payload.inventory.length} figurinhas salvas e ${
          payload.collectionEvents?.length ?? 0
        } evento(s) no histórico.`,
      )
    } catch (error) {
      console.error(error)
      setStatusMessage('Nao foi possivel exportar o backup.')
      setBackupMessage('Falha ao exportar backup.')
    }
  }

  async function handleImportBackup(file: File) {
    try {
      const { payload, ignoredItems, duplicateItems } = await parseBackupFile(file)
      const restoredSettings = await restoreBackup(payload, backupMode)
      const [restoredInventory, restoredEvents, restoredEventCount] = await Promise.all([
        getInventory(),
        getCollectionEvents(),
        getCollectionEventCount(),
      ])
      const notes = [
        `${payload.inventory.length} figurinhas validas recuperadas`,
        ignoredItems > 0 ? `${ignoredItems} item(ns) ignorado(s)` : '',
        duplicateItems > 0 ? `${duplicateItems} duplicado(s) consolidado(s)` : '',
      ].filter(Boolean)

      setSettings(restoredSettings)
      setInventory(restoredInventory)
      setCollectionEvents(restoredEvents)
      setCollectionEventCount(restoredEventCount)
      setStatusMessage('Backup recuperado com sucesso.')
      setBackupMessage(`${notes.join(' - ')}.`)
    } catch (error) {
      console.error(error)
      setStatusMessage('Arquivo invalido ou incompativel.')
      setBackupMessage('O arquivo selecionado nao passou na validacao do app.')
    }
  }

  async function handleStickerQuantityChange(stickerId: string, nextQuantity: number) {
    const quantity = Math.max(0, Math.floor(nextQuantity))
    const optimisticSavedAt = new Date().toISOString()

    setInventory((current) => {
      const withoutSticker = current.filter((item) => item.stickerId !== stickerId)

      if (quantity <= 0) {
        return withoutSticker
      }

      return [
        ...withoutSticker,
        {
          stickerId,
          quantity,
          updatedAt: optimisticSavedAt,
        },
      ]
    })

    try {
      const savedAt = await saveStickerQuantity(stickerId, quantity)
      const [storedEvents, storedEventCount] = await Promise.all([
        getCollectionEvents(),
        getCollectionEventCount(),
      ])
      setSettings((current) => ({ ...current, lastSavedAt: savedAt }))
      setCollectionEvents(storedEvents)
      setCollectionEventCount(storedEventCount)
      setStatusMessage(quantity > 0 ? 'Figurinha salva automaticamente.' : 'Figurinha marcada como faltante.')
    } catch (error) {
      console.error(error)
      const storedInventory = await getInventory()
      setInventory(storedInventory)
      setStatusMessage('Nao foi possivel salvar a figurinha.')
    }
  }

  async function applyParsedCodes(
    parsed: ReturnType<typeof parseStickerCodes>,
    source: 'quick' | 'pack',
    operation: 'add' | 'remove' = 'add',
  ) {
    if (parsed.totalValid === 0) {
      setStatusMessage('Nenhum codigo valido encontrado.')
      return
    }

    if (source === 'pack' && parsed.totalValid !== 7) {
      setStatusMessage('O modo pacotinho precisa ter exatamente 7 figurinhas validas.')
      return
    }

    const inventoryMap = new Map(catalogInventory.map((item) => [item.stickerId, item.quantity]))
    const entryImpact = getStickerCodeImpact(parsed, inventoryMap)
    const changedItems = [...parsed.counts.entries()].map(([stickerId, count]) => {
      const currentQuantity = inventoryMap.get(stickerId) ?? 0

      return {
        stickerId,
        quantity:
          operation === 'remove'
            ? Math.max(0, currentQuantity - count)
            : currentQuantity + count,
      }
    })
    const optimisticSavedAt = new Date().toISOString()

    setInventory((current) => {
      const changedIds = new Set(changedItems.map((item) => item.stickerId))
      const unchanged = current.filter((item) => !changedIds.has(item.stickerId))

      return [
        ...unchanged,
        ...changedItems
          .filter((item) => item.quantity > 0)
          .map((item) => ({
            ...item,
            updatedAt: optimisticSavedAt,
          })),
      ]
    })

    try {
      const savedDates = await Promise.all(
        changedItems.map((item) =>
          saveStickerQuantity(item.stickerId, item.quantity, { recordEvent: false }),
        ),
      )
      const lastSavedAt = savedDates.at(-1) ?? optimisticSavedAt
      const invalidNote = parsed.invalidCodes.length
        ? ` ${parsed.invalidCodes.length} codigo(s) ignorado(s).`
        : ''
      const actionMessage = operation === 'remove' ? 'removida(s)' : 'adicionada(s)'
      const entryImpactMessage =
        operation === 'add'
          ? ` ${entryImpact.newCount} nova(s), ${entryImpact.repeatedCount} repetida(s).`
          : ''
      const event = await recordCollectionEvent({
        occurredAt: lastSavedAt,
        type: operation === 'add' ? 'bulk-add' : 'bulk-remove',
        source: source === 'pack' ? 'pack' : 'quick-entry',
        totalStickers: parsed.totalValid,
        uniqueStickers: operation === 'add' ? entryImpact.newCount : 0,
        repeatedStickers: operation === 'add' ? entryImpact.repeatedCount : 0,
        affectedStickers: changedItems.length,
        notes:
          source === 'pack'
            ? 'Registro pelo modo pacotinho.'
            : 'Registro pela entrada rapida.',
      })

      setSettings((current) => ({ ...current, lastSavedAt: event.createdAt || lastSavedAt }))
      setCollectionEvents((current) => [...current, event])
      setCollectionEventCount((current) => current + (event ? 1 : 0))
      setStatusMessage(`${parsed.totalValid} figurinha(s) ${actionMessage}.${entryImpactMessage}${invalidNote}`)

      if (source === 'quick') {
        setQuickEntryText('')
      } else {
        setPackEntryText('')
      }
    } catch (error) {
      console.error(error)
      const storedInventory = await getInventory()
      setInventory(storedInventory)
      setStatusMessage('Nao foi possivel salvar a entrada.')
    }
  }

  async function handleRemoveExtraDuplicates() {
    if (stats.repeatedTotal === 0) {
      setStatusMessage('Nenhuma repetida para remover.')
      return
    }

    const confirmed = window.confirm(
      'Remover todas as quantidades extras das repetidas e manter uma unidade de cada figurinha?',
    )

    if (!confirmed) {
      return
    }

    try {
      const result = await removeExtraDuplicates()
      const [storedInventory, storedEvents, storedEventCount] = await Promise.all([
        getInventory(),
        getCollectionEvents(),
        getCollectionEventCount(),
      ])

      setInventory(storedInventory)
      setCollectionEvents(storedEvents)
      setCollectionEventCount(storedEventCount)

      if (result.lastSavedAt) {
        setSettings((current) => ({ ...current, lastSavedAt: result.lastSavedAt }))
      }

      setStatusMessage(
        result.removedTotal > 0
          ? `${result.removedTotal} repetida(s) removida(s). ${result.updatedItems} figurinha(s) mantida(s).`
          : 'Nenhuma repetida para remover.',
      )
    } catch (error) {
      console.error(error)
      const storedInventory = await getInventory()
      setInventory(storedInventory)
      setStatusMessage('Nao foi possivel remover as repetidas.')
    }
  }

  async function handleRecordHistoricalBatch(input: HistoricalBatchInput) {
    try {
      const event = await recordHistoricalBatch(input)
      const [storedEvents, storedEventCount] = await Promise.all([
        getCollectionEvents(),
        getCollectionEventCount(),
      ])

      setCollectionEvents(storedEvents)
      setCollectionEventCount(storedEventCount)
      setSettings((current) => ({ ...current, lastSavedAt: event.createdAt }))
      setStatusMessage('Marco histórico registrado.')
      setBackupMessage('Marco histórico registrado para futuras previsões.')
    } catch (error) {
      console.error(error)
      setStatusMessage('Nao foi possivel registrar o marco histórico.')
      setBackupMessage(error instanceof Error ? error.message : 'Marco histórico inválido.')
    }
  }

  async function handleExportReport(format: ReportExportFormat) {
    const formatLabel: Record<ReportExportFormat, string> = {
      csv: 'CSV',
      pdf: 'PDF',
      png: 'PNG',
      mobilePng: 'imagem para celular',
      whatsappText: 'texto para WhatsApp',
      a4Sheet: 'folha A4',
    }

    setReportExportingFormat(format)
    setReportExportMessage(`Preparando ${formatLabel[format]}...`)

    try {
      const exporters = await import('./reports/exporters')

      if (format === 'csv') {
        exporters.exportReportCsv(reportRows, reportSummary)
      }

      if (format === 'pdf') {
        await exporters.exportReportPdf(reportRows, reportSummary)
      }

      if (format === 'a4Sheet') {
        await exporters.exportReportA4SheetPdf(reportRows, reportSummary)
      }

      if (format === 'png') {
        exporters.exportReportPng(reportRows, reportSummary)
      }

      if (format === 'mobilePng') {
        await exporters.exportReportMobilePng(reportRows, reportSummary)
      }

      let whatsappResult: WhatsappTextExportResult | undefined

      if (format === 'whatsappText') {
        whatsappResult = await exporters.exportReportWhatsappText(reportRows, reportSummary)
      }

      const successMessage =
        format === 'whatsappText'
          ? whatsappResult === 'copied'
            ? 'Texto copiado.'
            : 'Texto baixado como TXT.'
          : `Relatorio ${formatLabel[format]} exportado.`

      setStatusMessage(successMessage)
      setReportExportMessage(successMessage)
    } catch (error) {
      console.error(error)
      setStatusMessage('Nao foi possivel exportar o relatorio.')
      setReportExportMessage('Nao foi possivel exportar o relatorio.')
    } finally {
      setReportExportingFormat(null)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        isReady={isReady}
        statusMessage={statusMessage}
        theme={theme}
        onNavigate={setActivePage}
        onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
      />

      <main className="workspace">
        {activePage === 'dashboard' && (
          <DashboardPage
            settings={settings}
            stats={stats}
            quickEntryText={quickEntryText}
            packEntryText={packEntryText}
            quickEntryPreview={quickEntryPreview}
            quickEntryImpact={quickEntryImpact}
            packEntryPreview={packEntryPreview}
            packEntryImpact={packEntryImpact}
            teamProgressStats={teamProgressStats}
            onBackupNavigate={() => setActivePage('backup')}
            onExportBackup={() => void handleExportBackup()}
            onNicknameChange={(value) => void handleNicknameChange(value)}
            onQuickEntryTextChange={setQuickEntryText}
            onPackEntryTextChange={setPackEntryText}
            onApplyQuickEntry={() => void applyParsedCodes(quickEntryPreview, 'quick')}
            onRemoveQuickEntry={() => void applyParsedCodes(quickEntryPreview, 'quick', 'remove')}
            onRemoveExtraDuplicates={() => void handleRemoveExtraDuplicates()}
            onApplyPackEntry={() => void applyParsedCodes(packEntryPreview, 'pack')}
          />
        )}

        <Suspense fallback={<p className="meta-line">Carregando tela...</p>}>
          {activePage === 'album' && (
            <AlbumPage
              selectedSection={selectedSection}
              selectedSectionCode={selectedSectionCode}
              albumSearch={albumSearch}
              stickerFilter={stickerFilter}
              showSpecialStickersOnly={showSpecialStickersOnly}
              visibleStickers={visibleStickers}
              sectionsWithStats={sectionsWithStats}
              inventoryByStickerId={inventoryByStickerId}
              onSearchChange={setAlbumSearch}
              onFilterChange={setStickerFilter}
              onSpecialFilterToggle={() => setShowSpecialStickersOnly((current) => !current)}
              onSectionChange={setSelectedSectionCode}
              onStickerQuantityChange={(stickerId, quantity) =>
                void handleStickerQuantityChange(stickerId, quantity)
              }
            />
          )}

          {activePage === 'reports' && (
            <ReportsPage
              reportFilter={reportFilter}
              showSpecialOnly={showReportSpecialOnly}
              reportSectionCode={reportSectionCode}
              reportSectionLabel={reportSectionLabel}
              reportRows={reportRows}
              reportSummary={reportSummary}
              reportExportMessage={reportExportMessage}
              reportExportingFormat={reportExportingFormat}
              onFilterChange={(filter) => {
                setReportFilter(filter)
                setReportExportMessage('')
              }}
              onSpecialFilterToggle={() => {
                setShowReportSpecialOnly((current) => !current)
                setReportExportMessage('')
              }}
              onSectionChange={(sectionCode) => {
                setReportSectionCode(sectionCode)
                setReportExportMessage('')
              }}
              onExportReport={(format) => void handleExportReport(format)}
            />
          )}

          {activePage === 'aivan' && albumSnapshot && (
            <AIvanPage
              albumSnapshot={albumSnapshot}
              completionForecast={completionForecast}
              stats={stats}
              collectionEventCount={collectionEventCount}
              onRecordHistoricalBatch={(input) => void handleRecordHistoricalBatch(input)}
            />
          )}

          {activePage === 'backup' && (
            <BackupPage
              backupMode={backupMode}
              backupMessage={backupMessage}
              settings={settings}
              savedStickerCount={catalogInventory.length}
              collectionEventCount={collectionEventCount}
              onBackupModeChange={setBackupMode}
              onExportBackup={() => void handleExportBackup()}
              onImportBackup={(file) => void handleImportBackup(file)}
            />
          )}
        </Suspense>
      </main>
    </div>
  )
}

export default App
