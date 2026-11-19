import { GAMES, continuePlaying, favourites, profile } from '@/data/mockGames'
import type { Game, Profile } from '@/types'

/**
 * The dashboard reads game data only from this module. Phase 3 swaps the
 * imports below for values returned by the main process; the screens and
 * components stay untouched because they never import sample data directly.
 */
export interface LibraryShelf {
  id: string
  title: string
  games: Game[]
}

/** Every game, once each, in dashboard order. */
export const allGames: Game[] = GAMES

/** The game the dashboard opens on, before the user picks a tile. */
export const featuredGame: Game = GAMES[0]

export const shelves: LibraryShelf[] = [
  { id: 'continue', title: 'Continue playing', games: continuePlaying },
  { id: 'favourites', title: 'Favourites', games: favourites },
  { id: 'library', title: 'Your library', games: GAMES },
]

export const libraryProfile: Profile = profile

export const libraryStats = {
  installed: GAMES.filter((game) => game.installed).length,
  favourites: favourites.length,
  total: GAMES.length,
}

export function findGame(id: string): Game | undefined {
  return GAMES.find((game) => game.id === id)
}

/** Two-letter stand-in used when a game has no artwork. */
export function initialsFor(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
