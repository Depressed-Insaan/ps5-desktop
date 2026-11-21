import { useState } from 'react'
import type { CSSProperties } from 'react'
import { GameTile } from '@/components/GameTile'
import { Shelf } from '@/components/Shelf'
import { ClockIcon, LibraryIcon, PlayIcon, PlusIcon, StorageIcon } from '@/components/Icons'
import { useDashboardNav } from '@/hooks/useDashboardNav'
import type { AppController } from '@/hooks/useAppState'
import { artworkFor } from '@/data/artwork'
import { formatLastPlayed, formatPlaytime } from '@/data/library'
import { formatBytes, usedShare } from '@/data/storage'
import type { AppInfo, Game, StorageInfo } from '@/types'
import './HomeScreen.css'

interface HomeScreenProps {
  app: AppController
  appInfo: AppInfo | null
  storage: StorageInfo | null
  notify: (message: string) => void
  onEdit: (id: string) => void
  onImport: () => void
}

export function HomeScreen({
  app,
  appInfo,
  storage,
  notify,
  onEdit,
  onImport,
}: HomeScreenProps) {
  const { games, runningIds, profile } = app
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const onGridKeyDown = useDashboardNav()

  const selected = games.find((game) => game.id === selectedId) ?? games[0] ?? null
  const selectedArt = selected ? artworkFor(selected) : null
  const running = selected ? runningIds.includes(selected.id) : false

  const shelves = [
    {
      id: 'continue',
      title: 'Continue playing',
      games: games
        .filter((game) => game.lastPlayedAt)
        .sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0))
        .slice(0, 8),
    },
    { id: 'favourites', title: 'Favourites', games: games.filter((game) => game.favorite) },
    { id: 'library', title: 'Your library', games },
  ].filter((shelf) => shelf.games.length > 0)

  // Backdrops are kept mounted for instant crossfades, so only a slice of art
  // is layered when the library gets large.
  const artGames = games.filter((game) => artworkFor(game).hero).slice(0, 12)
  const selectedNeedsLayer =
    selected !== null &&
    Boolean(selectedArt?.hero) &&
    !artGames.some((game) => game.id === selected.id)

  async function play(game: Game) {
    if (!game.launch.entry) {
      onEdit(game.id)
      return
    }
    const result = await app.launchGame(game.id)
    if (!result.ok) notify(result.error ?? 'This game could not be started.')
  }

  async function stop(game: Game) {
    await app.stopGame(game.id)
  }

  const usedPercent = storage?.available
    ? usedShare(storage.usedBytes, storage.totalBytes)
    : 0

  const statusCards = (
    <div className="cards">
      <article className="card">
        <div className="card__head">
          <span className="card__icon">
            <LibraryIcon size={16} />
          </span>
          <h3>Library</h3>
        </div>
        <div className="card__stats">
          <div>
            <strong>{games.filter((game) => game.installed).length}</strong>
            <span>installed</span>
          </div>
          <div>
            <strong>{games.filter((game) => game.favorite).length}</strong>
            <span>favourites</span>
          </div>
          <div>
            <strong>Lv {profile.level}</strong>
            <span>profile</span>
          </div>
        </div>
      </article>

      <article className="card">
        <div className="card__head">
          <span className="card__icon">
            <StorageIcon size={16} />
          </span>
          <h3>Console storage</h3>
        </div>

        {storage?.available ? (
          <div className="storage">
            <div className="storage__bar">
              <span
                className="storage__part storage__part--used"
                style={{ width: `${usedPercent}%` }}
              />
            </div>
            <div className="storage__legend">
              <span>
                <i className="storage__dot storage__dot--used" aria-hidden="true" />
                Used {formatBytes(storage.usedBytes)}
              </span>
              <span>
                <i className="storage__dot" aria-hidden="true" />
                Free
              </span>
              <span className="storage__free">
                {formatBytes(storage.freeBytes)} free of {formatBytes(storage.totalBytes)}
              </span>
            </div>
            <p className="storage__drive">Drive {storage.drive.replace(/\\$/, '')}</p>
          </div>
        ) : storage ? (
          <p className="storage__unavailable">Storage information is unavailable right now.</p>
        ) : (
          <p className="storage__unavailable">Reading drive information…</p>
        )}
      </article>

      <article className="card">
        <div className="card__head">
          <span className="card__icon">
            <span className={appInfo ? 'bridge is-live' : 'bridge'} aria-hidden="true" />
          </span>
          <h3>System</h3>
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
      </article>
    </div>
  )

  if (!selected) {
    return (
      <div className="home">
        <div className="ambient" aria-hidden="true">
          <div className="ambient__scrim" />
        </div>

        <section className="home__empty">
          <div className="home__emptyPanel">
            {app.loading ? (
              <p className="home__emptyBody">Loading your library…</p>
            ) : (
              <>
                <h2 className="home__emptyTitle">Your library is empty</h2>
                <p className="home__emptyBody">
                  Import the games installed on this PC and they will show up here, ready to
                  launch.
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onImport}
                  disabled={!app.bridge}
                >
                  <PlusIcon size={16} />
                  Import games
                </button>
                {app.bridge ? null : (
                  <p className="home__emptyHint">Importing works in the desktop app.</p>
                )}
              </>
            )}
          </div>
        </section>

        <div className="home__content">{statusCards}</div>
      </div>
    )
  }

  return (
    <div className="home">
      <div className="ambient" aria-hidden="true">
        <div
          className="ambient__glow"
          style={{ '--glow': selected.accent } as CSSProperties}
        />
        {artGames.map((game) => {
          const art = artworkFor(game)
          if (!art.hero) return null
          return (
            <div
              key={game.id}
              className={[
                'ambient__layer',
                game.id === selected.id ? 'is-active' : '',
                art.soft ? 'is-soft' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <img src={art.hero} alt="" draggable={false} />
            </div>
          )
        })}
        {selectedNeedsLayer && selectedArt?.hero ? (
          <div
            className={`ambient__layer is-active${selectedArt.soft ? ' is-soft' : ''}`}
          >
            <img src={selectedArt.hero} alt="" draggable={false} />
          </div>
        ) : null}
        <div className="ambient__scrim" />
      </div>

      <section className="hero">
        <div className="hero__inner">
          <p className="hero__eyebrow">
            <span
              className={`hero__pulse${running ? ' is-live' : ''}`}
              aria-hidden="true"
            />
            {selected.installed
              ? 'Ready to play'
              : selected.launch.entry
                ? 'Not installed'
                : 'Not set up'}
            {selected.genre ? <span className="hero__separator">·</span> : null}
            {selected.genre}
          </p>
          <h2 className="hero__title">{selected.title}</h2>
          {selected.tagline ? <p className="hero__tagline">{selected.tagline}</p> : null}
          <div className="hero__meta">
            {selected.lastPlayedAt ? (
              <span>
                <ClockIcon size={14} /> {formatLastPlayed(selected.lastPlayedAt)}
              </span>
            ) : null}
            {selected.playtimeMinutes > 0 ? (
              <span>{formatPlaytime(selected.playtimeMinutes)} played</span>
            ) : null}
            {selected.genre ? <span className="hero__accent">{selected.genre}</span> : null}
          </div>
          <div className="hero__actions">
            {running ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => void stop(selected)}
              >
                Stop
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={() => play(selected)}>
                <PlayIcon size={16} />
                {selected.launch.entry ? 'Play' : 'Set up'}
              </button>
            )}
            <button type="button" className="btn-ghost" onClick={() => onEdit(selected.id)}>
              Edit
            </button>
          </div>
        </div>
      </section>

      <div className="home__content" onKeyDown={onGridKeyDown}>
        {shelves.map((shelf) => (
          <Shelf
            key={shelf.id}
            title={shelf.title}
            count={shelf.games.length}
            emptyMessage="No games here yet."
          >
            {shelf.games.map((game) => (
              <GameTile
                key={game.id}
                game={game}
                selected={game.id === selected.id}
                running={runningIds.includes(game.id)}
                onSelect={setSelectedId}
              />
            ))}
          </Shelf>
        ))}

        {statusCards}
      </div>
    </div>
  )
}
