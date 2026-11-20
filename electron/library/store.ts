import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { SEED_GAMES } from './seeds'

/**
 * The library is a single JSON document in the app's data directory. Writes are
 * synchronous and atomic (temporary file + rename) so a crash mid-save cannot
 * leave a half-written collection behind.
 */
export interface StoredGame {
  id: string
  title: string
  tagline: string
  genre: string
  accent: string
  favorite: boolean
  /** Absolute path to the executable or script that starts the game. */
  launcher: string
  launcherArgs: string
  /** Bundled artwork shipped inside the renderer, keyed by game. */
  artworkKey: string | null
  /** File name inside the media directory, for user-supplied artwork. */
  artworkFile: string | null
  playtimeSeconds: number
  lastPlayedAt: number | null
  addedAt: number
}

export type NewGame = Omit<StoredGame, 'id' | 'addedAt'>

export interface GameUpdate {
  title?: string
  tagline?: string
  genre?: string
  accent?: string
  favorite?: boolean
  launcher?: string
  launcherArgs?: string
}

let directory = ''
let libraryFile = ''
let games: StoredGame[] | null = null

export function initStore(appDataDirectory: string) {
  directory = appDataDirectory
  libraryFile = path.join(appDataDirectory, 'library.json')
  games = null
}

export function mediaDirectory(): string {
  return path.join(directory, 'media')
}

function createSeeds(): StoredGame[] {
  const now = Date.now()

  return SEED_GAMES.map((seed) => ({
    id: seed.id,
    title: seed.title,
    tagline: seed.tagline,
    genre: seed.genre,
    accent: seed.accent,
    favorite: seed.favorite,
    launcher: '',
    launcherArgs: '',
    artworkKey: seed.artworkKey,
    artworkFile: null,
    playtimeSeconds: Math.round(seed.playtimeHours * 3600),
    lastPlayedAt: now - Math.round(seed.playedAgoHours * 3600_000),
    addedAt: now,
  }))
}

function writeLibrary(next: StoredGame[]) {
  games = next
  if (!libraryFile) return

  mkdirSync(path.dirname(libraryFile), { recursive: true })
  const temporary = `${libraryFile}.tmp`
  writeFileSync(temporary, JSON.stringify({ version: 1, games: next }, null, 2), 'utf8')
  renameSync(temporary, libraryFile)
}

function normalise(raw: unknown): StoredGame | null {
  if (!raw || typeof raw !== 'object') return null
  const input = raw as Record<string, unknown>
  if (typeof input.id !== 'string' || typeof input.title !== 'string') return null

  return {
    id: input.id,
    title: input.title,
    tagline: typeof input.tagline === 'string' ? input.tagline : '',
    genre: typeof input.genre === 'string' ? input.genre : '',
    accent: typeof input.accent === 'string' ? input.accent : '#5aa9ff',
    favorite: input.favorite === true,
    launcher: typeof input.launcher === 'string' ? input.launcher : '',
    launcherArgs: typeof input.launcherArgs === 'string' ? input.launcherArgs : '',
    artworkKey: typeof input.artworkKey === 'string' ? input.artworkKey : null,
    artworkFile: typeof input.artworkFile === 'string' ? input.artworkFile : null,
    playtimeSeconds:
      typeof input.playtimeSeconds === 'number' && input.playtimeSeconds > 0
        ? input.playtimeSeconds
        : 0,
    lastPlayedAt: typeof input.lastPlayedAt === 'number' ? input.lastPlayedAt : null,
    addedAt: typeof input.addedAt === 'number' ? input.addedAt : Date.now(),
  }
}

function readLibrary(): StoredGame[] {
  if (games) return games
  if (!libraryFile) throw new Error('The library store has not been initialised.')

  try {
    const parsed = JSON.parse(readFileSync(libraryFile, 'utf8')) as { games?: unknown }
    if (Array.isArray(parsed.games)) {
      games = parsed.games
        .map(normalise)
        .filter((game): game is StoredGame => game !== null)
      return games
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('[library] Saved library unreadable; keeping a backup and starting again.', error)
      try {
        renameSync(libraryFile, `${libraryFile}.bak`)
      } catch {
        // Nothing to back up.
      }
    }
  }

  const seeded = createSeeds()
  writeLibrary(seeded)
  return seeded
}

export function listGames(): StoredGame[] {
  return readLibrary()
}

export function getGame(id: string): StoredGame | undefined {
  return readLibrary().find((game) => game.id === id)
}

export function addGames(entries: NewGame[]): StoredGame[] {
  if (entries.length === 0) return []
  const added = entries.map((entry) => ({ ...entry, id: randomUUID(), addedAt: Date.now() }))
  writeLibrary([...readLibrary(), ...added])
  return added
}

export function updateGame(id: string, update: GameUpdate): StoredGame | undefined {
  const current = readLibrary()
  const game = current.find((entry) => entry.id === id)
  if (!game) return undefined

  if (update.title !== undefined && update.title.trim()) game.title = update.title.trim()
  if (update.tagline !== undefined) game.tagline = update.tagline.trim()
  if (update.genre !== undefined) game.genre = update.genre.trim()
  if (update.accent !== undefined) game.accent = update.accent
  if (update.favorite !== undefined) game.favorite = update.favorite
  if (update.launcher !== undefined) game.launcher = update.launcher.trim()
  if (update.launcherArgs !== undefined) game.launcherArgs = update.launcherArgs.trim()

  writeLibrary(current)
  return game
}

export function setArtwork(id: string, artworkFile: string | null): StoredGame | undefined {
  const current = readLibrary()
  const game = current.find((entry) => entry.id === id)
  if (!game) return undefined

  game.artworkFile = artworkFile
  // User artwork replaces the bundled sample art, and clearing it leaves none.
  game.artworkKey = null
  writeLibrary(current)
  return game
}

export function removeGame(id: string): StoredGame | undefined {
  const current = readLibrary()
  const game = current.find((entry) => entry.id === id)
  if (!game) return undefined

  writeLibrary(current.filter((entry) => entry.id !== id))
  return game
}

export function addPlaytime(id: string, seconds: number, endedAt: number) {
  const current = readLibrary()
  const game = current.find((entry) => entry.id === id)
  if (!game) return

  game.playtimeSeconds += Math.max(0, Math.round(seconds))
  game.lastPlayedAt = endedAt
  writeLibrary(current)
}
