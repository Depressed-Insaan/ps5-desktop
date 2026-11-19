import type { ViewId } from '@/types'
import './PlaceholderScreen.css'

type PlaceholderView = Exclude<ViewId, 'home'>

interface Copy {
  title: string
  body: string
  items: string[]
}

const COPY: Record<PlaceholderView, Copy> = {
  library: {
    title: 'Game library',
    body: 'Your real collection will live here: imported games, custom artwork and launch settings.',
    items: ['Import executables and scripts', 'Custom names, covers and descriptions', 'Collections and categories'],
  },
  trophies: {
    title: 'Trophies',
    body: 'Bronze to Platinum, with progress tracking and unlock notifications.',
    items: ['Game-specific achievements', 'Trophy collection overview', 'Unlock notifications'],
  },
  settings: {
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
        <h2 className="placeholder__title">{copy.title}</h2>
        <p className="placeholder__body">{copy.body}</p>
        <ul className="placeholder__list">
          {copy.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
