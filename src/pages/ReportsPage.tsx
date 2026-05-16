import { FileImage, FileSpreadsheet, FileText } from 'lucide-react'
import { filterOptions, orderedStickerSections } from '../app/catalog'
import { reportFilterLabels, type ReportRow, type ReportSectionOption, type ReportSummary } from '../reports/reportData'
import type { StickerFilter } from '../types'

type ReportsPageProps = {
  reportFilter: StickerFilter
  reportSectionCode: ReportSectionOption
  reportSectionLabel: string
  reportRows: readonly ReportRow[]
  reportSummary: ReportSummary
  onFilterChange: (filter: StickerFilter) => void
  onSectionChange: (sectionCode: ReportSectionOption) => void
  onExportReport: (format: 'csv' | 'pdf' | 'png') => void
}

export function ReportsPage({
  reportFilter,
  reportSectionCode,
  reportSectionLabel,
  reportRows,
  reportSummary,
  onFilterChange,
  onSectionChange,
  onExportReport,
}: ReportsPageProps) {
  return (
    <section className="page-band">
      <div className="page-header">
        <div>
          <p className="eyebrow">Relatorios</p>
          <h2>Exportacoes</h2>
        </div>
        <FileSpreadsheet size={22} aria-hidden="true" />
      </div>

      <section className="tool-panel report-builder">
        <div className="report-control-group">
          <span>Conteudo</span>
          <div className="filter-tabs" aria-label="Conteudo do relatorio">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={reportFilter === option.id ? 'active' : ''}
                onClick={() => onFilterChange(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <label className="report-control-group select-field">
          <span>Secao</span>
          <select value={reportSectionCode} onChange={(event) => onSectionChange(event.target.value)}>
            <option value="all">Todas as secoes</option>
            {orderedStickerSections.map((section) => (
              <option key={section.code} value={section.code}>
                {section.code} - {section.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="report-summary-grid">
        <article className="report-summary-card">
          <span>Linhas</span>
          <strong>{reportSummary.totalRows}</strong>
        </article>
        <article className="report-summary-card">
          <span>Tenho</span>
          <strong>{reportSummary.ownedRows}</strong>
        </article>
        <article className="report-summary-card">
          <span>Faltantes</span>
          <strong>{reportSummary.missingRows}</strong>
        </article>
        <article className="report-summary-card">
          <span>Repetidas</span>
          <strong>{reportSummary.repeatedTotal}</strong>
        </article>
      </section>

      <div className="report-options">
        <button
          type="button"
          className="export-button"
          onClick={() => onExportReport('csv')}
          disabled={reportRows.length === 0}
        >
          <FileSpreadsheet size={18} aria-hidden="true" />
          CSV
        </button>
        <button
          type="button"
          className="export-button"
          onClick={() => onExportReport('pdf')}
          disabled={reportRows.length === 0}
        >
          <FileText size={18} aria-hidden="true" />
          PDF
        </button>
        <button
          type="button"
          className="export-button"
          onClick={() => onExportReport('png')}
          disabled={reportRows.length === 0}
        >
          <FileImage size={18} aria-hidden="true" />
          PNG
        </button>
      </div>

      <section className="tool-panel report-preview">
        <div className="report-preview-header">
          <div>
            <strong>Previa</strong>
            <span>
              {reportFilterLabels[reportFilter]} - {reportSectionLabel}
            </span>
          </div>
          <span>{Math.min(reportRows.length, 12)} exibidas</span>
        </div>

        {reportRows.length > 0 ? (
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Secao</th>
                  <th>Nome</th>
                  <th>Qtd</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.slice(0, 12).map((row) => (
                  <tr key={`${row.code}-${row.title}`}>
                    <td>{row.code}</td>
                    <td>{row.sectionCode}</td>
                    <td>{row.title}</td>
                    <td>{row.quantity}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="meta-line">Nenhuma figurinha encontrada para esse filtro.</p>
        )}
      </section>
    </section>
  )
}
