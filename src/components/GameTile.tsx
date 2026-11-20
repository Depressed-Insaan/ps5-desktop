import { useState } from 'react'
import type { CSSProperties } from 'react'
import { PlayIcon } from '@/components/Icons'
import { artworkFor } from '@/data/artwork'
import { initialsFor } from '@/data/library'
import type { Game } from '@/types'
import './GameTile.css'

interface GameTileProps {
  game: Game
  selected: boolean
  running: boolean
  onSelect: (id: string) => void
}

export function GameTile({ game, selected, running, onSelect }: GameTileProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const art = artworkFor(game)
  const hasArt = Boolean(art.cover) && failedSrc !== art.cover

  return (
    <button
      type="button"
      data-nav-item
      className={`tile${selected ? ' is-selected' : ''}`}
      style={{ '--tile-accent': game.accent } as CSSProperties}
      aria-pressed={selected}
      onClick={() => onSelect(game.id)}
    >
      <span className="tile__art">
        {hasArt ? (
          <img
            src={art.cover ?? ''}
            alt=""
            draggable={false}
            loading="lazy"
            decoding="async"
            onError={() => setFailedSrc(art.cover)}
          />
        ) : (
          <span className="tile__fallback" aria-hidden="true">
            {initialsFor(game.title)}
          </span>
        )}
        {running ? (
          <span className="tile__live">Playing</span>
        ) : (
          <span className="tile__play" aria-hidden="true">
            <PlayIcon size={14} />
          </span>
        )}
      </span>
      <span className="tile__meta">
        <span className="tile__title">{game.title}</span>
        <span className="tile__genre">
          {game.genre || 'Game'}
          {game.launcher && !game.installed ? ' · Not installed' : ''}
        </span>
      </span>
    </button>
  )
}
