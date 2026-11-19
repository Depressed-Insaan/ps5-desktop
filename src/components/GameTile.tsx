import { useState } from 'react'
import type { CSSProperties } from 'react'
import { PlayIcon } from '@/components/Icons'
import { initialsFor } from '@/data/library'
import type { Game } from '@/types'
import './GameTile.css'

interface GameTileProps {
  game: Game
  selected: boolean
  onSelect: (id: string) => void
}

export function GameTile({ game, selected, onSelect }: GameTileProps) {
  const [artFailed, setArtFailed] = useState(false)

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
        {artFailed ? (
          <span className="tile__fallback" aria-hidden="true">
            {initialsFor(game.title)}
          </span>
        ) : (
          <img
            src={game.cover}
            alt=""
            draggable={false}
            loading="lazy"
            decoding="async"
            onError={() => setArtFailed(true)}
          />
        )}
        <span className="tile__play" aria-hidden="true">
          <PlayIcon size={14} />
        </span>
      </span>
      <span className="tile__meta">
        <span className="tile__title">{game.title}</span>
        <span className="tile__genre">
          {game.genre}
          {game.installed ? '' : ' · Not installed'}
        </span>
      </span>
    </button>
  )
}
