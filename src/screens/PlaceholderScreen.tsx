import type { ViewId } from '@/types'
import './PlaceholderScreen.css'

type PlaceholderView = Exclude<ViewId, 'home'>

interface Copy {
  phase: string
  title: string
  body: string
  items: string[]
}

const COPY: Record<PlaceholderView, Copy> = {
  library: {
    phase: 'Phase 3',
    title: 'Game library',
    body: 'Your real collection will live here: imported games, custom artwork and launch settings.',
    items: ['Import executables and scripts', 'Custom names, covers and descriptions', 'Collections and categories'],
  },
  trophies: {
    phase: 'Phase 4',
    title: 'Trophies',
    body: 'Bronze to Platinum, with progress tracking and unlock notifications.',
    items: ['Game-specific achievements', 'Trophy collection overview', 'Unlock notifications'],
  },
  settings: {
    phase: 'Phase 4',
    title: 'Settings',
    body: 'Themes, accent colours, backgrounds and notification preferences.',
    items: ['Theme and accent customisation', 'Startup and library behaviour', 'Controller and audio options'],
  },
}

interface PlaceholderScreenProps {
  view: PlaceholderView
}

export function PlaceholderScreen({ view }: PlaceholderScreenProps) {
  const copy = COPY[view]

  return (
    <section className="placeholder">
      <div className="placeholder__panel">
        <span className="placeholder__phase">{copy.phase}</span>
        <h2 className="placeholder__title">{copy.title}</h2>
        <p className="placeholder__body">{copy.body}</p>
        <ul className="placeholder__list">
          {copy.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="placeholder__note">
          Not built yet — this screen exists so navigation works from the start.
        </p>
      </div>
    </section>
  )
}
