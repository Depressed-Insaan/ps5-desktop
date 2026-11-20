/**
 * Shared contracts between the React renderer and the Electron preload bridge.
 * Keep this file free of runtime code: both sides import types from here.
 */

export type ViewId = 'home' | 'library' | 'trophies' | 'settings'

export type TrophyTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface Trophy {
  id: string
  gameId: string
  title: string
  description: string
  tier: TrophyTier
  /** Progress needed before the trophy can be unlocked; at least 1. */
  target: number
  progress: number
  unlockedAt: number | null
  createdAt: number
}

export interface NewTrophy {
  gameId: string
  title: string
  description: string
  tier: TrophyTier
  target: number
  progress?: number
}

export interface TrophyPatch {
  title?: string
  description?: string
  tier?: TrophyTier
  target?: number
  progress?: number
  unlockedAt?: number | null
}

export type ThemeId = 'midnight' | 'aurora' | 'ember'

export interface Settings {
  accent: string
  theme: ThemeId
  startView: 'home' | 'library'
  fullscreen: boolean
  notifyTrophies: boolean
  notifySessions: boolean
}

export type SettingsPatch = Partial<Settings>

export interface Profile {
  name: string
  initials: string
  level: number
}

export interface ProfilePatch {
  name?: string
  initials?: string
}

/** Disk space for the drive that holds the user's files. */
export interface StorageInfo {
  available: boolean
  /** Root of the drive, e.g. `C:\`. */
  drive: string
  totalBytes: number
  usedBytes: number
  freeBytes: number
}

export interface Game {
  id: string
  title: string
  tagline: string
  genre: string
  /** Accent colour used for glows and the selected outline. */
  accent: string
  favorite: boolean
  /** Bundled sample artwork key, resolved by the renderer. */
  artworkKey: string | null
  /** User artwork served by the app-media protocol. */
  artworkUrl: string | null
  /** Absolute path to the file that starts the game; empty until chosen. */
  launcher: string
  launcherArgs: string
  /** True when the launch target exists on disk right now. */
  installed: boolean
  playtimeMinutes: number
  lastPlayedAt: number | null
}

export interface GamePatch {
  title?: string
  tagline?: string
  genre?: string
  accent?: string
  favorite?: boolean
  launcher?: string
  launcherArgs?: string
}

/** Everything the main process owns, pushed to the renderer on every change. */
export interface AppSnapshot {
  games: Game[]
  runningIds: string[]
  trophies: Trophy[]
  settings: Settings
  profile: Profile
}

export interface ImportResult {
  added: number
  skipped: number
  canceled: boolean
}

export interface LaunchResult {
  ok: boolean
  error?: string
}

/** Facts about the running desktop app, provided by the main process. */
export interface AppInfo {
  version: string
  electron: string
  chrome: string
  platform: string
}

/** The complete surface the renderer may call. Nothing else is exposed. */
export interface Api {
  getAppInfo(): Promise<AppInfo>
  getState(): Promise<AppSnapshot>
  getStorageInfo(): Promise<StorageInfo>
  importGames(): Promise<ImportResult>
  pickExecutable(): Promise<string | null>
  updateGame(id: string, patch: GamePatch): Promise<AppSnapshot>
  removeGame(id: string): Promise<AppSnapshot>
  chooseArtwork(id: string): Promise<AppSnapshot | null>
  clearArtwork(id: string): Promise<AppSnapshot>
  launchGame(id: string): Promise<LaunchResult>
  revealGame(id: string): Promise<void>
  updateSettings(patch: SettingsPatch): Promise<AppSnapshot>
  updateProfile(patch: ProfilePatch): Promise<AppSnapshot>
  addTrophy(input: NewTrophy): Promise<AppSnapshot>
  updateTrophy(id: string, patch: TrophyPatch): Promise<AppSnapshot>
  unlockTrophy(id: string): Promise<AppSnapshot>
  removeTrophy(id: string): Promise<AppSnapshot>
  /** Fires whenever the main process changes the library or its settings. */
  onStateChanged(listener: (snapshot: AppSnapshot) => void): () => void
}
