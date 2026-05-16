import { BarChart3, BookOpen, DatabaseBackup, Home, Moon, Sun } from 'lucide-react'
import type { PageId, ThemeMode } from '../types'

const pages: Array<{ id: PageId; label: string; icon: typeof Home }> = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'album', label: 'Album', icon: BookOpen },
  { id: 'reports', label: 'Relatorios', icon: BarChart3 },
  { id: 'backup', label: 'Backup', icon: DatabaseBackup },
]

type SidebarProps = {
  activePage: PageId
  isReady: boolean
  statusMessage: string
  theme: ThemeMode
  onNavigate: (page: PageId) => void
  onToggleTheme: () => void
}

export function Sidebar({
  activePage,
  isReady,
  statusMessage,
  theme,
  onNavigate,
  onToggleTheme,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <img className="brand-emblem" src="/brand/app-mark.svg" alt="Album Copa 2026 Local" />
        <div>
          <p className="eyebrow">Tracker local</p>
          <h1>Album Copa 2026</h1>
        </div>
      </div>

      <nav className="main-nav" aria-label="Principal">
        {pages.map((page) => {
          const Icon = page.icon
          return (
            <button
              key={page.id}
              type="button"
              className={activePage === page.id ? 'nav-button active' : 'nav-button'}
              onClick={() => onNavigate(page.id)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{page.label}</span>
            </button>
          )
        })}
      </nav>

      <button type="button" className="theme-toggle" onClick={onToggleTheme}>
        {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        <span>{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>
      </button>

      <div className="sidebar-footer">
        <span className={isReady ? 'status-dot ready' : 'status-dot'} />
        <span>{statusMessage}</span>
      </div>
    </aside>
  )
}
