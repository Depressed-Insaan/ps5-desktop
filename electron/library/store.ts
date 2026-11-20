import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type {
  NewTrophy,
  Profile,
  ProfilePatch,
  Settings,
  SettingsPatch,
  Trophy,
  TrophyPatch,
  TrophyTier,
} from '../../src/types'
import { SEED_GAMES, SEED_TROPHIES } from './seeds'

/**
 * Everything the app owns is kept in a single JSON document in the app's data
 * directory. Writes are synchronous and atomic (temporary file + rename) so a
 * crash mid-save cannot leave a half-written collection behind.
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

interface AppDocument {
  version: number
  games: StoredGame[]
  trophies: Trophy[]
  settings: Settings
  profile: Profile
}

const TIERS: TrophyTier[] = ['bronze', 'silver', 'gold', 'platinum']

export const DEFAULT_SETTINGS: Settings = {
  accent: '#5aa9ff',
  theme: 'midnight',
  startView: 'home',
  fullscreen: false,
  notifyTrophies: true,
  notifySessions: true,
}

export const DEFAULT_PROFILE: Profile = {
  name: 'Aarav Patel',
  initials: 'AP',
  level: 24,
}

const DAY = 86_400_000

let directory = ''
let libraryFile = ''
let document: AppDocument | null = null

export function initStore(appDataDirectory: string) {
  directory = appDataDirectory
  libraryFile = path.join(appDataDirectory, 'library.json')
  document = null
}

export function mediaDirectory(): string {
  return path.join(directory, 'media')
}

function initialsFrom(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return letters || DEFAULT_PROFILE.initials
}

function createSeeds(now: number): StoredGame[] {
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

function createSeedTrophies(now: number): Trophy[] {
  return SEED_TROPHIES.map((seed) => ({
    id: seed.id,
    gameId: seed.gameId,
    title: seed.title,
    description: seed.description,
    tier: seed.tier,
    target: seed.target,
    progress: seed.progress,
    unlockedAt:
      seed.unlockedDaysAgo === null ? null : now - Math.round(seed.unlockedDaysAgo * DAY),
    createdAt: now - 45 * DAY,
  }))
}

function createDocument(): AppDocument {
  const now = Date.now()
  return {
    version: 2,
    games: createSeeds(now),
    trophies: createSeedTrophies(now),
    settings: { ...DEFAULT_SETTINGS },
    profile: { ...DEFAULT_PROFILE },
  }
}

function writeDocument(next: AppDocument) {
  document = next
  if (!libraryFile) return

  mkdirSync(path.dirname(libraryFile), { recursive: true })
  const temporary = `${libraryFile}.tmp`
  writeFileSync(temporary, JSON.stringify(next, null, 2), 'utf8')
  renameSync(temporary, libraryFile)
}

function normaliseGame(raw: unknown): StoredGame | null {
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

function normaliseTrophy(raw: unknown): Trophy | null {
  if (!raw || typeof raw !== 'object') return null
  const input = raw as Record<string, unknown>
  if (typeof input.id !== 'string' || typeof input.gameId !== 'string') return null
  if (typeof input.title !== 'string' || !TIERS.includes(input.tier as TrophyTier)) return null

  const target = typeof input.target === 'number' ? Math.round(input.target) : 1

  return {
    id: input.id,
    gameId: input.gameId,
    title: input.title,
    description: typeof input.description === 'string' ? input.description : '',
    tier: input.tier as TrophyTier,
    target: Math.max(1, target),
    progress: typeof input.progress === 'number' ? Math.max(0, Math.round(input.progress)) : 0,
    unlockedAt: typeof input.unlockedAt === 'number' ? input.unlockedAt : null,
    createdAt: typeof input.createdAt === 'number' ? input.createdAt : Date.now(),
  }
}

function normaliseSettings(raw: unknown): Settings {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  return {
    accent:
      typeof input.accent === 'string' && /^#[0-9a-f]{6}$/i.test(input.accent)
        ? input.accent
        : DEFAULT_SETTINGS.accent,
    theme:
      input.theme === 'aurora' || input.theme === 'ember' || input.theme === 'midnight'
        ? input.theme
        : DEFAULT_SETTINGS.theme,
    startView: input.startView === 'library' ? 'library' : 'home',
    fullscreen: input.fullscreen === true,
    notifyTrophies: input.notifyTrophies !== false,
    notifySessions: input.notifySessions !== false,
  }
}

function normaliseProfile(raw: unknown): Profile {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : DEFAULT_PROFILE.name
  const initials =
    typeof input.initials === 'string' && /^[A-Za-z]{1,2}$/.test(input.initials.trim())
      ? input.initials.trim().toUpperCase()
      : initialsFrom(name)

  return {
    name,
    initials,
    level:
      typeof input.level === 'number' && input.level > 0
        ? Math.round(input.level)
        : DEFAULT_PROFILE.level,
  }
}

function readDocument(): AppDocument {
  if (document) return document
  if (!libraryFile) throw new Error('The library store has not been initialised.')

  try {
    const parsed = JSON.parse(readFileSync(libraryFile, 'utf8')) as Record<string, unknown>
    if (Array.isArray(parsed.games)) {
      const games = parsed.games
        .map(normaliseGame)
        .filter((game): game is StoredGame => game !== null)
      const knownGames = new Set(games.map((game) => game.id))

      // Phase 3 documents only carry games; they get empty trophies and the
      // default settings rather than inheriting the sample set.
      const trophies = Array.isArray(parsed.trophies)
        ? parsed.trophies
            .map(normaliseTrophy)
            .filter((trophy): trophy is Trophy => trophy !== null && knownGames.has(trophy.gameId))
        : []

      const migrated: AppDocument = {
        version: 2,
        games,
        trophies,
        settings: normaliseSettings(parsed.settings),
        profile: normaliseProfile(parsed.profile),
      }

      if (!Array.isArray(parsed.trophies) || !parsed.settings || !parsed.profile) {
        writeDocument(migrated)
      } else {
        document = migrated
      }

      return migrated
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

  const seeded = createDocument()
  writeDocument(seeded)
  return seeded
}

/* ---------- Games ---------- */

export function listGames(): StoredGame[] {
  return readDocument().games
}

export function getGame(id: string): StoredGame | undefined {
  return readDocument().games.find((game) => game.id === id)
}

export function addGames(entries: NewGame[]): StoredGame[] {
  if (entries.length === 0) return []

  const current = readDocument()
  const added = entries.map((entry) => ({ ...entry, id: randomUUID(), addedAt: Date.now() }))
  writeDocument({ ...current, games: [...current.games, ...added] })
  return added
}

export function updateGame(id: string, update: GameUpdate): StoredGame | undefined {
  const current = readDocument()
  const game = current.games.find((entry) => entry.id === id)
  if (!game) return undefined

  if (update.title !== undefined && update.title.trim()) game.title = update.title.trim()
  if (update.tagline !== undefined) game.tagline = update.tagline.trim()
  if (update.genre !== undefined) game.genre = update.genre.trim()
  if (update.accent !== undefined) game.accent = update.accent
  if (update.favorite !== undefined) game.favorite = update.favorite
  if (update.launcher !== undefined) game.launcher = update.launcher.trim()
  if (update.launcherArgs !== undefined) game.launcherArgs = update.launcherArgs.trim()

  writeDocument(current)
  return game
}

export function setArtwork(id: string, artworkFile: string | null): StoredGame | undefined {
  const current = readDocument()
  const game = current.games.find((entry) => entry.id === id)
  if (!game) return undefined

  game.artworkFile = artworkFile
  // User artwork replaces the bundled sample art, and clearing it leaves none.
  game.artworkKey = null
  writeDocument(current)
  return game
}

export function removeGame(id: string): StoredGame | undefined {
  const current = readDocument()
  const game = current.games.find((entry) => entry.id === id)
  if (!game) return undefined

  writeDocument({
    ...current,
    games: current.games.filter((entry) => entry.id !== id),
    trophies: current.trophies.filter((trophy) => trophy.gameId !== id),
  })
  return game
}

export function addPlaytime(id: string, seconds: number, endedAt: number) {
  const current = readDocument()
  const game = current.games.find((entry) => entry.id === id)
  if (!game) return

  game.playtimeSeconds += Math.max(0, Math.round(seconds))
  game.lastPlayedAt = endedAt
  writeDocument(current)
}

/* ---------- Trophies ---------- */

export function listTrophies(): Trophy[] {
  return readDocument().trophies
}

export function getTrophy(id: string): Trophy | undefined {
  return readDocument().trophies.find((trophy) => trophy.id === id)
}

export function addTrophy(input: NewTrophy): Trophy {
  const current = readDocument()
  const target = Math.max(1, Math.round(input.target))
  const progress = Math.max(0, Math.round(input.progress ?? 0))
  const now = Date.now()

  const trophy: Trophy = {
    id: randomUUID(),
    gameId: input.gameId,
    title: input.title.trim(),
    description: input.description.trim(),
    tier: input.tier,
    target,
    progress: Math.min(progress, target),
    unlockedAt: progress >= target ? now : null,
    createdAt: now,
  }

  writeDocument({ ...current, trophies: [...current.trophies, trophy] })
  return trophy
}

export function updateTrophy(id: string, patch: TrophyPatch): Trophy | undefined {
  const current = readDocument()
  const trophy = current.trophies.find((entry) => entry.id === id)
  if (!trophy) return undefined

  if (patch.title !== undefined && patch.title.trim()) trophy.title = patch.title.trim()
  if (patch.description !== undefined) trophy.description = patch.description.trim()
  if (patch.tier !== undefined && TIERS.includes(patch.tier)) trophy.tier = patch.tier
  if (patch.target !== undefined) trophy.target = Math.max(1, Math.round(patch.target))
  if (patch.progress !== undefined) {
    trophy.progress = Math.max(0, Math.round(patch.progress))
  }
  if (patch.unlockedAt !== undefined) trophy.unlockedAt = patch.unlockedAt

  trophy.progress = Math.min(trophy.progress, trophy.target)

  // Reaching the target unlocks the trophy; unlocking by hand stays unlocked.
  if (trophy.unlockedAt === null && trophy.progress >= trophy.target) {
    trophy.unlockedAt = Date.now()
  }

  writeDocument(current)
  return trophy
}

export function removeTrophy(id: string): Trophy | undefined {
  const current = readDocument()
  const trophy = current.trophies.find((entry) => entry.id === id)
  if (!trophy) return undefined

  writeDocument({
    ...current,
    trophies: current.trophies.filter((entry) => entry.id !== id),
  })
  return trophy
}

/* ---------- Settings and profile ---------- */

export function getSettings(): Settings {
  return readDocument().settings
}

export function updateSettings(patch: SettingsPatch): Settings {
  const current = readDocument()
  const settings: Settings = { ...current.settings }

  // Each field is validated on its own, so one bad value can never reset the
  // rest of the saved preferences.
  if (typeof patch.accent === 'string' && /^#[0-9a-f]{6}$/i.test(patch.accent)) {
    settings.accent = patch.accent
  }
  if (patch.theme === 'midnight' || patch.theme === 'aurora' || patch.theme === 'ember') {
    settings.theme = patch.theme
  }
  if (patch.startView === 'home' || patch.startView === 'library') {
    settings.startView = patch.startView
  }
  if (typeof patch.fullscreen === 'boolean') settings.fullscreen = patch.fullscreen
  if (typeof patch.notifyTrophies === 'boolean') settings.notifyTrophies = patch.notifyTrophies
  if (typeof patch.notifySessions === 'boolean') settings.notifySessions = patch.notifySessions

  writeDocument({ ...current, settings })
  return settings
}

export function getProfile(): Profile {
  return readDocument().profile
}

export function updateProfile(patch: ProfilePatch): Profile {
  const current = readDocument()
  const profile: Profile = { ...current.profile }

  if (typeof patch.name === 'string' && patch.name.trim()) profile.name = patch.name.trim()
  if (typeof patch.initials === 'string') {
    const initials = patch.initials.trim().toUpperCase()
    // An empty or unusable value falls back to the initials of the name.
    profile.initials = /^[A-Z]{1,2}$/.test(initials) ? initials : initialsFrom(profile.name)
  }

  writeDocument({ ...current, profile })
  return profile
}
