import { ClipboardList, Download, Package, Upload } from 'lucide-react'
import { albumSummary } from '../data/album'
import { FlagIcon } from '../components/FlagIcon'
import { formatDateTime } from '../app/catalog'
import type { AlbumSettings, TeamProgressStats } from '../types'
import type { ParsedStickerCodes } from '../domain/quickEntry'
import type { CollectionStats } from '../domain/stats'

type DashboardPageProps = {
  settings: AlbumSettings
  stats: CollectionStats
  quickEntryText: string
  packEntryText: string
  quickEntryPreview: ParsedStickerCodes
  packEntryPreview: ParsedStickerCodes
  teamProgressStats: TeamProgressStats[]
  onBackupNavigate: () => void
  onExportBackup: () => void
  onNicknameChange: (value: string) => void
  onQuickEntryTextChange: (value: string) => void
  onPackEntryTextChange: (value: string) => void
  onApplyQuickEntry: () => void
  onApplyPackEntry: () => void
}

export function DashboardPage({
  settings,
  stats,
  quickEntryText,
  packEntryText,
  quickEntryPreview,
  packEntryPreview,
  teamProgressStats,
  onBackupNavigate,
  onExportBackup,
  onNicknameChange,
  onQuickEntryTextChange,
  onPackEntryTextChange,
  onApplyQuickEntry,
  onApplyPackEntry,
}: DashboardPageProps) {
  return (
    <section className="page-band dashboard-layout">
      <div className="dashboard-main">
        <div className="page-header">
          <div>
            <p className="eyebrow">Visao geral</p>
            <h2>{settings.albumNickname}</h2>
          </div>
          <div className="header-actions">
            <button type="button" className="icon-button" onClick={onExportBackup} title="Exportar backup">
              <Download size={18} aria-hidden="true" />
            </button>
            <button type="button" className="icon-button" onClick={onBackupNavigate} title="Recuperar dados">
              <Upload size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <article className="stat-card accent-green">
            <span>Total</span>
            <strong>{albumSummary.totalStickers}</strong>
          </article>
          <article className="stat-card accent-blue">
            <span>Tenho</span>
            <strong>{stats.ownedUnique}</strong>
          </article>
          <article className="stat-card accent-red">
            <span>Faltantes</span>
            <strong>{stats.missing}</strong>
          </article>
          <article className="stat-card accent-amber">
            <span>Repetidas</span>
            <strong>{stats.repeatedTotal}</strong>
          </article>
        </div>

        <section className="tool-panel">
          <div className="progress-header">
            <span>Progresso do album</span>
            <strong>{stats.completion}%</strong>
          </div>
          <div className="progress-track" aria-hidden="true">
            <span style={{ width: `${stats.completion}%` }} />
          </div>
        </section>

        <section className="quick-tools-grid">
          <article className="tool-panel quick-entry-card">
            <div className="quick-entry-header">
              <ClipboardList size={20} aria-hidden="true" />
              <div>
                <strong>Entrada rapida</strong>
                <span>Cole codigos como BRA1, ARG 10 ou FWC3</span>
              </div>
            </div>
            <textarea
              value={quickEntryText}
              rows={4}
              placeholder="BRA1 BRA2 ARG10 FWC3"
              onChange={(event) => onQuickEntryTextChange(event.target.value)}
            />
            <div className="quick-entry-footer">
              <span>
                {quickEntryPreview.totalValid} valida(s)
                {quickEntryPreview.invalidCodes.length > 0
                  ? ` - ${quickEntryPreview.invalidCodes.length} ignorada(s)`
                  : ''}
              </span>
              <button type="button" className="primary-action compact-action" onClick={onApplyQuickEntry}>
                Adicionar
              </button>
            </div>
          </article>

          <article className="tool-panel quick-entry-card pack-card">
            <div className="quick-entry-header">
              <Package size={20} aria-hidden="true" />
              <div>
                <strong>Pacotinho</strong>
                <span>Registre exatamente 7 figurinhas</span>
              </div>
            </div>
            <textarea
              value={packEntryText}
              rows={4}
              placeholder="MEX1 BRA8 USA3 FWC12 ARG2 KOR20 ENG4"
              onChange={(event) => onPackEntryTextChange(event.target.value)}
            />
            <div className="pack-meter" aria-hidden="true">
              <span style={{ width: `${Math.min(100, (packEntryPreview.totalValid / 7) * 100)}%` }} />
            </div>
            <div className="quick-entry-footer">
              <span>{packEntryPreview.totalValid}/7 validas</span>
              <button type="button" className="primary-action compact-action" onClick={onApplyPackEntry}>
                Salvar pacote
              </button>
            </div>
          </article>
        </section>

        <section className="tool-panel section-progress-panel">
          <div className="section-progress-header">
            <div>
              <strong>Estatisticas por selecao</strong>
              <span>Progresso separado por grupo e selecao</span>
            </div>
            <span>{teamProgressStats.filter((item) => item.completion === 100).length} completas</span>
          </div>
          <div className="team-progress-grid">
            {teamProgressStats.map((section) => (
              <article key={section.code} className="team-progress-card">
                <div>
                  <FlagIcon sectionCode={section.code} label={section.name} className="team-flag" />
                  <span className="team-code">{section.code}</span>
                  <strong>{section.name}</strong>
                </div>
                <small>
                  {section.group ? `Grupo ${section.group} - ` : ''}
                  {section.owned}/{section.total}
                </small>
                <div className="mini-progress" aria-hidden="true">
                  <span style={{ width: `${section.completion}%` }} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="tool-panel form-panel">
          <label htmlFor="album-nickname">Apelido do album</label>
          <input
            id="album-nickname"
            type="text"
            value={settings.albumNickname}
            onChange={(event) => onNicknameChange(event.target.value)}
          />
          <p className="meta-line">Ultimo salvamento: {formatDateTime(settings.lastSavedAt)}</p>
        </section>
      </div>

      <aside className="dashboard-visual" aria-label="Identidade visual do projeto">
        <img src="/brand/app-mark.svg" alt="" />
        <strong>Album Copa 2026 Local</strong>
        <span>Controle pessoal, offline-first e sem backend.</span>
      </aside>
    </section>
  )
}
