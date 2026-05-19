import { FileImage, FileSpreadsheet, FileText, MessageSquare, Printer, Smartphone } from 'lucide-react'
import { filterOptions, orderedStickerSections } from '../app/catalog'
import { FlagIcon } from '../components/FlagIcon'
import { getFlagEmojiForSection } from '../data/flagEmojis'
import { worldCupGroups } from '../data/groups'
import { buildCompactCategoryLine, buildCompactReportGroups, type ReportExportFormat } from '../reports/exporters'
import type { ReportRow, ReportSectionOption, ReportSummary } from '../reports/reportData'
import type { AlbumStickerFilter } from '../types'

const reportFilterOptions: Array<{ id: AlbumStickerFilter; label: string }> = filterOptions.filter(
  (option): option is { id: AlbumStickerFilter; label: string } => option.id !== 'special',
)

type ReportsPageProps = {
  reportFilter: AlbumStickerFilter
  showSpecialOnly: boolean
  reportSectionCode: ReportSectionOption
  reportSectionLabel: string
  reportRows: readonly ReportRow[]
  reportSummary: ReportSummary
  reportExportMessage: string
  reportExportingFormat: ReportExportFormat | null
  onFilterChange: (filter: AlbumStickerFilter) => void
  onSpecialFilterToggle: () => void
  onSectionChange: (sectionCode: ReportSectionOption) => void
  onExportReport: (format: ReportExportFormat) => void
}

export function ReportsPage({
  reportFilter,
  showSpecialOnly,
  reportSectionCode,
  reportSectionLabel,
  reportRows,
  reportSummary,
  reportExportMessage,
  reportExportingFormat,
  onFilterChange,
  onSpecialFilterToggle,
  onSectionChange,
  onExportReport,
}: ReportsPageProps) {
  const isExporting = reportExportingFormat !== null
  const compactPreviewGroups = buildCompactReportGroups(reportRows, reportSummary)
  const compactPreviewGroupsByCode = new Map(compactPreviewGroups.map((group) => [group.sectionCode, group]))
  const specialPreviewGroups = compactPreviewGroups.filter((group) => !group.group)
  const worldCupPreviewColumns = [worldCupGroups.slice(0, 6), worldCupGroups.slice(6)]
  const useGroupedPreview = reportSectionCode === 'all'
  const compactPreviewCountLabel =
    compactPreviewGroups.length === 1
      ? '1 seção com resultado'
      : `${compactPreviewGroups.length} seções com resultado`
  const repeatedCopyCount = reportSummary.totalRows + reportSummary.repeatedTotal
  const reportSummaryCards =
    reportFilter === 'repeated'
      ? [
          { value: reportSummary.totalRows, label: 'Códigos' },
          { value: reportSummary.repeatedTotal, label: 'Extras' },
          { value: repeatedCopyCount, label: 'Cópias' },
          { value: compactPreviewGroups.length, label: 'Seções' },
        ]
      : reportFilter === 'missing'
        ? [
            { value: reportSummary.totalRows, label: 'Faltantes' },
            { value: compactPreviewGroups.length, label: 'Seções' },
          ]
        : reportFilter === 'owned'
          ? [
              { value: reportSummary.totalRows, label: 'Tenho' },
              { value: reportSummary.repeatedTotal, label: 'Repetidas' },
              { value: compactPreviewGroups.length, label: 'Seções' },
            ]
          : [
              { value: reportSummary.totalRows, label: 'Linhas' },
              { value: reportSummary.ownedRows, label: 'Tenho' },
              { value: reportSummary.missingRows, label: 'Faltantes' },
              { value: reportSummary.repeatedTotal, label: 'Repetidas' },
            ]

  return (
    <section className="page-band">
      <div className="page-header report-page-header">
        <div className="report-heading">
          <p className="eyebrow">Relatórios</p>
          <h2>Exportações</h2>
        </div>
        <div className="report-options" aria-label="Formatos de exportação">
          <button
            type="button"
            className={reportExportingFormat === 'csv' ? 'export-button active' : 'export-button'}
            onClick={() => onExportReport('csv')}
            disabled={reportRows.length === 0 || isExporting}
          >
            <FileSpreadsheet size={18} aria-hidden="true" />
            {reportExportingFormat === 'csv' ? 'Gerando...' : 'CSV'}
          </button>
          <button
            type="button"
            className={reportExportingFormat === 'pdf' ? 'export-button active' : 'export-button'}
            onClick={() => onExportReport('pdf')}
            disabled={reportRows.length === 0 || isExporting}
          >
            <FileText size={18} aria-hidden="true" />
            {reportExportingFormat === 'pdf' ? 'Gerando...' : 'PDF'}
          </button>
          <button
            type="button"
            className={reportExportingFormat === 'png' ? 'export-button active' : 'export-button'}
            onClick={() => onExportReport('png')}
            disabled={reportRows.length === 0 || isExporting}
          >
            <FileImage size={18} aria-hidden="true" />
            {reportExportingFormat === 'png' ? 'Gerando...' : 'PNG'}
          </button>
          <button
            type="button"
            className={reportExportingFormat === 'mobilePng' ? 'export-button active' : 'export-button'}
            onClick={() => onExportReport('mobilePng')}
            disabled={reportRows.length === 0 || isExporting}
          >
            <Smartphone size={18} aria-hidden="true" />
            {reportExportingFormat === 'mobilePng' ? 'Gerando...' : 'IMG/CEL'}
          </button>
          <button
            type="button"
            className={reportExportingFormat === 'whatsappText' ? 'export-button active' : 'export-button'}
            onClick={() => onExportReport('whatsappText')}
            disabled={reportRows.length === 0 || isExporting}
          >
            <MessageSquare size={18} aria-hidden="true" />
            {reportExportingFormat === 'whatsappText' ? 'Copiando...' : 'TXT/WPP'}
          </button>
          <button
            type="button"
            className={reportExportingFormat === 'a4Sheet' ? 'export-button active' : 'export-button'}
            onClick={() => onExportReport('a4Sheet')}
            disabled={reportRows.length === 0 || isExporting}
          >
            <Printer size={18} aria-hidden="true" />
            {reportExportingFormat === 'a4Sheet' ? 'Gerando...' : 'A4'}
          </button>
        </div>
      </div>

      <section className="tool-panel report-top-panel">
        <div className="report-builder">
          <div className="report-control-group inline-report-control">
            <span>Conteúdo</span>
            <div className="filter-tabs" aria-label="Conteúdo do relatório">
              {reportFilterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={reportFilter === option.id ? 'active' : ''}
                  onClick={() => onFilterChange(option.id)}
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                className={showSpecialOnly ? 'active' : ''}
                onClick={onSpecialFilterToggle}
                aria-pressed={showSpecialOnly}
              >
                Especiais
              </button>
            </div>
          </div>

          <label className="report-control-group inline-report-control select-field">
            <span>Seção</span>
            <select value={reportSectionCode} onChange={(event) => onSectionChange(event.target.value)}>
              <option value="all">Todas as seções</option>
              {orderedStickerSections.map((section) => (
                <option key={section.code} value={section.code}>
                  {section.code} - {section.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <section className="report-summary-grid">
          {reportSummaryCards.map((card) => (
            <article className="report-summary-card" key={card.label}>
              <strong>{card.value}</strong>
              <span>{card.label}</span>
            </article>
          ))}
        </section>
      </section>

      {reportExportMessage && <p className="report-export-feedback">{reportExportMessage}</p>}

      <section className="tool-panel report-preview">
        <div className="report-preview-header">
          <div className="report-preview-heading">
            <strong>Prévia</strong>
            <span>
              {reportSummary.filterLabel} - {reportSectionLabel}
            </span>
          </div>
          <span>{compactPreviewCountLabel}</span>
        </div>

        {reportRows.length > 0 ? (
          <div className="compact-report-preview">
            <div className="compact-report-title">
              <strong>🏆 Copa 2026</strong>
              <span>📦 {buildCompactCategoryLine(reportSummary)}</span>
            </div>
            {useGroupedPreview ? (
              <div className="visual-report-preview">
                {specialPreviewGroups.length > 0 && (
                  <section className="visual-report-specials" aria-label="Seções especiais">
                    {specialPreviewGroups.map((group) => (
                      <article className="visual-report-section-card special" key={group.sectionCode}>
                        <div className="visual-report-section-head">
                          {group.sectionCode === 'FWC' && (
                            <span className="report-preview-special-flag" aria-hidden="true" />
                          )}
                          <strong>{group.sectionCode}</strong>
                          <span>{group.items.join(', ')}</span>
                        </div>
                      </article>
                    ))}
                  </section>
                )}

                <div className="visual-report-columns">
                  {worldCupPreviewColumns.map((column, columnIndex) => (
                    <div className="visual-report-column" key={`column-${columnIndex}`}>
                      {column.map((albumGroup) => {
                        const groupHasItems = albumGroup.codes.some((sectionCode) =>
                          compactPreviewGroupsByCode.has(sectionCode),
                        )

                        if (!groupHasItems) {
                          return null
                        }

                        return (
                          <section className="visual-report-group" key={albumGroup.group}>
                            <strong className="visual-report-group-label">{albumGroup.group}</strong>
                            <div className="visual-report-team-grid">
                              {albumGroup.codes.map((sectionCode) => {
                                const group = compactPreviewGroupsByCode.get(sectionCode)

                                return (
                                  <article
                                    className={
                                      group
                                        ? 'visual-report-section-card'
                                        : 'visual-report-section-card empty'
                                    }
                                    key={sectionCode}
                                  >
                                    <div className="visual-report-section-head">
                                      <FlagIcon sectionCode={sectionCode} className="report-preview-flag" />
                                      <strong>{sectionCode}</strong>
                                    </div>
                                    <span>{group ? group.items.join(', ') : '-'}</span>
                                  </article>
                                )
                              })}
                            </div>
                          </section>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="compact-report-groups">
                {compactPreviewGroups.map((group) => {
                  const flag = getFlagEmojiForSection(group.sectionCode)
                  const sectionLabel = flag ? `${flag} ${group.sectionCode}` : group.sectionCode

                  return (
                    <article className="compact-report-row" key={group.sectionCode}>
                      <strong>{sectionLabel}:</strong>
                      <span>{group.items.join(', ')}</span>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <p className="meta-line">Nenhuma figurinha encontrada para esse filtro.</p>
        )}
      </section>
    </section>
  )
}
