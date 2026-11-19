import type { CSSProperties } from 'react'
import { PlayIcon } from '@/components/Icons'
import type { Game } from '@/types'
import './GameTile.css'

interface GameTileProps {
  game: Game
  selected: boolean
  onSelect: (id: string) => void
}

export function GameTile({ game, selected, onSelect }: GameTileProps) {
  return (
    <button
      type="button"
      className={`tile${selected ? ' is-selected' : ''}`}
      style={{ '--tile-accent': game.accent } as CSSProperties}
      aria-pressed={selected}
      onClick={() => onSelect(game.id)}
    >
      <span className="tile__art">
        <img src={game.cover} alt="" draggable={false} />
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
