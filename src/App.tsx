import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  defaultSectionCode,
  getInitialTheme,
  normalizeSearch,
  orderedStickerSections,
  orderedStickers,
} from './app/catalog'
import { downloadJsonBackup, parseBackupFile } from './backup/jsonBackup'
import { Sidebar } from './components/Sidebar'
import { stickers } from './data/catalog'
import { groupBySectionCode } from './data/groups'
import {
  buildBackupPayload,
  getInventory,
  restoreBackup,
  saveSettings,
  saveStickerQuantity,
  touchLastOpened,
} from './db/storage'
import { parseStickerCodes } from './domain/quickEntry'
import { getCollectionStats } from './domain/stats'
import { AlbumPage } from './pages/AlbumPage'
import { BackupPage } from './pages/BackupPage'
import { DashboardPage } from './pages/DashboardPage'
import { ReportsPage } from './pages/ReportsPage'
import { exportReportCsv, exportReportPdf, exportReportPng } from './reports/exporters'
import { buildReportRows, buildReportSummary, type ReportSectionOption } from './reports/reportData'
import type { AlbumSettings, BackupMode, InventoryItem, PageId, StickerFilter, ThemeMode } from './types'

function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard')
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme())
  const [settings, setSettings] = useState<AlbumSettings>({
    albumNickname: 'Meu album da Copa 2026',
  })
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [quickEntryText, setQuickEntryText] = useState('')
  const [packEntryText, setPackEntryText] = useState('')
  const [selectedSectionCode, setSelectedSectionCode] = useState<string>(defaultSectionCode)
  const [albumSearch, setAlbumSearch] = useState('')
  const [stickerFilter, setStickerFilter] = useState<StickerFilter>('all')
  const [reportFilter, setReportFilter] = useState<StickerFilter>('missing')
  const [reportSectionCode, setReportSectionCode] = useState<ReportSectionOption>('all')
  const [backupMode, setBackupMode] = useState<BackupMode>('replace')
  const [statusMessage, setStatusMessage] = useState('Carregando dados locais...')
  const [backupMessage, setBackupMessage] = useState('Nenhum backup recuperado nesta sessao.')
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('album-copa-theme', theme)
  }, [theme])

  useEffect(() => {
    async function loadData() {
      try {
        const openedSettings = await touchLastOpened()
        const storedInventory = await getInventory()

        setSettings(openedSettings)
        setInventory(storedInventory)
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
  const stats = useMemo(() => getCollectionStats(catalogInventory, stickers.length), [catalogInventory])
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
      const matchesFilter =
        stickerFilter === 'all' ||
        (stickerFilter === 'missing' && quantity === 0) ||
        (stickerFilter === 'owned' && quantity > 0) ||
        (stickerFilter === 'repeated' && quantity > 1) ||
        (stickerFilter === 'special' && sticker.isSpecial)
      const matchesSearch =
        !query ||
        normalizeSearch(
          `${sticker.displayCode} ${sticker.title} ${sticker.sectionName} ${sticker.sectionCode}`,
        ).includes(query)

      return matchesSection && matchesFilter && matchesSearch
    })
  }, [albumSearch, inventoryByStickerId, selectedSectionCode, stickerFilter])
  const reportSectionLabel = useMemo(() => {
    if (reportSectionCode === 'all') {
      return 'Todas as secoes'
    }

    const section = orderedStickerSections.find((item) => item.code === reportSectionCode)
    return section ? `${section.code} - ${section.name}` : 'Secao selecionada'
  }, [reportSectionCode])
  const reportRows = useMemo(
    () => buildReportRows(orderedStickers, catalogInventory, reportFilter, reportSectionCode),
    [catalogInventory, reportFilter, reportSectionCode],
  )
  const reportSummary = useMemo(
    () =>
      buildReportSummary(
        reportRows,
        settings.albumNickname || 'Album Copa 2026',
        reportFilter,
        reportSectionLabel,
      ),
    [reportFilter, reportRows, reportSectionLabel, settings.albumNickname],
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
  const packEntryPreview = useMemo(() => parseStickerCodes(packEntryText, orderedStickers), [packEntryText])

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
      setBackupMessage(`Backup exportado com ${payload.inventory.length} figurinhas salvas.`)
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
      const restoredInventory = await getInventory()
      const notes = [
        `${payload.inventory.length} figurinhas validas recuperadas`,
        ignoredItems > 0 ? `${ignoredItems} item(ns) ignorado(s)` : '',
        duplicateItems > 0 ? `${duplicateItems} duplicado(s) consolidado(s)` : '',
      ].filter(Boolean)

      setSettings(restoredSettings)
      setInventory(restoredInventory)
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
      setSettings((current) => ({ ...current, lastSavedAt: savedAt }))
      setStatusMessage(quantity > 0 ? 'Figurinha salva automaticamente.' : 'Figurinha marcada como faltante.')
    } catch (error) {
      console.error(error)
      const storedInventory = await getInventory()
      setInventory(storedInventory)
      setStatusMessage('Nao foi possivel salvar a figurinha.')
    }
  }

  async function applyParsedCodes(parsed: ReturnType<typeof parseStickerCodes>, source: 'quick' | 'pack') {
    if (parsed.totalValid === 0) {
      setStatusMessage('Nenhum codigo valido encontrado.')
      return
    }

    if (source === 'pack' && parsed.totalValid !== 7) {
      setStatusMessage('O modo pacotinho precisa ter exatamente 7 figurinhas validas.')
      return
    }

    const inventoryMap = new Map(catalogInventory.map((item) => [item.stickerId, item.quantity]))
    const changedItems = [...parsed.counts.entries()].map(([stickerId, count]) => ({
      stickerId,
      quantity: (inventoryMap.get(stickerId) ?? 0) + count,
    }))
    const optimisticSavedAt = new Date().toISOString()

    setInventory((current) => {
      const changedIds = new Set(changedItems.map((item) => item.stickerId))
      const unchanged = current.filter((item) => !changedIds.has(item.stickerId))

      return [
        ...unchanged,
        ...changedItems.map((item) => ({
          ...item,
          updatedAt: optimisticSavedAt,
        })),
      ]
    })

    try {
      const savedDates = await Promise.all(
        changedItems.map((item) => saveStickerQuantity(item.stickerId, item.quantity)),
      )
      const lastSavedAt = savedDates.at(-1) ?? optimisticSavedAt
      const invalidNote = parsed.invalidCodes.length
        ? ` ${parsed.invalidCodes.length} codigo(s) ignorado(s).`
        : ''

      setSettings((current) => ({ ...current, lastSavedAt }))
      setStatusMessage(`${parsed.totalValid} figurinha(s) adicionada(s).${invalidNote}`)

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

  async function handleExportReport(format: 'csv' | 'pdf' | 'png') {
    try {
      if (format === 'csv') {
        exportReportCsv(reportRows, reportSummary)
      }

      if (format === 'pdf') {
        await exportReportPdf(reportRows, reportSummary)
      }

      if (format === 'png') {
        exportReportPng(reportRows, reportSummary)
      }

      setStatusMessage(`Relatorio ${format.toUpperCase()} exportado.`)
    } catch (error) {
      console.error(error)
      setStatusMessage(`Nao foi possivel exportar ${format.toUpperCase()}.`)
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
            packEntryPreview={packEntryPreview}
            teamProgressStats={teamProgressStats}
            onBackupNavigate={() => setActivePage('backup')}
            onExportBackup={() => void handleExportBackup()}
            onNicknameChange={(value) => void handleNicknameChange(value)}
            onQuickEntryTextChange={setQuickEntryText}
            onPackEntryTextChange={setPackEntryText}
            onApplyQuickEntry={() => void applyParsedCodes(quickEntryPreview, 'quick')}
            onApplyPackEntry={() => void applyParsedCodes(packEntryPreview, 'pack')}
          />
        )}

        {activePage === 'album' && (
          <AlbumPage
            selectedSection={selectedSection}
            selectedSectionCode={selectedSectionCode}
            albumSearch={albumSearch}
            stickerFilter={stickerFilter}
            visibleStickers={visibleStickers}
            sectionsWithStats={sectionsWithStats}
            inventoryByStickerId={inventoryByStickerId}
            onSearchChange={setAlbumSearch}
            onFilterChange={setStickerFilter}
            onSectionChange={setSelectedSectionCode}
            onStickerQuantityChange={(stickerId, quantity) =>
              void handleStickerQuantityChange(stickerId, quantity)
            }
          />
        )}

        {activePage === 'reports' && (
          <ReportsPage
            reportFilter={reportFilter}
            reportSectionCode={reportSectionCode}
            reportSectionLabel={reportSectionLabel}
            reportRows={reportRows}
            reportSummary={reportSummary}
            onFilterChange={setReportFilter}
            onSectionChange={setReportSectionCode}
            onExportReport={(format) => void handleExportReport(format)}
          />
        )}

        {activePage === 'backup' && (
          <BackupPage
            backupMode={backupMode}
            backupMessage={backupMessage}
            settings={settings}
            savedStickerCount={catalogInventory.length}
            onBackupModeChange={setBackupMode}
            onExportBackup={() => void handleExportBackup()}
            onImportBackup={(file) => void handleImportBackup(file)}
          />
        )}
      </main>
    </div>
  )
}

export default App
