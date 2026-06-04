import { BarChart3, BookOpen, BrainCircuit, DatabaseBackup, Home, Moon, Sun } from 'lucide-react'
import { BrandMark } from './BrandMark'
import { OptionalLocalImage } from './OptionalLocalImage'
import type { PageId, ThemeMode } from '../types'

const pages: Array<{ id: PageId; label: string; icon: typeof Home }> = [
  { id: 'dashboard', label: 'Início', icon: Home },
  { id: 'album', label: 'Álbum', icon: BookOpen },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  { id: 'aivan', label: 'AIvan', icon: BrainCircuit },
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
  const visibleStatusMessage = statusMessage.replace(/\./g, '').trim()

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <BrandMark
          className="brand-emblem"
          alt="Álbum Copa 2026 Local"
          sources={['/brand/sidebar-mark.png', '/brand/custom-mark.png', '/brand/app-mark.svg']}
        />
        <div>
          <p className="eyebrow">Tracker local</p>
          <h1>Álbum Copa 2026</h1>
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

      <div className="sidebar-art-slot" aria-hidden="true">
        <OptionalLocalImage
          sources={['/brand/sidebar-feature-art.png', '/brand/dashboard-side-art.png']}
          className="sidebar-art"
        />
      </div>

      <div className="sidebar-footer">
        <span className={isReady ? 'status-dot ready' : 'status-dot'} />
        <span>{visibleStatusMessage}</span>
      </div>
    </aside>
  )
}
