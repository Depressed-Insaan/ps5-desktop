import { HomeIcon, LibraryIcon, SettingsIcon, TrophyIcon } from '@/components/Icons'
import type { AppInfo, ViewId } from '@/types'
import './Sidebar.css'

interface NavItem {
  id: ViewId
  label: string
  Icon: (props: { size?: number }) => JSX.Element
}

const NAV: NavItem[] = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'library', label: 'Library', Icon: LibraryIcon },
  { id: 'trophies', label: 'Trophies', Icon: TrophyIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
]

interface SidebarProps {
  view: ViewId
  onNavigate: (view: ViewId) => void
  appInfo: AppInfo | null
}

export function Sidebar({ view, onNavigate, appInfo }: SidebarProps) {
  return (
    <aside className="rail">
      <div className="rail__brand">
        <span className="rail__mark" aria-hidden="true">
          A
        </span>
        <span className="rail__wordmark">
          Ani Games
          <small>gaming environment</small>
        </span>
      </div>

      <nav className="rail__nav" aria-label="Main">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`rail__item${view === id ? ' is-active' : ''}`}
            aria-current={view === id ? 'page' : undefined}
            onClick={() => onNavigate(id)}
          >
            <span className="rail__icon">
              <Icon size={20} />
            </span>
            <span className="rail__label">{label}</span>
          </button>
        ))}
      </nav>

      <div className="rail__status">
        <span className={`rail__dot${appInfo ? ' is-live' : ''}`} aria-hidden="true" />
        <span className="rail__statusText">
          <span>{appInfo ? 'System ready' : 'Bridge offline'}</span>
          <small>Electron {appInfo?.electron ?? '—'}</small>
        </span>
      </div>
    </aside>
  )
}
