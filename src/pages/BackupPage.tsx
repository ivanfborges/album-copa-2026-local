import { DatabaseBackup, Download, RotateCcw, Upload } from 'lucide-react'
import { formatDateTime } from '../app/catalog'
import type { AlbumSettings, BackupMode } from '../types'

type BackupPageProps = {
  backupMode: BackupMode
  backupMessage: string
  settings: AlbumSettings
  savedStickerCount: number
  onBackupModeChange: (mode: BackupMode) => void
  onExportBackup: () => void
  onImportBackup: (file: File) => void
}

export function BackupPage({
  backupMode,
  backupMessage,
  settings,
  savedStickerCount,
  onBackupModeChange,
  onExportBackup,
  onImportBackup,
}: BackupPageProps) {
  return (
    <section className="page-band">
      <div className="page-header">
        <div>
          <p className="eyebrow">Dados locais</p>
          <h2>Backup e recuperação</h2>
        </div>
        <DatabaseBackup size={22} aria-hidden="true" />
      </div>

      <section className="tool-panel backup-actions">
        <button type="button" className="primary-action" onClick={onExportBackup}>
          <Download size={18} aria-hidden="true" />
          Exportar backup JSON
        </button>

        <div className="segmented-control" aria-label="Modo de recuperação">
          <button
            type="button"
            className={backupMode === 'replace' ? 'active' : ''}
            onClick={() => onBackupModeChange('replace')}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Substituir
          </button>
          <button
            type="button"
            className={backupMode === 'merge' ? 'active' : ''}
            onClick={() => onBackupModeChange('merge')}
          >
            <DatabaseBackup size={16} aria-hidden="true" />
            Mesclar
          </button>
        </div>

        <label className="file-action">
          <Upload size={18} aria-hidden="true" />
          Recuperar dados
          <input
            type="file"
            accept="application/json"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                onImportBackup(file)
              }
              event.currentTarget.value = ''
            }}
          />
        </label>
      </section>

      <section className="backup-summary-grid">
        <article className="backup-summary-card">
          <span>Salvas no navegador</span>
          <strong>{savedStickerCount}</strong>
        </article>
        <article className="backup-summary-card">
          <span>Último salvamento</span>
          <strong>{formatDateTime(settings.lastSavedAt)}</strong>
        </article>
        <article className="backup-summary-card">
          <span>Última abertura</span>
          <strong>{formatDateTime(settings.lastOpenedAt)}</strong>
        </article>
      </section>

      <section className="tool-panel backup-note">
        <strong>Status do backup</strong>
        <p>{backupMessage}</p>
      </section>
    </section>
  )
}
