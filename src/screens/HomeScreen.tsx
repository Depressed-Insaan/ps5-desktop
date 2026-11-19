import { useEffect, useRef, useState } from 'react'
import { GameTile } from '@/components/GameTile'
import { Shelf } from '@/components/Shelf'
import { ClockIcon, LibraryIcon, PlayIcon, StorageIcon } from '@/components/Icons'
import { GAMES, continuePlaying, favourites, profile } from '@/data/mockGames'
import type { AppInfo } from '@/types'
import './HomeScreen.css'

interface HomeScreenProps {
  appInfo: AppInfo | null
}

const STORAGE = {
  total: '2 TB',
  free: '0.4 TB',
  parts: [
    { label: 'Games', share: 58, color: 'linear-gradient(90deg, #5aa9ff, #7f8bff)' },
    { label: 'Media', share: 14, color: 'linear-gradient(90deg, #9b8cff, #b58cff)' },
    { label: 'Apps', share: 8, color: 'linear-gradient(90deg, #4fe0c4, #6ce7d0)' },
  ],
}

const SHELVES = [
  {
    title: 'Continue playing',
    subtitle: `${continuePlaying.length} recently played`,
    games: continuePlaying,
  },
  { title: 'Favourites', subtitle: 'Your shelf', games: favourites },
  {
    title: 'Your library',
    subtitle: `${GAMES.length} games · Phase 3 adds importing`,
    games: GAMES,
  },
]

export function HomeScreen({ appInfo }: HomeScreenProps) {
  const [selectedId, setSelectedId] = useState(GAMES[0].id)
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selected = GAMES.find((game) => game.id === selectedId) ?? GAMES[0]

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  function notify(message: string) {
    if (timer.current) clearTimeout(timer.current)
    setToast(message)
    timer.current = setTimeout(() => setToast(null), 3400)
  }

  return (
    <div className="home">
      <div className="ambient" aria-hidden="true">
        {GAMES.map((game) => (
          <div
            key={game.id}
            className={[
              'ambient__layer',
              game.id === selected.id ? 'is-active' : '',
              game.hero ? '' : 'is-blurred',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <img src={game.hero ?? game.cover} alt="" draggable={false} />
          </div>
        ))}
        <div className="ambient__scrim" />
      </div>

      <section className="hero">
        <div className="hero__inner">
          <p className="hero__eyebrow">
            <span className="hero__pulse" aria-hidden="true" />
            {selected.installed ? 'Ready to play' : 'Not installed'} · {selected.genre}
          </p>
          <h2 className="hero__title">{selected.title}</h2>
          <p className="hero__tagline">{selected.tagline}</p>
          <div className="hero__meta">
            <span>
              <ClockIcon size={14} /> {selected.lastPlayed}
            </span>
            <span>{selected.playtime} played</span>
            <span className="hero__accent">{selected.genre}</span>
          </div>
          <div className="hero__actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                notify(`Launching “${selected.title}” arrives with the library in Phase 3.`)
              }
            >
              <PlayIcon size={16} />
              Play
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => notify('Game details arrive with the library in Phase 3.')}
            >
              Game details
            </button>
          </div>
        </div>
      </section>

      <div className="home__content">
        {SHELVES.map((shelf) => (
          <Shelf key={shelf.title} title={shelf.title} subtitle={shelf.subtitle}>
            {shelf.games.map((game) => (
              <GameTile
                key={game.id}
                game={game}
                selected={game.id === selected.id}
                onSelect={setSelectedId}
              />
            ))}
          </Shelf>
        ))}

        <div className="cards">
          <article className="card">
            <div className="card__head">
              <span className="card__icon">
                <LibraryIcon size={16} />
              </span>
              <h3>Library</h3>
              <span className="card__tag">Sample</span>
            </div>
            <div className="card__stats">
              <div>
                <strong>{GAMES.filter((game) => game.installed).length}</strong>
                <span>installed</span>
              </div>
              <div>
                <strong>{favourites.length}</strong>
                <span>favourites</span>
              </div>
              <div>
                <strong>Lv {profile.level}</strong>
                <span>profile</span>
              </div>
            </div>
            <p className="card__note">Real imports, launch paths and playtime arrive in Phase 3.</p>
          </article>

          <article className="card">
            <div className="card__head">
              <span className="card__icon">
                <StorageIcon size={16} />
              </span>
              <h3>Console storage</h3>
              <span className="card__tag">Preview</span>
            </div>
            <div className="storage">
              <div className="storage__bar">
                {STORAGE.parts.map((part) => (
                  <span
                    key={part.label}
                    className="storage__part"
                    style={{ width: `${part.share}%`, background: part.color }}
                  />
                ))}
              </div>
              <div className="storage__legend">
                {STORAGE.parts.map((part) => (
                  <span key={part.label}>
                    <i style={{ background: part.color }} aria-hidden="true" />
                    {part.label}
                  </span>
                ))}
                <span className="storage__free">
                  {STORAGE.free} free of {STORAGE.total}
                </span>
              </div>
            </div>
            <p className="card__note">Static preview — drive scanning is not part of Phase 1.</p>
          </article>

          <article className="card">
            <div className="card__head">
              <span className="card__icon">
                <span className={appInfo ? 'bridge is-live' : 'bridge'} aria-hidden="true" />
              </span>
              <h3>System</h3>
              <span className="card__tag">{appInfo ? 'Connected' : 'Browser preview'}</span>
            </div>
            <dl className="card__rows">
              <div>
                <dt>Platform</dt>
                <dd>{appInfo?.platform ?? 'Windows'}</dd>
              </div>
              <div>
                <dt>Electron</dt>
                <dd>{appInfo?.electron ?? '—'}</dd>
              </div>
              <div>
                <dt>App version</dt>
                <dd>{appInfo?.version ?? '—'}</dd>
              </div>
            </dl>
            <p className="card__note">
              These values are returned by the Electron main process over the preload bridge.
            </p>
          </article>
        </div>

        <p className="home__footnote">
          Phase 1 foundation · artwork and play data are sample content, not your real library.
        </p>
      </div>

      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
