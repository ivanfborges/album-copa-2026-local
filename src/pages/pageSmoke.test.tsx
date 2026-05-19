import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { orderedStickerSections, orderedStickers } from '../app/catalog'
import { Sidebar } from '../components/Sidebar'
import { parseStickerCodes, getStickerCodeImpact } from '../domain/quickEntry'
import { getCollectionStats } from '../domain/stats'
import { buildReportRows, buildReportSummary } from '../reports/reportData'
import type { InventoryItem, SectionStats, TeamProgressStats } from '../types'
import { AlbumPage } from './AlbumPage'
import { BackupPage } from './BackupPage'
import { DashboardPage } from './DashboardPage'
import { ReportsPage } from './ReportsPage'

const noop = () => {}
const fixedDate = '2026-05-19T12:00:00.000Z'
const sampleInventory: InventoryItem[] = [
  { stickerId: 'FWC1', quantity: 1, updatedAt: fixedDate },
  { stickerId: 'MEX1', quantity: 2, updatedAt: fixedDate },
  { stickerId: 'BRA13', quantity: 1, updatedAt: fixedDate },
]
const inventoryByStickerId = new Map(sampleInventory.map((item) => [item.stickerId, item]))
const inventoryQuantities = new Map(sampleInventory.map((item) => [item.stickerId, item.quantity]))
const settings = {
  albumNickname: 'Copa 2026 - Album de teste',
  lastOpenedAt: fixedDate,
  lastSavedAt: fixedDate,
}

function render(markup: React.ReactNode) {
  return renderToStaticMarkup(markup)
}

function buildSectionStats(): SectionStats[] {
  return orderedStickerSections.map((section) => {
    const sectionStickers = orderedStickers.filter((sticker) => sticker.sectionCode === section.code)
    const owned = sectionStickers.filter((sticker) => (inventoryByStickerId.get(sticker.id)?.quantity ?? 0) > 0)
      .length

    return {
      ...section,
      owned,
      total: sectionStickers.length,
    }
  })
}

function buildTeamProgressStats(): TeamProgressStats[] {
  return buildSectionStats()
    .filter((section) => section.total >= 20)
    .slice(0, 8)
    .map((section) => ({
      ...section,
      completion: Math.round((section.owned / section.total) * 100),
    }))
}

describe('page smoke rendering', () => {
  it('renders the sidebar navigation and status', () => {
    const html = render(
      <Sidebar
        activePage="dashboard"
        isReady
        statusMessage="Dados locais carregados"
        theme="dark"
        onNavigate={noop}
        onToggleTheme={noop}
      />,
    )

    expect(html).toContain('Tracker local')
    expect(html).toContain('Início')
    expect(html).toContain('Álbum')
    expect(html).toContain('Relatórios')
    expect(html).toContain('Dados locais carregados')
  })

  it('renders the dashboard summary and quick entry tools', () => {
    const quickEntryPreview = parseStickerCodes('MEX1 BRA13', orderedStickers)
    const packEntryPreview = parseStickerCodes('MEX1 BRA13 FWC1', orderedStickers)
    const html = render(
      <DashboardPage
        settings={settings}
        stats={getCollectionStats(sampleInventory, orderedStickers.length)}
        quickEntryText="MEX1 BRA13"
        packEntryText="MEX1 BRA13 FWC1"
        quickEntryPreview={quickEntryPreview}
        quickEntryImpact={getStickerCodeImpact(quickEntryPreview, inventoryQuantities)}
        packEntryPreview={packEntryPreview}
        packEntryImpact={getStickerCodeImpact(packEntryPreview, inventoryQuantities)}
        teamProgressStats={buildTeamProgressStats()}
        onBackupNavigate={noop}
        onExportBackup={noop}
        onNicknameChange={noop}
        onQuickEntryTextChange={noop}
        onPackEntryTextChange={noop}
        onApplyQuickEntry={noop}
        onRemoveQuickEntry={noop}
        onRemoveExtraDuplicates={noop}
        onApplyPackEntry={noop}
      />,
    )

    expect(html).toContain('Copa 2026 - Album de teste')
    expect(html).toContain('Total do álbum')
    expect(html).toContain('Entrada rápida')
    expect(html).toContain('Pacotinho')
    expect(html).toContain('Estatísticas por seleção')
  })

  it('renders the album catalog controls and sticker cards', () => {
    const sectionStats = buildSectionStats()
    const visibleStickers = orderedStickers.filter((sticker) => sticker.sectionCode === 'FWC').slice(0, 4)
    const html = render(
      <AlbumPage
        selectedSection={orderedStickerSections.find((section) => section.code === 'FWC')}
        selectedSectionCode="FWC"
        albumSearch=""
        stickerFilter="all"
        showSpecialStickersOnly={false}
        visibleStickers={visibleStickers}
        sectionsWithStats={sectionStats}
        inventoryByStickerId={inventoryByStickerId}
        onSearchChange={noop}
        onFilterChange={noop}
        onSpecialFilterToggle={noop}
        onSectionChange={noop}
        onStickerQuantityChange={noop}
      />,
    )

    expect(html).toContain('Catálogo')
    expect(html).toContain('Buscar por código')
    expect(html).toContain('FWC')
    expect(html).toContain('Official Emblem')
  })

  it('renders the report builder and grouped preview', () => {
    const reportRows = buildReportRows(orderedStickers, sampleInventory, 'repeated', 'all')
    const reportSummary = buildReportSummary(reportRows, settings.albumNickname, 'repeated', 'Todas as seções')
    const html = render(
      <ReportsPage
        reportFilter="repeated"
        showSpecialOnly={false}
        reportSectionCode="all"
        reportSectionLabel="Todas as seções"
        reportRows={reportRows}
        reportSummary={reportSummary}
        reportExportMessage=""
        reportExportingFormat={null}
        onFilterChange={noop}
        onSpecialFilterToggle={noop}
        onSectionChange={noop}
        onExportReport={noop}
      />,
    )

    expect(html).toContain('Exportações')
    expect(html).toContain('Códigos')
    expect(html).toContain('Extras')
    expect(html).toContain('FIGURINHAS REPETIDAS')
    expect(html).toContain('MEX')
  })

  it('renders the backup controls and status', () => {
    const html = render(
      <BackupPage
        backupMode="replace"
        backupMessage="Nenhum backup recuperado nesta sessão"
        settings={settings}
        savedStickerCount={sampleInventory.length}
        onBackupModeChange={noop}
        onExportBackup={noop}
        onImportBackup={noop}
      />,
    )

    expect(html).toContain('Backup e recuperação')
    expect(html).toContain('Exportar backup JSON')
    expect(html).toContain('Substituir')
    expect(html).toContain('Nenhum backup recuperado nesta sessão')
  })
})
