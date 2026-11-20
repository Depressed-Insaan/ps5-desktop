import { useState } from 'react'
import type { CSSProperties } from 'react'
import { FolderIcon, PencilIcon, PlayIcon, PlusIcon, TrashIcon } from '@/components/Icons'
import type { AppController } from '@/hooks/useAppState'
import { artworkFor } from '@/data/artwork'
import { formatLastPlayed, formatPlaytime, initialsFor } from '@/data/library'
import type { Game } from '@/types'
import './LibraryScreen.css'

interface LibraryScreenProps {
  app: AppController
  notify: (message: string) => void
  onEdit: (id: string) => void
}

interface GameCardProps {
  game: Game
  running: boolean
  onPlay: () => void
  onEdit: () => void
  onReveal: () => void
  onRemove: () => void
}

function GameCard({ game, running, onPlay, onEdit, onReveal, onRemove }: GameCardProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const art = artworkFor(game)
  const hasArt = Boolean(art.cover) && failedSrc !== art.cover

  return (
    <article
      className={`game-card${running ? ' is-running' : ''}`}
      style={{ '--card-accent': game.accent } as CSSProperties}
    >
      <div className="game-card__art">
        {hasArt ? (
          <img
            src={art.cover ?? ''}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => setFailedSrc(art.cover)}
          />
        ) : (
          <span className="game-card__fallback" aria-hidden="true">
            {initialsFor(game.title)}
          </span>
        )}

        {running ? (
          <span className="game-card__live">
            <i aria-hidden="true" />
            Playing
          </span>
        ) : null}

        <button
          type="button"
          className="game-card__play"
          onClick={onPlay}
          aria-label={game.launcher ? `Play ${game.title}` : `Set up ${game.title}`}
        >
          <PlayIcon size={15} />
          {game.launcher ? 'Play' : 'Set up'}
        </button>
      </div>

      <div className="game-card__body">
        <h3 className="game-card__title" title={game.title}>
          {game.title}
        </h3>
        <p className="game-card__meta">
          <span>{game.genre || 'Game'}</span>
          <span>{formatPlaytime(game.playtimeMinutes) || 'Not played'}</span>
        </p>
        <p className="game-card__when">{formatLastPlayed(game.lastPlayedAt)}</p>

        <div className="game-card__actions">
          {confirming ? (
            <>
              <span className="game-card__confirm">Remove this game?</span>
              <button
                type="button"
                className="game-card__action is-danger"
                onClick={onRemove}
              >
                Remove
              </button>
              <button
                type="button"
                className="game-card__action"
                onClick={() => setConfirming(false)}
              >
                Keep
              </button>
            </>
          ) : (
            <>
              <button type="button" className="game-card__action" onClick={onEdit}>
                <PencilIcon size={14} />
                Edit
              </button>
              <button
                type="button"
                className="game-card__action is-icon"
                onClick={onReveal}
                disabled={!game.launcher}
                aria-label={`Show ${game.title} in its folder`}
                title="Show in folder"
              >
                <FolderIcon size={15} />
              </button>
              <button
                type="button"
                className="game-card__action is-icon"
                onClick={() => setConfirming(true)}
                aria-label={`Remove ${game.title}`}
                title="Remove"
              >
                <TrashIcon size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}

export function LibraryScreen({ app, notify, onEdit }: LibraryScreenProps) {
  const { games, runningIds } = app
  const installed = games.filter((game) => game.installed).length

  async function importGames() {
    const result = await app.importGames()
    if (result.canceled) return
    if (result.added === 0) {
      notify('Those games are already in your library.')
      return
    }

    const skipped =
      result.skipped > 0 ? ` ${result.skipped} were already here.` : ''
    notify(
      result.added === 1
        ? `Added 1 game to your library.${skipped}`
        : `Added ${result.added} games to your library.${skipped}`,
    )
  }

  async function play(game: Game) {
    if (!game.launcher) {
      onEdit(game.id)
      return
    }
    const result = await app.launchGame(game.id)
    if (!result.ok) notify(result.error ?? 'This game could not be started.')
  }

  async function reveal(game: Game) {
    if (!game.launcher) {
      notify('Choose a launch target for this game first.')
      return
    }
    await app.revealGame(game.id)
  }

  return (
    <section className="library">
      <header className="library__head">
        <div className="library__intro">
          <h2 className="library__title">Game library</h2>
          <p className="library__count">
            {games.length === 0
              ? 'No games yet'
              : `${installed} installed · ${games.length} in your collection`}
          </p>
        </div>

        {games.length > 0 ? (
          <button
            type="button"
            className="btn-primary btn-primary--compact"
            onClick={importGames}
            disabled={!app.bridge}
          >
            <PlusIcon size={16} />
            Import games
          </button>
        ) : null}
      </header>

      {games.length === 0 ? (
        <div className="library__empty">
          <h3>Nothing here yet</h3>
          <p>Import a game from this PC and it will appear in your collection.</p>
          <button
            type="button"
            className="btn-primary"
            onClick={importGames}
            disabled={!app.bridge}
          >
            <PlusIcon size={16} />
            Import games
          </button>
          {app.bridge ? null : (
            <p className="library__hint">Importing works in the desktop app.</p>
          )}
        </div>
      ) : (
        <div className="library__grid">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              running={runningIds.includes(game.id)}
              onPlay={() => play(game)}
              onEdit={() => onEdit(game.id)}
              onReveal={() => reveal(game)}
              onRemove={async () => {
                await app.removeGame(game.id)
                notify(`${game.title} was removed from your library.`)
              }}
            />
          ))}
        </div>
      )}
    </section>
  )
}
