import { useState } from 'react'
import { ChevronDown, ClipboardList, Download, Package, Upload } from 'lucide-react'
import { albumSummary } from '../data/album'
import { FlagIcon } from '../components/FlagIcon'
import { BrandMark } from '../components/BrandMark'
import { OptionalLocalImage } from '../components/OptionalLocalImage'
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
  onRemoveQuickEntry: () => void
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
  onRemoveQuickEntry,
  onApplyPackEntry,
}: DashboardPageProps) {
  const [isTeamStatsExpanded, setIsTeamStatsExpanded] = useState(false)
  const emptyTeams = teamProgressStats.filter((item) => item.completion === 0).length
  const startedTeams = teamProgressStats.filter(
    (item) => item.completion > 0 && item.completion <= 50,
  ).length
  const almostCompleteTeams = teamProgressStats.filter(
    (item) => item.completion > 50 && item.completion < 100,
  ).length
  const completedTeams = teamProgressStats.filter((item) => item.completion === 100).length
  const getCompactTeamName = (code: string, name: string) =>
    code === 'BIH' ? 'Bosnia' : name
  const formatTeamCount = (count: number, singular: string, plural: string) =>
    `${count} ${count === 1 ? singular : plural}`

  return (
    <section className="page-band dashboard-layout">
      <div className="dashboard-main">
        <div className="page-header">
          <div>
            <p className="eyebrow">Visão geral</p>
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
            <span>Total do álbum</span>
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
          <article className="stat-card accent-cyan">
            <span>Total obtidas</span>
            <strong>{stats.totalObtained}</strong>
          </article>
        </div>

        <section className="tool-panel">
          <div className="progress-header">
            <span>Progresso do álbum</span>
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
                <strong>Entrada rápida</strong>
                <span>Cole códigos como BRA1, ARG 10 ou FWC3</span>
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
              <div className="quick-entry-actions">
                <button type="button" className="danger-action compact-action" onClick={onRemoveQuickEntry}>
                  Remover
                </button>
                <button type="button" className="primary-action compact-action" onClick={onApplyQuickEntry}>
                  Adicionar
                </button>
              </div>
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
              <span>{packEntryPreview.totalValid}/7 válidas</span>
              <button type="button" className="primary-action compact-action" onClick={onApplyPackEntry}>
                Salvar pacote
              </button>
            </div>
          </article>
        </section>

        <section
          className={
            isTeamStatsExpanded
              ? 'tool-panel section-progress-panel expanded'
              : 'tool-panel section-progress-panel collapsed'
          }
        >
          <button
            type="button"
            className="section-progress-header section-progress-toggle"
            aria-expanded={isTeamStatsExpanded}
            aria-controls="team-progress-grid"
            onClick={() => setIsTeamStatsExpanded((current) => !current)}
          >
            <div>
              <strong>Estatísticas por seleção</strong>
              <span>Progresso separado por grupo e seleção</span>
            </div>
            <span className="section-progress-meta">
              <span className="section-progress-badges">
                <span>{formatTeamCount(emptyTeams, 'vazia', 'vazias')}</span>
                <span>{formatTeamCount(startedTeams, 'iniciada', 'iniciadas')}</span>
                <span>{formatTeamCount(almostCompleteTeams, 'quase completa', 'quase completas')}</span>
                <span>{formatTeamCount(completedTeams, 'completa', 'completas')}</span>
              </span>
              <ChevronDown size={18} aria-hidden="true" />
            </span>
          </button>
          {isTeamStatsExpanded ? (
            <div id="team-progress-grid" className="team-progress-grid">
              {teamProgressStats.map((section) => (
                <article key={section.code} className="team-progress-card">
                  <div className="team-progress-info">
                    <FlagIcon sectionCode={section.code} label={section.name} className="team-flag" />
                    <span className="team-code">{section.code}</span>
                    <strong>{getCompactTeamName(section.code, section.name)}</strong>
                    <small>{section.owned}/{section.total}</small>
                  </div>
                  <div className="mini-progress" aria-hidden="true">
                    <span style={{ width: `${section.completion}%` }} />
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="tool-panel form-panel">
          <label htmlFor="album-nickname">Apelido do álbum</label>
          <input
            id="album-nickname"
            type="text"
            value={settings.albumNickname}
            onChange={(event) => onNicknameChange(event.target.value)}
          />
          <p className="meta-line">Último salvamento: {formatDateTime(settings.lastSavedAt)}</p>
        </section>
      </div>

      <aside className="dashboard-side" aria-label="Identidade visual do projeto">
        <section className="dashboard-visual">
          <BrandMark alt="" />
          <strong>Álbum Copa 2026 Local</strong>
          <span>Controle pessoal, offline-first e sem backend.</span>
        </section>
        <OptionalLocalImage src="/brand/dashboard-lower-art.png" className="dashboard-lower-art" />
      </aside>
    </section>
  )
}
