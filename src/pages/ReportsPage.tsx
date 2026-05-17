import { FileImage, FileSpreadsheet, FileText, MessageSquare, Smartphone } from 'lucide-react'
import { filterOptions, orderedStickerSections } from '../app/catalog'
import { getFlagEmojiForSection } from '../data/flagEmojis'
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
  const compactPreviewCountLabel =
    compactPreviewGroups.length === 1
      ? '1 seção'
      : `${compactPreviewGroups.length} seções`

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
          <article className="report-summary-card">
            <strong>{reportSummary.totalRows}</strong>
            <span>Linhas</span>
          </article>
          <article className="report-summary-card">
            <strong>{reportSummary.ownedRows}</strong>
            <span>Tenho</span>
          </article>
          <article className="report-summary-card">
            <strong>{reportSummary.missingRows}</strong>
            <span>Faltantes</span>
          </article>
          <article className="report-summary-card">
            <strong>{reportSummary.repeatedTotal}</strong>
            <span>Repetidas</span>
          </article>
        </section>
      </section>

      {reportExportMessage && <p className="report-export-feedback">{reportExportMessage}</p>}

      <section className="tool-panel report-preview">
        <div className="report-preview-header">
          <div>
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
          </div>
        ) : (
          <p className="meta-line">Nenhuma figurinha encontrada para esse filtro.</p>
        )}
      </section>
    </section>
  )
}
